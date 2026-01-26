import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/pipedrive/client";

/**
 * GET /api/pipedrive/products/search-by-sku
 * Search for products and show their structure to help debug
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get("term") || "AURA";

    // Get all products (or search)
    const result = await getProducts({ term: searchTerm, limit: 100 });
    const products = result.data || [];

    // Format response to show product structure
    const formattedProducts = products.map((product: any) => ({
      id: product.id,
      name: product.name,
      code: product.code, // SKU
      prices: product.prices || [],
      active_flag: product.active_flag,
      visible_to: product.visible_to,
      // Show all fields for debugging
      allFields: Object.keys(product),
    }));

    return NextResponse.json({
      success: true,
      count: products.length,
      searchTerm,
      products: formattedProducts,
    });
  } catch (error: any) {
    console.error("Failed to search products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to search products",
      },
      { status: 500 }
    );
  }
}
