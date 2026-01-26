import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated, deleteProduct, getProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/remove-duplicate-infrared-saunas
 * Find and remove duplicate AURA110 and AURA150 products
 * Keeps the product with the highest ID (most recent) for each SKU+Country combination
 */
export async function POST(request: NextRequest) {
  try {
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";

    const targetSkus = ["AURA110", "AURA150"];

    console.log("🔍 Fetching all products from Pipedrive...");
    const allProducts = await getAllProductsPaginated();
    
    // Filter for infrared sauna products
    const infraredProducts = allProducts.filter((p: any) => {
      const sku = (p[SKU_FIELD_KEY] || p.sku || "").toUpperCase();
      return targetSkus.includes(sku);
    });

    console.log(`✅ Found ${infraredProducts.length} infrared sauna products`);

    // Group products by SKU and Country code
    const productGroups: Record<string, any[]> = {};

    for (const product of infraredProducts) {
      const sku = (product[SKU_FIELD_KEY] || product.sku || "").toUpperCase();
      const countryCode = (product.code || "").toUpperCase() || "UNKNOWN";
      const key = `${sku}_${countryCode}`;

      if (!productGroups[key]) {
        productGroups[key] = [];
      }
      productGroups[key].push(product);
    }

    // Find duplicates and determine which to keep
    const toDelete: Array<{ productId: number; sku: string; country: string; reason: string }> = [];
    const toKeep: Array<{ productId: number; sku: string; country: string }> = [];

    for (const [key, products] of Object.entries(productGroups)) {
      if (products.length > 1) {
        // Multiple products with same SKU+Country - find duplicates
        console.log(`⚠️  Found ${products.length} products for ${key}`);

        // Sort by ID (highest = most recent) and keep the first one
        const sorted = products.sort((a, b) => b.id - a.id);
        const keepProduct = sorted[0];
        const duplicates = sorted.slice(1);

        toKeep.push({
          productId: keepProduct.id,
          sku: (keepProduct[SKU_FIELD_KEY] || keepProduct.sku || "").toUpperCase(),
          country: (keepProduct.code || "").toUpperCase(),
        });

        for (const duplicate of duplicates) {
          toDelete.push({
            productId: duplicate.id,
            sku: (duplicate[SKU_FIELD_KEY] || duplicate.sku || "").toUpperCase(),
            country: (duplicate.code || "").toUpperCase(),
            reason: `Duplicate of product ${keepProduct.id}`,
          });
        }
      } else {
        // Only one product - keep it
        const product = products[0];
        toKeep.push({
          productId: product.id,
          sku: (product[SKU_FIELD_KEY] || product.sku || "").toUpperCase(),
          country: (product.code || "").toUpperCase(),
        });
      }
    }

    console.log(`📊 Summary:`);
    console.log(`   - Total products found: ${infraredProducts.length}`);
    console.log(`   - Unique SKU+Country combinations: ${Object.keys(productGroups).length}`);
    console.log(`   - Products to keep: ${toKeep.length}`);
    console.log(`   - Duplicates to delete: ${toDelete.length}`);

    // Delete duplicates
    const deleted = [];
    const errors = [];

    for (const duplicate of toDelete) {
      try {
        // Get product details before deleting for logging
        const productDetails = await getProduct(duplicate.productId);
        const productName = productDetails.data.name || `Product ${duplicate.productId}`;

        await deleteProduct(duplicate.productId);

        deleted.push({
          productId: duplicate.productId,
          productName,
          sku: duplicate.sku,
          country: duplicate.country,
          reason: duplicate.reason,
          success: true,
        });

        console.log(`✅ Deleted duplicate: ${productName} (ID: ${duplicate.productId}, ${duplicate.sku}, ${duplicate.country})`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: any) {
        errors.push({
          productId: duplicate.productId,
          sku: duplicate.sku,
          country: duplicate.country,
          error: error.message || "Unknown error",
          success: false,
        });
        console.error(`❌ Failed to delete product ${duplicate.productId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Removed ${deleted.length} duplicate product(s)`,
      summary: {
        totalProducts: infraredProducts.length,
        uniqueCombinations: Object.keys(productGroups).length,
        productsKept: toKeep.length,
        duplicatesDeleted: deleted.length,
        errors: errors.length,
      },
      kept: toKeep,
      deleted,
      errors: errors.length > 0 ? errors : undefined,
      duplicatesFound: Object.entries(productGroups)
        .filter(([_, products]) => products.length > 1)
        .map(([key, products]) => ({
          key,
          count: products.length,
          productIds: products.map((p: any) => p.id),
        })),
    });
  } catch (error: any) {
    console.error("Failed to remove duplicate products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to remove duplicates",
      },
      { status: 500 }
    );
  }
}
