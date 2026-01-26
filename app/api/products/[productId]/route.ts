import { NextRequest, NextResponse } from "next/server";
import {
  getProduct,
  saveProduct,
  deleteProduct as deleteProductFromStorage,
} from "@/lib/database/products";

/**
 * GET /api/products/[productId] - Get a single product
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const product = await getProduct(params.productId);
    
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ product });
  } catch (error: any) {
    console.error("Error getting product:", error);
    return NextResponse.json(
      { error: "Failed to get product", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/products/[productId] - Update a product
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const body = await request.json();
    const product = { ...body, id: params.productId };
    
    await saveProduct(product);
    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[productId] - Delete a product
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    await deleteProductFromStorage(params.productId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product", message: error.message },
      { status: 500 }
    );
  }
}


