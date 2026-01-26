import { NextRequest, NextResponse } from "next/server";
import {
  getProducts,
  getProduct,
  searchProducts,
  getAllProductsPaginated,
} from "@/lib/pipedrive/client";

/**
 * GET /api/pipedrive/products
 * Get products from Pipedrive catalog
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get("id");
    const term = searchParams.get("term");
    const limit = searchParams.get("limit");

    // Get specific product by ID
    if (productId) {
      const data = await getProduct(parseInt(productId));
      return NextResponse.json({
        success: true,
        product: data.data,
      });
    }

    // Search products
    if (term) {
      // Fetch all products with pagination for client-side filtering
      // This ensures we get all matching products even with large catalogs
      const allProducts = await getAllProductsPaginated(term);
      return NextResponse.json({
        success: true,
        products: allProducts,
      });
    }

    // Get all products
    const products = await getProducts({
      limit: limit ? parseInt(limit) : 100,
    });

    return NextResponse.json({
      success: true,
      products: products.data || [],
    });
  } catch (error: any) {
    console.error("Pipedrive API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch products from Pipedrive",
      },
      { status: 500 }
    );
  }
}

