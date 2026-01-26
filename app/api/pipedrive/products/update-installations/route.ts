import { NextRequest, NextResponse } from "next/server";
import { updateProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/update-installations
 * Update installation products to remove ES- prefix from codes
 */
export async function POST(request: NextRequest) {
  try {
    // Product IDs from the creation (we'll update these)
    const productUpdates = [
      { id: 17980, sku: "INSFPT", name: "Instalaciones fuera de PT (SIN IVA) | INSFPT" },
      { id: 17981, sku: "MONSES", name: "Montaje de Sauna España | MONSES" },
      { id: 17982, sku: "MONSIS", name: "Montaje de Sauna Islas | MONSIS" },
      { id: 17983, sku: "INSBHL", name: "Instalación de Bañera de Hidromasaje de Leña | INSBHL" },
      { id: 17984, sku: "INSELE", name: "Instalación Eléctrica (solo conexiones) | INSELE" },
      { id: 17985, sku: "INSEIC", name: "Instalación Eléctrica (instalación completa) | INSEIC" },
      { id: 17986, sku: "TRAMAD", name: "Tratamiento de Madera | TRAMAD" },
    ];

    const results = [];
    const errors = [];

    // Update products: product code = "ES", SKU goes to SKU field
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a"; // Pipedrive SKU field key
    
    for (let i = 0; i < productUpdates.length; i++) {
      const { id, sku, name } = productUpdates[i];
      try {
        const result = await updateProduct(id, {
          name: name, // Ensure name has correct SKU format
          code: "ES", // Product code is "ES" for all
          [SKU_FIELD_KEY]: sku, // SKU goes to the SKU field
        });
        results.push({
          index: i,
          productId: id,
          name: name,
          newCode: sku,
          success: true,
          product: result.data,
        });
        
        // Small delay to avoid rate limiting
        if (i < productUpdates.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error: any) {
        errors.push({
          index: i,
          productId: id,
          name: name,
          error: error.message || "Failed to update product",
        });
      }
    }

    return NextResponse.json({
      success: true,
      updated: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Failed to update installation products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update installation products",
      },
      { status: 500 }
    );
  }
}


