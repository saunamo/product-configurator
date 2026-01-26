import { NextRequest, NextResponse } from "next/server";
import { createProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/create
 * Create a single product in Pipedrive
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const result = await createProduct(body);
    
    return NextResponse.json({
      success: true,
      product: result.data,
    });
  } catch (error: any) {
    console.error("Failed to create product:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create product in Pipedrive",
      },
      { status: 500 }
    );
  }
}



