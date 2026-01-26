import { NextRequest, NextResponse } from "next/server";
import {
  getProductConfig,
  saveProductConfig,
  deleteProductConfig as deleteConfigFromStorage,
} from "@/lib/database/products";

/**
 * GET /api/products/[productId]/config - Get product config
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const config = await getProductConfig(params.productId);
    
    if (!config) {
      return NextResponse.json(
        { error: "Product config not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ config });
  } catch (error: any) {
    console.error("Error getting product config:", error);
    return NextResponse.json(
      { error: "Failed to get product config", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/products/[productId]/config - Save product config
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const body = await request.json();
    const config = { ...body, productId: params.productId };
    
    await saveProductConfig(config);
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error("Error saving product config:", error);
    return NextResponse.json(
      { error: "Failed to save product config", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[productId]/config - Delete product config
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    await deleteConfigFromStorage(params.productId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting product config:", error);
    return NextResponse.json(
      { error: "Failed to delete product config", message: error.message },
      { status: 500 }
    );
  }
}


