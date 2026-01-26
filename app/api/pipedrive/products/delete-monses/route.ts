import { NextRequest, NextResponse } from "next/server";
import { deleteProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/delete-monses
 * Delete MONSES products for PT, IT, FR, UK, and EN (keep only ES)
 */
export async function POST(request: NextRequest) {
  try {
    // Product IDs for MONSES products to delete (from previous creation responses)
    // Keep ES (17981) - do NOT delete
    const productsToDelete = [
      {
        productId: 17988, // EN (English)
        code: "EN",
        name: "Sauna Assembly Spain | MONSES",
      },
      {
        productId: 17995, // PT (Portuguese)
        code: "PT",
        name: "Montagem de Sauna Espanha | MONSES",
      },
      {
        productId: 18006, // IT (Italian)
        code: "IT",
        name: "Montaggio Sauna Spagna | MONSES",
      },
      {
        productId: 18013, // FR (French)
        code: "FR",
        name: "Assemblage Sauna Espagne | MONSES",
      },
      // UK doesn't have MONSES (first 3 products were excluded)
    ];

    const results = [];
    const errors = [];

    // Delete products
    for (let i = 0; i < productsToDelete.length; i++) {
      const { productId, code, name } = productsToDelete[i];
      try {
        await deleteProduct(productId);
        results.push({
          index: i,
          productId: productId,
          code: code,
          name: name,
          success: true,
        });
        
        // Small delay to avoid rate limiting
        if (i < productsToDelete.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error: any) {
        errors.push({
          index: i,
          productId: productId,
          code: code,
          name: name,
          error: error.message || "Failed to delete product",
        });
      }
    }

    return NextResponse.json({
      success: true,
      deleted: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
      note: "ES (Spanish) MONSES product (ID: 17981) was kept and not deleted",
    });
  } catch (error: any) {
    console.error("Failed to delete MONSES products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete MONSES products",
      },
      { status: 500 }
    );
  }
}


