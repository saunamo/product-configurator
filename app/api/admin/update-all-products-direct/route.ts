import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/update-all-products-direct
 * This endpoint provides instructions but actual update must happen client-side
 * We'll create a client-side script instead
 */
export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "Use the client-side update script in utils/updateProductNamesAndImages.ts",
  });
}
