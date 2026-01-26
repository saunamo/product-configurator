import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated, updateProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/verify-cariitti-skus
 * Check and fix SKU/name mismatches for Cariitti LED products
 */
export async function POST(request: NextRequest) {
  try {
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";

    // Expected mappings: length -> SKU
    const expectedMappings: Record<string, string> = {
      "1m": "ACC-CAR-LED2",
      "2m": "ACC-CAR-LED3",
      "3m": "ACC-CAR-LED4",
    };

    // Expected prices (with VAT)
    const expectedPrices: Record<string, number> = {
      "1m": 275.00,
      "2m": 350.00,
      "3m": 425.00,
    };

    console.log("🔍 Fetching all products from Pipedrive...");
    const allProducts = await getAllProductsPaginated();
    
    // Find all Cariitti products
    const cariittiProducts = allProducts.filter((p: any) => {
      const name = (p.name || "").toLowerCase();
      const sku = (p[SKU_FIELD_KEY] || p.sku || "").toUpperCase();
      return name.includes("cariitti") && (sku.includes("CAR-LED") || name.includes("led"));
    });

    console.log(`✅ Found ${cariittiProducts.length} Cariitti product(s)`);

    const analysis: Array<{
      productId: number;
      currentName: string;
      currentSku: string;
      country: string;
      detectedLength: string | null;
      expectedSku: string | null;
      skuMatch: boolean;
      needsUpdate: boolean;
      issues: string[];
    }> = [];

    const updates: Array<{
      productId: number;
      oldName: string;
      newName: string;
      oldSku: string;
      newSku: string;
      country: string;
    }> = [];

    // Analyze each product
    for (const product of cariittiProducts) {
      const productId = product.id;
      const productName = product.name || "";
      const productSku = (product[SKU_FIELD_KEY] || product.sku || "").toUpperCase();
      const country = (product.code || "").toUpperCase();

      // Detect length from name (1m, 2m, 3m)
      let detectedLength: string | null = null;
      if (productName.toLowerCase().includes("1m") || productName.toLowerCase().includes("1 m")) {
        detectedLength = "1m";
      } else if (productName.toLowerCase().includes("2m") || productName.toLowerCase().includes("2 m")) {
        detectedLength = "2m";
      } else if (productName.toLowerCase().includes("3m") || productName.toLowerCase().includes("3 m")) {
        detectedLength = "3m";
      }

      const expectedSku = detectedLength ? expectedMappings[detectedLength] : null;
      const skuMatch = expectedSku ? productSku === expectedSku : false;

      const issues: string[] = [];
      if (detectedLength && !skuMatch && expectedSku) {
        issues.push(`SKU mismatch: has "${productSku}", should be "${expectedSku}" for ${detectedLength} version`);
      }
      if (!detectedLength) {
        issues.push("Could not detect length (1m/2m/3m) from name");
      }

      analysis.push({
        productId,
        currentName: productName,
        currentSku: productSku,
        country,
        detectedLength,
        expectedSku,
        skuMatch,
        needsUpdate: issues.length > 0,
        issues,
      });

      // If SKU doesn't match, prepare update
      if (detectedLength && !skuMatch && expectedSku) {
        // Determine correct name format based on country
        let baseName = "Cariitti Linear LED";
        if (country === "ES") {
          baseName = "Cariitti LED lineal";
        } else if (country === "FR") {
          baseName = "Cariitti Linear Led";
        } else if (country === "IT") {
          baseName = "Cariitti Linear Led";
        }

        const newName = `${baseName} ${detectedLength} | ${expectedSku}`;
        
        updates.push({
          productId,
          oldName: productName,
          newName,
          oldSku: productSku,
          newSku: expectedSku,
          country,
        });
      }
    }

    // Apply updates if requested
    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        await updateProduct(update.productId, {
          name: update.newName,
          [SKU_FIELD_KEY]: update.newSku,
        });

        results.push({
          productId: update.productId,
          country: update.country,
          oldName: update.oldName,
          newName: update.newName,
          oldSku: update.oldSku,
          newSku: update.newSku,
          success: true,
        });

        console.log(`✅ Updated product ${update.productId} (${update.country}): "${update.oldName}" → "${update.newName}", SKU: "${update.oldSku}" → "${update.newSku}"`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: any) {
        errors.push({
          productId: update.productId,
          country: update.country,
          error: error.message || "Unknown error",
          success: false,
        });
        console.error(`❌ Failed to update product ${update.productId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      analysis,
      updates: results.length > 0 ? results : undefined,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        totalProducts: cariittiProducts.length,
        analyzed: analysis.length,
        needsUpdate: analysis.filter(a => a.needsUpdate).length,
        updated: results.length,
        failed: errors.length,
        byLength: {
          "1m": analysis.filter(a => a.detectedLength === "1m").length,
          "2m": analysis.filter(a => a.detectedLength === "2m").length,
          "3m": analysis.filter(a => a.detectedLength === "3m").length,
        },
      },
    });
  } catch (error: any) {
    console.error("Failed to verify Cariitti SKUs:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to verify products",
      },
      { status: 500 }
    );
  }
}
