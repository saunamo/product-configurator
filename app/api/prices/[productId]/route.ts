import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getProduct, getProductPrice } from "@/lib/shopify/client";

async function getAccessToken(): Promise<string | null> {
  if (process.env.SHOPIFY_ACCESS_TOKEN) {
    return process.env.SHOPIFY_ACCESS_TOKEN;
  }
  const cookieStore = await cookies();
  return cookieStore.get("shopify_access_token")?.value || null;
}

/**
 * GET /api/prices/[productId]
 * Get price for a specific Shopify product ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const { productId } = params;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
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

    const data = await getProduct(productId, accessToken);
    const price = getProductPrice(data.product);

    if (price === null) {
      return NextResponse.json(
        { success: false, error: "Product has no valid price" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      productId,
      price,
      currency: data.product.variants?.[0]?.price ? "USD" : undefined,
    });
  } catch (error: any) {
    console.error("Price fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch price from Shopify",
      },
      { status: 500 }
    );
  }
}

