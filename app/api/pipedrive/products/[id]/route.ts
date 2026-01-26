import { NextRequest, NextResponse } from "next/server";
import { getProduct } from "@/lib/pipedrive/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = parseInt(params.id);
    
    if (isNaN(productId)) {
      return NextResponse.json(
        { success: false, error: "Invalid product ID" },
        { status: 400 }
      );
    }

    const product = await getProduct(productId);
    
    return NextResponse.json({
      success: true,
      product: product.data,
    });
  } catch (error: any) {
    console.error("Failed to fetch Pipedrive product:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch product",
      },
      { status: 500 }
    );
  }
}
