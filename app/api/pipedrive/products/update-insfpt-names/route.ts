import { NextRequest, NextResponse } from "next/server";
import { updateProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/update-insfpt-names
 * Update INSFPT products to have "Installation [Country]" format
 */
export async function POST(request: NextRequest) {
  try {
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a"; // Pipedrive SKU field key
    
    // Product IDs and their new names (from previous creation responses)
    // Format: { productId, code, newName }
    const productUpdates = [
      // Spanish (ES) - Product ID: 17980
      {
        productId: 17980,
        code: "ES",
        newName: "Instalación España | INSFPT",
      },
      // English (EN) - Product ID: 17987
      {
        productId: 17987,
        code: "EN",
        newName: "Installation UK | INSFPT",
      },
      // Portuguese (PT) - Product ID: 17994
      {
        productId: 17994,
        code: "PT",
        newName: "Instalação Portugal | INSFPT",
      },
      // UK - Product ID: (not created, but if exists)
      // Italian (IT) - Product ID: 18005
      {
        productId: 18005,
        code: "IT",
        newName: "Installazione Italia | INSFPT",
      },
      // French (FR) - Product ID: 18012
      {
        productId: 18012,
        code: "FR",
        newName: "Installation France | INSFPT",
      },
    ];

    const results = [];
    const errors = [];

    // Update products
    for (let i = 0; i < productUpdates.length; i++) {
      const { productId, code, newName } = productUpdates[i];
      try {
        const result = await updateProduct(productId, {
          name: newName,
        });
        results.push({
          index: i,
          productId: productId,
          code: code,
          newName: newName,
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
          productId: productId,
          code: code,
          newName: newName,
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
    console.error("Failed to update INSFPT product names:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update INSFPT product names",
      },
      { status: 500 }
    );
  }
}


