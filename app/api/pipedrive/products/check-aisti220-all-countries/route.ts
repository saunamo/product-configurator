import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated, updateProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/check-aisti220-all-countries
 * Check and verify SI-AISTI220 prices for all country variants
 */
export async function POST(request: NextRequest) {
  try {
    const SKU = "SI-AISTI220";

    // Expected prices with VAT by country
    const expectedPricesWithVAT: Record<string, { price: number; currency: string; taxRate: number }> = {
      PT: { price: 8900, currency: "EUR", taxRate: 23 },
      UK: { price: 9500, currency: "GBP", taxRate: 20 },
      EN: { price: 8900, currency: "EUR", taxRate: 23 },
      FR: { price: 8900, currency: "EUR", taxRate: 20 },
      IT: { price: 8900, currency: "EUR", taxRate: 22 },
      ES: { price: 8900, currency: "EUR", taxRate: 21 },
      US: { price: 8900, currency: "EUR", taxRate: 0 },
    };

    // Calculate expected VAT-less prices
    const expectedPricesWithoutVAT: Record<string, number> = {};
    for (const [country, config] of Object.entries(expectedPricesWithVAT)) {
      const priceWithoutVAT = config.price / (1 + config.taxRate / 100);
      expectedPricesWithoutVAT[country] = Math.round(priceWithoutVAT * 100) / 100;
    }

    console.log(`🔍 Searching for products with SKU: ${SKU}`);
    console.log(`💰 Expected prices with VAT:`, expectedPricesWithVAT);
    console.log(`💰 Expected VAT-less prices:`, expectedPricesWithoutVAT);

    // Search for all products
    const allProducts = await getAllProductsPaginated();
    
    // Find products with the SKU
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";
    const matchingProducts = allProducts.filter((product: any) => {
      const productSku = product[SKU_FIELD_KEY] || product.sku || "";
      return productSku === SKU || productSku.includes(SKU);
    });

    if (matchingProducts.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No products found with SKU: ${SKU}`,
      }, { status: 404 });
    }

    console.log(`✅ Found ${matchingProducts.length} product(s) with SKU ${SKU}`);

    const results = [];
    const errors = [];
    const needsUpdate: any[] = [];

    // Check each product
    for (const product of matchingProducts) {
      const productCode = product.code || "";
      const productId = product.id;
      const productName = product.name || `Product ${productId}`;
      const currentPrice = product.prices?.[0]?.price || 0;
      const currentCurrency = product.prices?.[0]?.currency || "EUR";
      const currentTax = product.tax || 0;

      if (!expectedPricesWithVAT[productCode]) {
        errors.push({
          productId,
          productName,
          productCode,
          error: `Unknown country code: ${productCode}`,
        });
        continue;
      }

      const expected = expectedPricesWithVAT[productCode];
      const expectedPriceWithoutVAT = expectedPricesWithoutVAT[productCode];
      
      // Calculate current price with VAT
      const currentPriceWithVAT = currentPrice * (1 + currentTax / 100);
      
      // Check if price is correct (allow small rounding differences)
      const priceDifference = Math.abs(currentPriceWithVAT - expected.price);
      const isPriceCorrect = priceDifference < 1; // Allow 1 unit difference for rounding
      const isTaxCorrect = Math.abs(currentTax - expected.taxRate) < 0.1;
      const isCurrencyCorrect = currentCurrency === expected.currency;

      if (!isPriceCorrect || !isTaxCorrect || !isCurrencyCorrect) {
        needsUpdate.push({
          productId,
          productName,
          country: productCode,
          currentPrice,
          currentCurrency,
          currentTax,
          currentPriceWithVAT: Math.round(currentPriceWithVAT * 100) / 100,
          expectedPrice: expectedPriceWithoutVAT,
          expectedCurrency: expected.currency,
          expectedTaxRate: expected.taxRate,
          expectedPriceWithVAT: expected.price,
        });
      }

      results.push({
        productId,
        productName,
        country: productCode,
        currentPrice,
        currentCurrency,
        currentTax: `${currentTax}%`,
        currentPriceWithVAT: Math.round(currentPriceWithVAT * 100) / 100,
        expectedPrice: expectedPriceWithoutVAT,
        expectedCurrency: expected.currency,
        expectedTaxRate: `${expected.taxRate}%`,
        expectedPriceWithVAT: expected.price,
        isCorrect: isPriceCorrect && isTaxCorrect && isCurrencyCorrect,
        priceDifference: Math.round(priceDifference * 100) / 100,
      });
    }

    // Update products that need correction
    const updated = [];
    for (const product of needsUpdate) {
      try {
        await updateProduct(product.productId, {
          prices: [
            {
              price: product.expectedPrice,
              currency: product.expectedCurrency,
            },
          ],
          tax: product.expectedTaxRate,
        });

        updated.push({
          productId: product.productId,
          productName: product.productName,
          country: product.country,
          oldPrice: product.currentPrice,
          oldCurrency: product.currentCurrency,
          oldTax: `${product.currentTax}%`,
          newPrice: product.expectedPrice,
          newCurrency: product.expectedCurrency,
          newTax: `${product.expectedTaxRate}%`,
          success: true,
        });

        console.log(`✅ Updated ${product.productName} (${product.country}): ${product.currentPrice} ${product.currentCurrency} → ${product.expectedPrice} ${product.expectedCurrency} (${product.expectedTaxRate}% VAT = ${product.expectedPriceWithVAT} ${product.expectedCurrency})`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: any) {
        errors.push({
          productId: product.productId,
          productName: product.productName,
          country: product.country,
          error: error.message || "Failed to update product",
        });
        console.error(`❌ Failed to update ${product.productName} (${product.country}):`, error);
      }
    }

    return NextResponse.json({
      success: true,
      sku: SKU,
      totalProducts: matchingProducts.length,
      correct: results.filter(r => r.isCorrect).length,
      needsUpdate: needsUpdate.length,
      updated: updated.length,
      failed: errors.length,
      expectedPricesWithVAT,
      expectedPricesWithoutVAT,
      results,
      updated: updated.length > 0 ? updated : undefined,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Failed to check SI-AISTI220 prices:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to check product prices",
      },
      { status: 500 }
    );
  }
}
