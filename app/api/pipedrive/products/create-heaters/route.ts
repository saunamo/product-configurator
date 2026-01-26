import { NextRequest, NextResponse } from "next/server";
import { createProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/create-heaters
 * Create electric heater products for all countries
 * Base prices are in GBP, will be converted to EUR for non-UK countries
 */
export async function POST(request: NextRequest) {
  try {
    // Heater products with base prices in GBP
    const heaters = [
      { name: "Electric Heater Aava 9.4kW", basePriceGBP: 655.00, sku: "ACC-AAVA-3" },
      { name: "Electric Heater Aava 7.4kW", basePriceGBP: 625.00, sku: "ACC-AAVA-2" },
      { name: "Electric Heater Aava 4.7kW", basePriceGBP: 595.00, sku: "ACC-AAVA-1" },
      { name: "Electric Heater Kajo 10.5kW", basePriceGBP: 1550.00, sku: "ACC-KAJO105" },
      { name: "Electric Heater Kajo 9kW", basePriceGBP: 1275.00, sku: "ACC-KAJO9" },
      { name: "Electric Heater Kajo 6.6kW", basePriceGBP: 1050.00, sku: "ACC-KAJO66" },
      { name: "Electric Heater Taika 10.5kW", basePriceGBP: 2950.00, sku: "ACC-TAIKA105" },
      { name: "Electric Heater Taika 9kW", basePriceGBP: 2500.00, sku: "ACC-TAIKA9" },
      { name: "Electric Heater Taika 6.6kW", basePriceGBP: 1975.00, sku: "ACC-TAIKA66" },
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

    // GBP to EUR conversion rate (approximate, adjust if needed)
    const GBP_TO_EUR_RATE = 1.17; // You may want to use a real-time rate

    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";
    const results = [];
    const errors = [];

    // Create products for each heater and each country
    for (const heater of heaters) {
      for (const country of countries) {
        // Calculate price in the country's currency
        let priceWithVAT: number;
        if (country.code === "UK") {
          // UK keeps GBP price
          priceWithVAT = heater.basePriceGBP;
        } else {
          // Convert GBP to EUR for other countries
          priceWithVAT = Math.round((heater.basePriceGBP * GBP_TO_EUR_RATE) * 100) / 100;
        }

        // Calculate VAT-less price
        const priceWithoutVAT = priceWithVAT / (1 + country.taxRate / 100);
        const vatlessPrice = Math.round(priceWithoutVAT * 100) / 100;

        // Create product name following convention: "Product Name | SKU"
        const productName = `${heater.name} | ${heater.sku}`;

        try {
          const productData = {
            name: productName,
            code: country.code,
            [SKU_FIELD_KEY]: heater.sku,
            prices: [
              {
                price: vatlessPrice,
                currency: country.currency,
              },
            ],
            tax: country.taxRate,
            unit: "piece",
          };

          const result = await createProduct(productData);
          
          results.push({
            heater: heater.name,
            sku: heater.sku,
            country: country.code,
            productId: result.data.id,
            productName: productName,
            vatlessPrice: vatlessPrice,
            currency: country.currency,
            taxRate: `${country.taxRate}%`,
            priceWithVAT: priceWithVAT,
            success: true,
          });

          console.log(`✅ Created ${productName} (${country.code}): ${vatlessPrice} ${country.currency} (${country.taxRate}% VAT = ${priceWithVAT} ${country.currency})`);

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error: any) {
          errors.push({
            heater: heater.name,
            sku: heater.sku,
            country: country.code,
            error: error.message || "Failed to create product",
          });
          console.error(`❌ Failed to create ${productName} (${country.code}):`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalHeaters: heaters.length,
      totalCountries: countries.length,
      totalProducts: heaters.length * countries.length,
      created: results.length,
      failed: errors.length,
      results: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Failed to create heater products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create heater products",
      },
      { status: 500 }
    );
  }
}
