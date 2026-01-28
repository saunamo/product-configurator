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
    
    // Add cache-control headers to prevent caching
    return NextResponse.json(
      { config },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
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
    
    console.log(`\n📝 [API] PUT /api/products/${params.productId}/config`);
    console.log(`📝 [API] Incoming body:`, JSON.stringify({
      mainProductImageUrl: body.mainProductImageUrl,
      mainProductPipedriveId: body.mainProductPipedriveId,
      hasSteps: !!body.steps,
    }));
    
    // CRITICAL: Load existing config first to preserve ALL fields
    const existingConfig = await getProductConfig(params.productId);
    console.log(`📝 [API] Existing config mainImage:`, existingConfig?.mainProductImageUrl);
    
    // Merge: preserve all existing fields, then apply updates
    const config = {
      ...(existingConfig || {}),
      ...body,
      productId: params.productId,
    };
    
    console.log(`📝 [API] Merged config mainImage:`, config.mainProductImageUrl);
    
    await saveProductConfig(config);
    
    // Verify save by reading back
    const verifyConfig = await getProductConfig(params.productId);
    console.log(`📝 [API] After save, verified mainImage:`, verifyConfig?.mainProductImageUrl);
    console.log(`✅ [API] Save complete for ${params.productId}\n`);
    
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error("❌ [API] Error saving product config:", error);
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


