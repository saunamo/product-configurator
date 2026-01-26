import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getProducts, getProductPrice } from "@/lib/shopify/client";

async function getAccessToken(): Promise<string | null> {
  if (process.env.SHOPIFY_ACCESS_TOKEN) {
    return process.env.SHOPIFY_ACCESS_TOKEN;
  }
  const cookieStore = await cookies();
  return cookieStore.get("shopify_access_token")?.value || null;
}

/**
 * POST /api/prices/sync
 * Sync prices from Shopify for given product IDs
 * 
 * Body: {
 *   productIds: string[] // Array of Shopify product IDs
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productIds } = body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "productIds array is required" },
        { status: 400 }
      );
    }

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

    // Fetch products from Shopify
    const products = await getProducts(productIds, accessToken);

    // Map product IDs to prices
    const priceMap: Record<string, number> = {};
    
    products.forEach((product) => {
      if (product && product.id) {
        const price = getProductPrice(product);
        if (price !== null) {
          // Convert Shopify product ID to string for consistency
          priceMap[String(product.id)] = price;
        }
      }
    });

    return NextResponse.json({
      success: true,
      prices: priceMap,
      synced: Object.keys(priceMap).length,
      total: productIds.length,
    });
  } catch (error: any) {
    console.error("Price sync error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to sync prices from Shopify",
      },
      { status: 500 }
    );
  }
}

