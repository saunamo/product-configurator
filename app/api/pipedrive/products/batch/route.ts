import { NextRequest, NextResponse } from "next/server";
import { getProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/batch
 * Fetch multiple Pipedrive products in a single request
 * Body: { productIds: number[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productIds } = body;
    
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "productIds must be a non-empty array" },
        { status: 400 }
      );
    }
    
    // Limit batch size to prevent timeout
    const maxBatchSize = 50;
    const idsToFetch = productIds.slice(0, maxBatchSize);
    
    // Fetch all products in parallel
    const productPromises = idsToFetch.map(async (productId: number) => {
      try {
        const product = await getProduct(productId);
        return {
          productId,
          success: true,
          product: product.data,
        };
      } catch (error: any) {
        console.error(`Failed to fetch product ${productId}:`, error);
        return {
          productId,
          success: false,
          error: error.message || "Failed to fetch product",
        };
      }
    });
    
    const results = await Promise.all(productPromises);
    
    // Convert to a map for easy lookup
    const productMap: Record<number, any> = {};
    results.forEach((result) => {
      if (result.success && result.product) {
        productMap[result.productId] = result.product;
      }
    });
    
    return NextResponse.json({
      success: true,
      products: productMap,
      fetched: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    });
  } catch (error: any) {
    console.error("Failed to fetch products in batch:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch products",
      },
      { status: 500 }
    );
  }
}
