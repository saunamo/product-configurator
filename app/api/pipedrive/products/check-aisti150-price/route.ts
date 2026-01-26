import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated, updateProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/check-aisti150-price
 * Check and update the price for SI-AISTI150 product across all country variants
 * Expected price with VAT: 7500€
 * Calculates VAT-less price based on each country's tax rate
 */
export async function POST(request: NextRequest) {
  try {
    const SKU = "SI-AISTI150";
    const expectedPriceWithVAT = 7500; // Expected price with VAT in EUR

    // Tax rates by country code
    const taxRates: Record<string, number> = {
      PT: 23, // 23% VAT
      UK: 20, // 20% VAT
      EN: 23, // 23% VAT
      FR: 20, // 20% VAT
      IT: 22, // 22% VAT
      ES: 21, // 21% VAT
    };

    // Calculate VAT-less prices for each country
    const expectedPricesByCountry: Record<string, number> = {};
    for (const [country, taxRate] of Object.entries(taxRates)) {
      const priceWithoutVAT = expectedPriceWithVAT / (1 + taxRate / 100);
      expectedPricesByCountry[country] = Math.round(priceWithoutVAT * 100) / 100; // Round to 2 decimals
    }

    console.log(`🔍 Searching for products with SKU: ${SKU}`);
    console.log(`💰 Expected price with VAT: ${expectedPriceWithVAT}€`);
    console.log(`💰 Expected VAT-less prices by country:`, expectedPricesByCountry);

    // Search for all products (we'll filter by SKU)
    const allProducts = await getAllProductsPaginated();
    
    // Find products with the SKU
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a"; // Pipedrive SKU field key
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
      const currentTax = product.tax || 0;

      // Determine country from product code
      let country: string | null = null;
      if (productCode === "PT") country = "PT";
      else if (productCode === "UK") country = "UK";
      else if (productCode === "EN") country = "EN";
      else if (productCode === "FR") country = "FR";
      else if (productCode === "IT") country = "IT";
      else if (productCode === "ES") country = "ES";

      if (!country || !expectedPricesByCountry[country]) {
        errors.push({
          productId,
          productName,
          productCode,
          error: `Unknown country code: ${productCode}`,
        });
        continue;
      }

      const expectedPrice = expectedPricesByCountry[country];
      const expectedTaxRate = taxRates[country];
      
      // Calculate current price with VAT
      const currentPriceWithVAT = currentPrice * (1 + currentTax / 100);
      
      // Check if price is correct (allow small rounding differences)
      const priceDifference = Math.abs(currentPriceWithVAT - expectedPriceWithVAT);
      const isPriceCorrect = priceDifference < 1; // Allow 1€ difference for rounding
      const isTaxCorrect = Math.abs(currentTax - expectedTaxRate) < 0.1;

      if (!isPriceCorrect || !isTaxCorrect) {
        needsUpdate.push({
          productId,
          productName,
          country,
          currentPrice,
          currentTax,
          currentPriceWithVAT: Math.round(currentPriceWithVAT * 100) / 100,
          expectedPrice,
          expectedTaxRate,
          expectedPriceWithVAT,
        });
      }

      results.push({
        productId,
        productName,
        country,
        currentPrice,
        currentTax: `${currentTax}%`,
        currentPriceWithVAT: Math.round(currentPriceWithVAT * 100) / 100,
        expectedPrice,
        expectedTaxRate: `${expectedTaxRate}%`,
        expectedPriceWithVAT,
        isCorrect: isPriceCorrect && isTaxCorrect,
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
              currency: "EUR",
            },
          ],
          tax: product.expectedTaxRate,
        });

        updated.push({
          productId: product.productId,
          productName: product.productName,
          country: product.country,
          oldPrice: product.currentPrice,
          newPrice: product.expectedPrice,
          oldTax: `${product.currentTax}%`,
          newTax: `${product.expectedTaxRate}%`,
          success: true,
        });

        console.log(`✅ Updated ${product.productName} (${product.country}): ${product.currentPrice}€ → ${product.expectedPrice}€ (${product.expectedTaxRate}% VAT = ${product.expectedPriceWithVAT}€)`);

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
      expectedPriceWithVAT: expectedPriceWithVAT,
      expectedPricesByCountry,
      totalProducts: matchingProducts.length,
      correct: results.filter(r => r.isCorrect).length,
      needsUpdate: needsUpdate.length,
      updated: updated.length,
      failed: errors.length,
      results,
      updated: updated.length > 0 ? updated : undefined,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Failed to check SI-AISTI150 prices:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to check product prices",
      },
      { status: 500 }
    );
  }
}
