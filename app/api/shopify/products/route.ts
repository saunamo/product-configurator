import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { shopifyRequest, getProduct, getProductByHandle, searchProducts } from "@/lib/shopify/client";

async function getAccessToken(): Promise<string | null> {
  // Try environment variable first (private app)
  if (process.env.SHOPIFY_ACCESS_TOKEN) {
    return process.env.SHOPIFY_ACCESS_TOKEN;
  }
  
  // Try cookie (OAuth flow)
  const cookieStore = await cookies();
  const token = cookieStore.get("shopify_access_token")?.value;
  return token || null;
}

/**
 * GET /api/shopify/products
 * Fetch products from Shopify
 * 
 * Query params:
 * - id: Product ID
 * - handle: Product handle (slug)
 * - query: Search query
 * - limit: Result limit (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Shopify app not installed. Please install the app first.",
          installUrl: "/api/auth/shopify",
        },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get("id");
    const handle = searchParams.get("handle");
    const query = searchParams.get("query");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Get product by ID
    if (productId) {
      const data = await getProduct(productId, accessToken);
      return NextResponse.json({
        success: true,
        product: data.product,
      });
    }

    // Get product by handle
    if (handle) {
      const data = await getProductByHandle(handle, accessToken);
      return NextResponse.json({
        success: true,
        product: data.product,
      });
    }

    // Search products
    if (query) {
      const data = await searchProducts(query, limit, accessToken);
      return NextResponse.json({
        success: true,
        products: data.products || [],
      });
    }

    // List all products (with limit)
    const data = await shopifyRequest<{ products: any[] }>(
      `/products.json?limit=${limit}`,
      {},
      accessToken
    );

    return NextResponse.json({
      success: true,
      products: data.products || [],
    });
  } catch (error: any) {
    console.error("Shopify API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch products from Shopify",
      },
      { status: 500 }
    );
  }
}

