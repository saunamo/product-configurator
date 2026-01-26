import { NextRequest, NextResponse } from "next/server";
import { searchProducts, getProduct } from "@/lib/pipedrive/client";

/**
 * GET /api/pipedrive/products/check-prices
 * Check prices for specific products by SKU in all currencies
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const skus = searchParams.get("skus")?.split(",") || ["AURA150", "AURA110"];

    const results: Array<{
      sku: string;
      found: boolean;
      productId?: number;
      name?: string;
      prices?: Array<{
        price: number;
        currency: string;
        cost?: number;
      }>;
      error?: string;
    }> = [];

    for (const sku of skus) {
      try {
        // Search for product by SKU
        const searchResult = await searchProducts(sku, 10);
        const products = searchResult.data || [];

        // Find product by SKU in code field OR in name (SKU might be in name like "Product Name | SKU")
        // Also check if SKU appears anywhere in the name
        const product = products.find(
          (p: any) => {
            const nameUpper = p.name?.toUpperCase() || "";
            const skuUpper = sku.toUpperCase();
            return (
              p.code?.toUpperCase() === skuUpper ||
              nameUpper.includes(`| ${skuUpper}`) ||
              nameUpper.includes(`${skuUpper} |`) ||
              nameUpper.endsWith(` ${skuUpper}`) ||
              nameUpper.includes(skuUpper) // More flexible: check if SKU appears anywhere in name
            );
          }
        );

        if (!product) {
          results.push({
            sku,
            found: false,
            error: `Product with SKU ${sku} not found`,
          });
          continue;
        }

        // Get full product details including prices
        const fullProduct = await getProduct(product.id);

        results.push({
          sku,
          found: true,
          productId: product.id,
          name: product.name || fullProduct.data.name,
          prices: fullProduct.data.prices || [],
        });
      } catch (error: any) {
        results.push({
          sku,
          found: false,
          error: error.message || "Failed to fetch product",
        });
      }
    }

    return NextResponse.json({
      success: true,
      products: results,
    });
  } catch (error: any) {
    console.error("Failed to check product prices:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to check product prices",
      },
      { status: 500 }
    );
  }
}
