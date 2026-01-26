import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated, updateProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/fix-aisti-names-uk
 * Fix the names for SI-AISTI150 and SI-AISTI220 UK products
 */
export async function POST(request: NextRequest) {
  try {
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";
    
    console.log("🔍 Fetching UK products...");
    const allProducts = await getAllProductsPaginated();
    const ukProducts = allProducts.filter((p: any) => (p.code || "").toUpperCase() === "UK");
    
    const fixes = [
      { sku: "SI-AISTI150", correctName: "Outdoor Sauna Aisti 150" },
      { sku: "SI-AISTI220", correctName: "Outdoor Sauna Aisti 220" },
    ];

    const results = [];
    const errors = [];

    for (const fix of fixes) {
      const product = ukProducts.find((p: any) => {
        const productSku = (p[SKU_FIELD_KEY] || p.sku || "").toUpperCase();
        return productSku === fix.sku.toUpperCase();
      });

      if (!product) {
        errors.push({
          sku: fix.sku,
          error: "Product not found",
        });
        continue;
      }

      const productId = product.id;
      const currentName = product.name || "";
      const currentPrice = product.prices?.[0]?.price || 0;
      const currentCurrency = product.prices?.[0]?.currency || "EUR";

      if (currentName !== fix.correctName) {
        try {
          await updateProduct(productId, {
            name: fix.correctName,
          });

          results.push({
            productId,
            sku: fix.sku,
            oldName: currentName,
            newName: fix.correctName,
            price: currentPrice,
            currency: currentCurrency,
            success: true,
          });

          console.log(`✅ Fixed ${fix.sku}: "${currentName}" → "${fix.correctName}"`);

          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error: any) {
          errors.push({
            sku: fix.sku,
            error: error.message || "Failed to update",
          });
        }
      } else {
        results.push({
          productId,
          sku: fix.sku,
          name: fix.correctName,
          alreadyCorrect: true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      fixed: results.filter(r => !r.alreadyCorrect).length,
      alreadyCorrect: results.filter(r => r.alreadyCorrect).length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Failed to fix Aisti names:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fix names",
      },
      { status: 500 }
    );
  }
}
