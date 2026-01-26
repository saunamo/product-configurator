import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated, updateProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/update-infrared-saunas-prices
 * Update prices for AURA110 and AURA150 products in all countries except UK
 * Uses same numeric price for GBP and EUR (no conversion)
 */
export async function POST(request: NextRequest) {
  try {
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";

    // Infrared sauna products with prices (with VAT)
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

    // Country configurations (excluding UK - will be updated separately)
    const countries = [
      { code: "PT", taxRate: 23, currency: "EUR" },
      { code: "EN", taxRate: 23, currency: "EUR" },
      { code: "ES", taxRate: 21, currency: "EUR" },
      { code: "FR", taxRate: 20, currency: "EUR" },
      { code: "IT", taxRate: 22, currency: "EUR" },
      { code: "US", taxRate: 0, currency: "EUR" },
    ];

    console.log("🔍 Fetching all products from Pipedrive...");
    const allProducts = await getAllProductsPaginated();
    
    // Filter for infrared sauna products
    const targetSkus = ["AURA110", "AURA150"];
    const infraredProducts = allProducts.filter((p: any) => {
      const sku = (p[SKU_FIELD_KEY] || p.sku || "").toUpperCase();
      return targetSkus.includes(sku);
    });

    console.log(`✅ Found ${infraredProducts.length} infrared sauna products to update`);

    const results = [];
    const errors = [];

    for (const product of infraredProducts) {
      const productId = product.id;
      const productName = product.name || "";
      const productSku = (product[SKU_FIELD_KEY] || product.sku || "").toUpperCase();
      const countryCode = (product.code || "").toUpperCase();

      // Skip UK products (will be updated separately)
      if (countryCode === "UK") {
        results.push({
          productId,
          productName,
          sku: productSku,
          country: countryCode,
          status: "skipped",
          reason: "UK prices will be updated separately",
          success: true,
        });
        continue;
      }

      // Find matching sauna config
      const saunaConfig = saunas.find(s => s.sku.toUpperCase() === productSku);
      if (!saunaConfig) {
        errors.push({
          productId,
          productName,
          sku: productSku,
          country: countryCode,
          error: `No price configuration found for SKU: ${productSku}`,
          success: false,
        });
        continue;
      }

      // Find matching country config
      const countryConfig = countries.find(c => c.code.toUpperCase() === countryCode);
      if (!countryConfig) {
        errors.push({
          productId,
          productName,
          sku: productSku,
          country: countryCode,
          error: `No country configuration found for code: ${countryCode}`,
          success: false,
        });
        continue;
      }

      // Calculate VAT-less price
      const priceWithVAT = saunaConfig.priceWithVAT;
      const priceWithoutVAT = priceWithVAT / (1 + countryConfig.taxRate / 100);
      const vatlessPrice = Math.round(priceWithoutVAT * 100) / 100;

      try {
        await updateProduct(productId, {
          prices: [
            {
              price: vatlessPrice,
              currency: countryConfig.currency,
            },
          ],
          tax: countryConfig.taxRate,
        });

        results.push({
          productId,
          productName,
          sku: productSku,
          country: countryCode,
          oldPrice: product.prices?.[0]?.price || "unknown",
          newPrice: vatlessPrice,
          currency: countryConfig.currency,
          taxRate: `${countryConfig.taxRate}%`,
          priceWithVAT: priceWithVAT,
          status: "updated",
          success: true,
        });

        console.log(`✅ Updated ${productName} (${countryCode}): ${vatlessPrice} ${countryConfig.currency} (${countryConfig.taxRate}% VAT = ${priceWithVAT} ${countryConfig.currency})`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: any) {
        errors.push({
          productId,
          productName,
          sku: productSku,
          country: countryCode,
          error: error.message || "Unknown error",
          success: false,
        });
        console.error(`❌ Failed to update ${productName} (${productSku}) for ${countryCode}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${results.filter(r => r.status === "updated").length} product(s) with corrected prices`,
      results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: infraredProducts.length,
        updated: results.filter(r => r.status === "updated").length,
        skipped: results.filter(r => r.status === "skipped").length,
        failed: errors.length,
        byCountry: countries.reduce((acc, country) => {
          acc[country.code] = results.filter(r => r.country === country.code && r.status === "updated").length;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error: any) {
    console.error("Failed to update infrared sauna product prices:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update products",
      },
      { status: 500 }
    );
  }
}
