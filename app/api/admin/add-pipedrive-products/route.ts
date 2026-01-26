import { NextRequest, NextResponse } from "next/server";
import { getProductConfig, saveProductConfig } from "@/utils/productStorage";
import { ProductConfig } from "@/types/product";

/**
 * POST /api/admin/add-pipedrive-products
 * Helper endpoint to add Pipedrive products to Cube 125 for testing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }

    // This is a server-side route, but we need client-side localStorage
    // So we'll return instructions instead
    return NextResponse.json({
      success: true,
      message: "Please use the admin interface to add Pipedrive products",
      instructions: [
        "1. Go to /admin/products/" + productId,
        "2. Click on 'Steps & Options' tab",
        "3. Expand each step",
        "4. For each option, use the Pipedrive Product Selector to search and select products",
        "5. Suggested products:",
        "   - Lighting: Search 'Hiki' -> Select 'Sauna Exterior Hiki L' (ID: 6689)",
        "   - Aromas: Search 'Whisk' -> Select 'Natural Oak Sauna Whisk' (ID: 6688) or 'Organic Birch Sauna Whisk' (ID: 6690)",
        "   - Electrical: Search 'Installation' -> Select 'Ice Bath Installation' (ID: 6677)",
        "   - Cold Plunge: Search 'Chiller' -> Select 'Cooling and Heating Unit' (ID: 6692)",
      ],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process request",
      },
      { status: 500 }
    );
  }
}



