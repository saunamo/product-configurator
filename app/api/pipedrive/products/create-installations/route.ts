import { NextRequest, NextResponse } from "next/server";
import { createProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/create-installations
 * Create installation products in Pipedrive
 */
export async function POST(request: NextRequest) {
  try {
    // Installation products from the spreadsheet
    const products = [
      {
        name: "Instalaciones fuera de PT (SIN IVA)",
        price: 1033.05,
        sku: "INSFPT",
      },
      {
        name: "Montaje de Sauna España",
        price: 1100.00,
        sku: "MONSES",
      },
      {
        name: "Montaje de Sauna Islas",
        price: 1500.00,
        sku: "MONSIS",
      },
      {
        name: "Instalación de Bañera de Hidromasaje de Leña",
        price: 350.00,
        sku: "INSBHL",
      },
      {
        name: "Instalación Eléctrica (solo conexiones)",
        price: 750.00,
        sku: "INSELE",
      },
      {
        name: "Instalación Eléctrica (instalación completa)",
        price: 1300.00,
        sku: "INSEIC",
      },
      {
        name: "Tratamiento de Madera",
        price: 345.53,
        sku: "TRAMAD",
      },
    ];

    // Format products for Pipedrive
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a"; // Pipedrive SKU field key
    
    const productsToCreate = products.map((product) => {
      const fullName = `${product.name} | ${product.sku}`;
      
      return {
        name: fullName,
        code: "ES", // Product code is "ES" for all
        [SKU_FIELD_KEY]: product.sku, // SKU goes to the SKU field
        prices: [
          {
            price: product.price,
            currency: "EUR",
          },
        ],
        tax: 21,
        unit: "piece",
      };
    });

    const results = [];
    const errors = [];

    // Create products one by one
    for (let i = 0; i < productsToCreate.length; i++) {
      const productData = productsToCreate[i];
      try {
        const result = await createProduct(productData);
        results.push({
          index: i,
          name: productData.name,
          success: true,
          productId: result.data.id,
          product: result.data,
        });
        
        // Small delay to avoid rate limiting
        if (i < productsToCreate.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error: any) {
        errors.push({
          index: i,
          name: productData.name,
          error: error.message || "Failed to create product",
        });
      }
    }

    return NextResponse.json({
      success: true,
      created: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Failed to create installation products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create installation products",
      },
      { status: 500 }
    );
  }
}

