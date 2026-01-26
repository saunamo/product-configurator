import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated, updateProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/update-uk-prices
 * Update UK product prices (in GBP) for SI-AISTI150 and SI-AISTI220
 * SI-AISTI150: 7500 GBP (with 20% VAT = 6250 GBP VAT-less)
 * SI-AISTI220: 9500 GBP (with 20% VAT = 7916.67 GBP VAT-less)
 */
export async function POST(request: NextRequest) {
  try {
    const SKUS = ["SI-AISTI150", "SI-AISTI220"];
    const pricesWithVAT: Record<string, number> = {
      "SI-AISTI150": 7500, // GBP with VAT
      "SI-AISTI220": 9500, // GBP with VAT
    };

    const UK_TAX_RATE = 20; // 20% VAT
    const UK_CURRENCY = "GBP";

    // Calculate VAT-less prices
    const pricesWithoutVAT: Record<string, number> = {};
    for (const [sku, priceWithVAT] of Object.entries(pricesWithVAT)) {
      const priceWithoutVAT = priceWithVAT / (1 + UK_TAX_RATE / 100);
      pricesWithoutVAT[sku] = Math.round(priceWithoutVAT * 100) / 100; // Round to 2 decimals
    }

    console.log(`🔍 Searching for UK products with SKUs: ${SKUS.join(", ")}`);
    console.log(`💰 Prices with VAT (GBP):`, pricesWithVAT);
    console.log(`💰 VAT-less prices (GBP):`, pricesWithoutVAT);

    // Search for all products
    const allProducts = await getAllProductsPaginated();
    
    // Find products with the SKUs and UK code
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a"; // Pipedrive SKU field key
    const matchingProducts = allProducts.filter((product: any) => {
      const productSku = product[SKU_FIELD_KEY] || product.sku || "";
      const productCode = product.code || "";
      return productCode === "UK" && SKUS.some(sku => productSku === sku || productSku.includes(sku));
    });

    if (matchingProducts.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No UK products found with SKUs: ${SKUS.join(", ")}`,
      }, { status: 404 });
    }

    console.log(`✅ Found ${matchingProducts.length} UK product(s)`);

    const results = [];
    const errors = [];

    // Update each product
    for (const product of matchingProducts) {
      const productId = product.id;
      const productName = product.name || `Product ${productId}`;
      const productSku = product[SKU_FIELD_KEY] || product.sku || "";
      const currentPrice = product.prices?.[0]?.price || 0;
      const currentCurrency = product.prices?.[0]?.currency || "EUR";
      const currentTax = product.tax || 0;

      // Determine which SKU this is
      let sku: string | null = null;
      let expectedPrice: number | null = null;
      
      if (productSku.includes("SI-AISTI150")) {
        sku = "SI-AISTI150";
        expectedPrice = pricesWithoutVAT["SI-AISTI150"];
      } else if (productSku.includes("SI-AISTI220")) {
        sku = "SI-AISTI220";
        expectedPrice = pricesWithoutVAT["SI-AISTI220"];
      }

      if (!sku || !expectedPrice) {
        errors.push({
          productId,
          productName,
          productSku,
          error: `Could not determine SKU or expected price`,
        });
        continue;
      }

      const expectedPriceWithVAT = pricesWithVAT[sku];

      try {
        // Update the product price and tax
        await updateProduct(productId, {
          prices: [
            {
              price: expectedPrice,
              currency: UK_CURRENCY, // Update to GBP
            },
          ],
          tax: UK_TAX_RATE,
        });

        results.push({
          productId,
          productName,
          sku,
          country: "UK",
          currency: UK_CURRENCY,
          taxRate: `${UK_TAX_RATE}%`,
          oldPrice: currentPrice,
          oldCurrency: currentCurrency,
          oldTax: `${currentTax}%`,
          newPrice: expectedPrice,
          newCurrency: UK_CURRENCY,
          newTax: `${UK_TAX_RATE}%`,
          priceWithVAT: expectedPriceWithVAT,
          success: true,
        });

        console.log(`✅ Updated ${productName} (UK): ${currentPrice} ${currentCurrency} → ${expectedPrice} ${UK_CURRENCY} (${UK_TAX_RATE}% VAT = ${expectedPriceWithVAT} ${UK_CURRENCY})`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: any) {
        errors.push({
          productId,
          productName,
          sku,
          error: error.message || "Failed to update product",
        });
        console.error(`❌ Failed to update ${productName} (UK):`, error);
      }
    }

    return NextResponse.json({
      success: true,
      country: "UK",
      currency: UK_CURRENCY,
      taxRate: `${UK_TAX_RATE}%`,
      pricesWithVAT,
      pricesWithoutVAT,
      updated: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Failed to update UK products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update UK products",
      },
      { status: 500 }
    );
  }
}
