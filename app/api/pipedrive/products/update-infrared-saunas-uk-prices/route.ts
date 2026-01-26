import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated, updateProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/update-infrared-saunas-uk-prices
 * Update prices for AURA110 and AURA150 products in UK only
 */
export async function POST(request: NextRequest) {
  try {
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";

    // Infrared sauna products with UK prices (with VAT)
    const saunas = [
      { 
        name: "Infrared Sauna Aura 110", 
        sku: "AURA110", 
        priceWithVAT: 4750.00 
      },
      { 
        name: "Infrared Sauna Aura 150", 
        sku: "AURA150", 
        priceWithVAT: 5750.00 
      },
    ];

    // UK configuration
    const ukConfig = {
      code: "UK",
      taxRate: 20,
      currency: "GBP",
    };

    console.log("🔍 Fetching all products from Pipedrive...");
    const allProducts = await getAllProductsPaginated();
    
    // Filter for infrared sauna products in UK only
    const targetSkus = ["AURA110", "AURA150"];
    const ukProducts = allProducts.filter((p: any) => {
      const sku = (p[SKU_FIELD_KEY] || p.sku || "").toUpperCase();
      const countryCode = (p.code || "").toUpperCase();
      return targetSkus.includes(sku) && countryCode === "UK";
    });

    console.log(`✅ Found ${ukProducts.length} UK infrared sauna products to update`);

    const results = [];
    const errors = [];

    for (const product of ukProducts) {
      const productId = product.id;
      const productName = product.name || "";
      const productSku = (product[SKU_FIELD_KEY] || product.sku || "").toUpperCase();

      // Find matching sauna config
      const saunaConfig = saunas.find(s => s.sku.toUpperCase() === productSku);
      if (!saunaConfig) {
        errors.push({
          productId,
          productName,
          sku: productSku,
          country: "UK",
          error: `No price configuration found for SKU: ${productSku}`,
          success: false,
        });
        continue;
      }

      // Calculate VAT-less price
      const priceWithVAT = saunaConfig.priceWithVAT;
      const priceWithoutVAT = priceWithVAT / (1 + ukConfig.taxRate / 100);
      const vatlessPrice = Math.round(priceWithoutVAT * 100) / 100;

      try {
        await updateProduct(productId, {
          prices: [
            {
              price: vatlessPrice,
              currency: ukConfig.currency,
            },
          ],
          tax: ukConfig.taxRate,
        });

        results.push({
          productId,
          productName,
          sku: productSku,
          country: "UK",
          oldPrice: product.prices?.[0]?.price || "unknown",
          newPrice: vatlessPrice,
          currency: ukConfig.currency,
          taxRate: `${ukConfig.taxRate}%`,
          priceWithVAT: priceWithVAT,
          status: "updated",
          success: true,
        });

        console.log(`✅ Updated ${productName} (UK): ${vatlessPrice} ${ukConfig.currency} (${ukConfig.taxRate}% VAT = ${priceWithVAT} ${ukConfig.currency})`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: any) {
        errors.push({
          productId,
          productName,
          sku: productSku,
          country: "UK",
          error: error.message || "Unknown error",
          success: false,
        });
        console.error(`❌ Failed to update ${productName} (${productSku}) for UK:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${results.filter(r => r.status === "updated").length} UK product(s) with corrected prices`,
      results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: ukProducts.length,
        updated: results.filter(r => r.status === "updated").length,
        failed: errors.length,
      },
    });
  } catch (error: any) {
    console.error("Failed to update UK infrared sauna product prices:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update products",
      },
      { status: 500 }
    );
  }
}
