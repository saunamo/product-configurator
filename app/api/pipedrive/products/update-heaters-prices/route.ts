import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated, updateProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/update-heaters-prices
 * Update heater product prices - use same numeric price for EUR and GBP (no conversion)
 */
export async function POST(request: NextRequest) {
  try {
    // Heater products with base prices (same for GBP and EUR)
    const heaters = [
      { name: "Electric Heater Aava 9.4kW", basePrice: 655.00, sku: "ACC-AAVA-3" },
      { name: "Electric Heater Aava 7.4kW", basePrice: 625.00, sku: "ACC-AAVA-2" },
      { name: "Electric Heater Aava 4.7kW", basePrice: 595.00, sku: "ACC-AAVA-1" },
      { name: "Electric Heater Kajo 10.5kW", basePrice: 1550.00, sku: "ACC-KAJO105" },
      { name: "Electric Heater Kajo 9kW", basePrice: 1275.00, sku: "ACC-KAJO9" },
      { name: "Electric Heater Kajo 6.6kW", basePrice: 1050.00, sku: "ACC-KAJO66" },
      { name: "Electric Heater Taika 10.5kW", basePrice: 2950.00, sku: "ACC-TAIKA105" },
      { name: "Electric Heater Taika 9kW", basePrice: 2500.00, sku: "ACC-TAIKA9" },
      { name: "Electric Heater Taika 6.6kW", basePrice: 1975.00, sku: "ACC-TAIKA66" },
    ];

    // Country configurations
    const countries = [
      { code: "PT", taxRate: 23, currency: "EUR" },
      { code: "UK", taxRate: 20, currency: "GBP" },
      { code: "EN", taxRate: 23, currency: "EUR" },
      { code: "FR", taxRate: 20, currency: "EUR" },
      { code: "IT", taxRate: 22, currency: "EUR" },
      { code: "ES", taxRate: 21, currency: "EUR" },
      { code: "US", taxRate: 0, currency: "EUR" },
    ];

    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";
    const results = [];
    const errors = [];

    // Get all products (with timeout handling)
    console.log("🔍 Fetching all products from Pipedrive...");
    let allProducts: any[] = [];
    try {
      allProducts = await getAllProductsPaginated();
      console.log(`✅ Fetched ${allProducts.length} products`);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch products: ${error.message}`,
        },
        { status: 500 }
      );
    }

    // Find and update heater products
    for (const heater of heaters) {
      for (const country of countries) {
        // Calculate VAT-less price (same numeric price for all currencies)
        const priceWithVAT = heater.basePrice;
        const priceWithoutVAT = priceWithVAT / (1 + country.taxRate / 100);
        const vatlessPrice = Math.round(priceWithoutVAT * 100) / 100;

        // Find the product
        const product = allProducts.find((p: any) => {
          const productSku = p[SKU_FIELD_KEY] || p.sku || "";
          const productCode = p.code || "";
          return productSku === heater.sku && productCode === country.code;
        });

        if (!product) {
          errors.push({
            heater: heater.name,
            sku: heater.sku,
            country: country.code,
            error: "Product not found",
          });
          continue;
        }

        const productId = product.id;
        const productName = product.name || `Product ${productId}`;
        const currentPrice = product.prices?.[0]?.price || 0;
        const currentCurrency = product.prices?.[0]?.currency || "EUR";

        // Check if update is needed
        const priceNeedsUpdate = Math.abs(currentPrice - vatlessPrice) > 0.01;
        const currencyNeedsUpdate = currentCurrency !== country.currency;
        const taxNeedsUpdate = Math.abs((product.tax || 0) - country.taxRate) > 0.1;

        if (priceNeedsUpdate || currencyNeedsUpdate || taxNeedsUpdate) {
          try {
            await updateProduct(productId, {
              prices: [
                {
                  price: vatlessPrice,
                  currency: country.currency,
                },
              ],
              tax: country.taxRate,
            });

            results.push({
              heater: heater.name,
              sku: heater.sku,
              country: country.code,
              productId: productId,
              oldPrice: currentPrice,
              oldCurrency: currentCurrency,
              oldTax: `${product.tax || 0}%`,
              newPrice: vatlessPrice,
              newCurrency: country.currency,
              newTax: `${country.taxRate}%`,
              priceWithVAT: priceWithVAT,
              success: true,
            });

            console.log(`✅ Updated ${productName} (${country.code}): ${currentPrice} ${currentCurrency} → ${vatlessPrice} ${country.currency} (${country.taxRate}% VAT = ${priceWithVAT} ${country.currency})`);

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error: any) {
            errors.push({
              heater: heater.name,
              sku: heater.sku,
              country: country.code,
              error: error.message || "Failed to update product",
            });
            console.error(`❌ Failed to update ${productName} (${country.code}):`, error);
          }
        } else {
          results.push({
            heater: heater.name,
            sku: heater.sku,
            country: country.code,
            productId: productId,
            price: vatlessPrice,
            currency: country.currency,
            taxRate: `${country.taxRate}%`,
            priceWithVAT: priceWithVAT,
            alreadyCorrect: true,
          });
        }
      }
    }

    const updated = results.filter(r => !r.alreadyCorrect);
    const alreadyCorrect = results.filter(r => r.alreadyCorrect);

    return NextResponse.json({
      success: true,
      totalHeaters: heaters.length,
      totalCountries: countries.length,
      totalProducts: heaters.length * countries.length,
      updated: updated.length,
      alreadyCorrect: alreadyCorrect.length,
      failed: errors.length,
      results: updated,
      alreadyCorrect: alreadyCorrect.length > 0 ? alreadyCorrect : undefined,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Failed to update heater prices:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update heater prices",
      },
      { status: 500 }
    );
  }
}
