import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated, createProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/create-cariitti-led-variants
 * Create 1m and 3m versions of Cariitti Linear LED for all countries where 2m version exists
 */
export async function POST(request: NextRequest) {
  try {
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";

    // Product variants to create
    const variants = [
      { 
        name: "Cariitti Linear LED 1m", 
        sku: "ACC-CAR-LED2", 
        priceWithVAT: 275.00 
      },
      { 
        name: "Cariitti Linear LED 3m", 
        sku: "ACC-CAR-LED4", 
        priceWithVAT: 425.00 
      },
    ];

    // Country configurations with tax rates
    const countryConfigs: Record<string, { taxRate: number; currency: string }> = {
      PT: { taxRate: 23, currency: "EUR" },
      UK: { taxRate: 20, currency: "GBP" },
      EN: { taxRate: 23, currency: "EUR" },
      US: { taxRate: 0, currency: "EUR" },
      ES: { taxRate: 21, currency: "EUR" },
      FR: { taxRate: 20, currency: "EUR" },
      IT: { taxRate: 22, currency: "EUR" },
    };

    console.log("🔍 Fetching all products from Pipedrive...");
    const allProducts = await getAllProductsPaginated();
    
    // Find the 2m version to see which countries it exists for
    // The 2m version might use ACC-CAR-LED2 or ACC-CAR-LED3, so check by name pattern
    const existing2mProducts = allProducts.filter((p: any) => {
      const name = (p.name || "").toLowerCase();
      const sku = (p[SKU_FIELD_KEY] || p.sku || "").toUpperCase();
      // Match 2m version by name containing "2m" or "2 m"
      return (name.includes("2m") || name.includes("2 m")) && name.includes("cariitti");
    });

    console.log(`✅ Found ${existing2mProducts.length} existing 2m version(s)`);

    // Get unique country codes from existing 2m products
    const existingCountries = new Set<string>();
    existing2mProducts.forEach((p: any) => {
      const countryCode = (p.code || "").toUpperCase();
      if (countryCode && countryConfigs[countryCode]) {
        existingCountries.add(countryCode);
      }
    });

    console.log(`📍 Found existing 2m products in countries: ${Array.from(existingCountries).join(", ")}`);

    if (existingCountries.size === 0) {
      return NextResponse.json({
        success: false,
        error: "No existing 2m version found in Pipedrive. Please create the 2m version first.",
      }, { status: 400 });
    }

    const results = [];
    const errors = [];
    const skipped = [];

    // Create 1m and 3m versions for each country where 2m exists
    for (const variant of variants) {
      for (const countryCode of existingCountries) {
        const countryConfig = countryConfigs[countryCode];
        
        // Check if this variant already exists for this country
        const existingProduct = allProducts.find((p: any) => {
          const sku = (p[SKU_FIELD_KEY] || p.sku || "").toUpperCase();
          const code = (p.code || "").toUpperCase();
          return sku === variant.sku.toUpperCase() && code === countryCode;
        });

        if (existingProduct) {
          skipped.push({
            variant: variant.name,
            sku: variant.sku,
            country: countryCode,
            productId: existingProduct.id,
            productName: existingProduct.name,
            reason: "already_exists",
          });
          continue;
        }

        // Use the same numeric price for both GBP and EUR (no conversion)
        const priceWithVAT = variant.priceWithVAT;

        // Calculate VAT-less price
        const priceWithoutVAT = priceWithVAT / (1 + countryConfig.taxRate / 100);
        const vatlessPrice = Math.round(priceWithoutVAT * 100) / 100;

        // Create product name following convention: "Product Name | SKU"
        const productName = `${variant.name} | ${variant.sku}`;

        try {
          const productData = {
            name: productName,
            code: countryCode,
            [SKU_FIELD_KEY]: variant.sku,
            prices: [
              {
                price: vatlessPrice,
                currency: countryConfig.currency,
              },
            ],
            tax: countryConfig.taxRate,
            unit: "piece",
          };

          const result = await createProduct(productData);
          
          results.push({
            variant: variant.name,
            sku: variant.sku,
            country: countryCode,
            productId: result.data.id,
            productName: productName,
            vatlessPrice: vatlessPrice,
            currency: countryConfig.currency,
            taxRate: `${countryConfig.taxRate}%`,
            priceWithVAT: priceWithVAT,
            success: true,
          });

          console.log(`✅ Created ${productName} (${countryCode}): ${vatlessPrice} ${countryConfig.currency} (${countryConfig.taxRate}% VAT = ${priceWithVAT} ${countryConfig.currency})`);

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error: any) {
          errors.push({
            variant: variant.name,
            sku: variant.sku,
            country: countryCode,
            error: error.message || "Unknown error",
            success: false,
          });
          console.error(`❌ Failed to create ${variant.name} (${variant.sku}) for ${countryCode}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${results.length} Cariitti LED variant product(s) across ${existingCountries.size} countries`,
      results,
      skipped: skipped.length > 0 ? skipped : undefined,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        totalVariants: variants.length,
        totalCountries: existingCountries.size,
        totalExpected: variants.length * existingCountries.size,
        created: results.length,
        skipped: skipped.length,
        failed: errors.length,
        byCountry: Array.from(existingCountries).reduce((acc, country) => {
          acc[country] = results.filter(r => r.country === country).length;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error: any) {
    console.error("Failed to create Cariitti LED variant products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create products",
      },
      { status: 500 }
    );
  }
}
