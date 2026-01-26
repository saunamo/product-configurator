import { NextRequest, NextResponse } from "next/server";
import { createProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/create-infrared-saunas
 * Create infrared sauna products for all countries (PT, UK, EN, US, ES, FR, IT)
 * Uses same numeric price for GBP and EUR (no conversion)
 */
export async function POST(request: NextRequest) {
  try {
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";

    // Infrared sauna products with prices in GBP (with VAT)
    const saunas = [
      { 
        name: "Infrared Sauna Aura 110", 
        sku: "AURA110", 
        priceWithVAT: 4250.00 
      },
      { 
        name: "Infrared Sauna Aura 150", 
        sku: "AURA150", 
        priceWithVAT: 4950.00 
      },
    ];

    // Country configurations with translations
    const countries = [
      { code: "PT", taxRate: 23, currency: "EUR", infraredTranslation: "Infravermelho" },
      { code: "UK", taxRate: 20, currency: "GBP", infraredTranslation: "Infrared" },
      { code: "EN", taxRate: 23, currency: "EUR", infraredTranslation: "Infrared" },
      { code: "US", taxRate: 0, currency: "EUR", infraredTranslation: "Infrared" },
      { code: "ES", taxRate: 21, currency: "EUR", infraredTranslation: "Infrarrojo" },
      { code: "FR", taxRate: 20, currency: "EUR", infraredTranslation: "Infrarouge" },
      { code: "IT", taxRate: 22, currency: "EUR", infraredTranslation: "Infrarosso" },
    ];

    const results = [];
    const errors = [];

    // Create products for each sauna and each country
    for (const sauna of saunas) {
      for (const country of countries) {
        // Use the same numeric price for both GBP and EUR (no conversion)
        const priceWithVAT = sauna.priceWithVAT;

        // Calculate VAT-less price
        const priceWithoutVAT = priceWithVAT / (1 + country.taxRate / 100);
        const vatlessPrice = Math.round(priceWithoutVAT * 100) / 100;

        // Translate "Infrared" in the product name for each country
        const translatedName = sauna.name.replace("Infrared", country.infraredTranslation);
        
        // Create product name following convention: "Product Name | SKU"
        const productName = `${translatedName} | ${sauna.sku}`;

        try {
          const productData = {
            name: productName,
            code: country.code,
            [SKU_FIELD_KEY]: sauna.sku,
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
            sauna: sauna.name,
            sku: sauna.sku,
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
            sauna: sauna.name,
            sku: sauna.sku,
            country: country.code,
            error: error.message || "Unknown error",
            success: false,
          });
          console.error(`❌ Failed to create ${sauna.name} (${sauna.sku}) for ${country.code}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${results.length} infrared sauna product(s) across ${countries.length} countries`,
      results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: saunas.length * countries.length,
        created: results.length,
        failed: errors.length,
        byCountry: countries.reduce((acc, country) => {
          acc[country.code] = results.filter(r => r.country === country.code).length;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error: any) {
    console.error("Failed to create infrared sauna products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create products",
      },
      { status: 500 }
    );
  }
}
