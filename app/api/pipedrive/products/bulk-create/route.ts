import { NextRequest, NextResponse } from "next/server";
import { createProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/bulk-create
 * Create multiple products in Pipedrive
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { products } = body;

    if (!Array.isArray(products)) {
      return NextResponse.json(
        {
          success: false,
          error: "Products must be an array",
        },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    // Create products one by one (Pipedrive doesn't have bulk create)
    for (let i = 0; i < products.length; i++) {
      const productData = products[i];
      try {
        const result = await createProduct(productData);
        results.push({
          index: i,
          success: true,
          product: result.data,
        });
        
        // Small delay to avoid rate limiting
        if (i < products.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error: any) {
        errors.push({
          index: i,
          product: productData,
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
    console.error("Failed to bulk create products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to bulk create products",
      },
      { status: 500 }
    );
  }
}



