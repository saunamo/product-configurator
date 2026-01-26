import { NextRequest, NextResponse } from "next/server";
import {
  getAllProducts,
  saveAllProducts,
  saveProduct,
  deleteProduct as deleteProductFromStorage,
} from "@/lib/database/products";

/**
 * GET /api/products - Get all products
 */
export async function GET() {
  try {
    const products = await getAllProducts();
    return NextResponse.json({ products });
  } catch (error: any) {
    console.error("Error getting products:", error);
    return NextResponse.json(
      { error: "Failed to get products", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products - Create or update products
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (Array.isArray(body)) {
      // Bulk save
      await saveAllProducts(body);
      return NextResponse.json({ success: true, count: body.length });
    } else {
      // Single product
      await saveProduct(body);
      return NextResponse.json({ success: true, product: body });
    }
  } catch (error: any) {
    console.error("Error saving products:", error);
    return NextResponse.json(
      { error: "Failed to save products", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[productId] - Delete a product
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    
    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      );
    }
    
    await deleteProductFromStorage(productId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product", message: error.message },
      { status: 500 }
    );
  }
}


