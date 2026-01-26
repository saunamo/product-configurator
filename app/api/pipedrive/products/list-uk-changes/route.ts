import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/list-uk-changes
 * List all UK products that were recently updated to show what changed
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🔍 Fetching all UK products from Pipedrive...");
    const allProducts = await getAllProductsPaginated();
    
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";
    
    // Filter UK products
    const ukProducts = allProducts.filter((p: any) => (p.code || "").toUpperCase() === "UK");
    
    // Get the products that were likely updated (based on the IDs from previous update)
    const updatedProductIds = [
      16408, 16416, 16421, 16422, 16423, 16426, 17774, 17782, 17812, 17855,
      17873, 17881, 17940, 17945, 17952, 17956, 17960, 17961, 17962, 17964,
      17965, 17973, 17975, 17976
    ];

    const changes = ukProducts
      .filter((p: any) => updatedProductIds.includes(p.id))
      .map((product: any) => {
        const productId = product.id;
        const productName = product.name || "";
        const productSku = product[SKU_FIELD_KEY] || product.sku || "";
        const currentPrice = product.prices?.[0]?.price || 0;
        const currentCurrency = product.prices?.[0]?.currency || "EUR";
        const currentTax = product.tax || 0;
        const priceWithVAT = currentPrice * (1 + currentTax / 100);

        return {
          productId,
          sku: productSku,
          currentName: productName,
          currentPrice: Math.round(currentPrice * 100) / 100,
          currentCurrency,
          currentTax: `${currentTax}%`,
          priceWithVAT: Math.round(priceWithVAT * 100) / 100,
        };
      })
      .sort((a, b) => a.currentName.localeCompare(b.currentName));

    return NextResponse.json({
      success: true,
      totalUpdated: changes.length,
      changes: changes,
    });
  } catch (error: any) {
    console.error("Failed to list UK changes:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to list changes",
      },
      { status: 500 }
    );
  }
}
