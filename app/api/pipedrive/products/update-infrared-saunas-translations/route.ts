import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated, updateProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/update-infrared-saunas-translations
 * Update existing infrared sauna products to have translated "Infrared" in their names
 */
export async function POST(request: NextRequest) {
  try {
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";

    // Translation mappings by country code
    const translations: Record<string, string> = {
      PT: "Infravermelho",
      UK: "Infrared",
      EN: "Infrared",
      US: "Infrared",
      ES: "Infrarrojo",
      FR: "Infrarouge",
      IT: "Infrarosso",
    };

    // SKUs to update
    const targetSkus = ["AURA110", "AURA150"];

    console.log("🔍 Fetching all products from Pipedrive...");
    const allProducts = await getAllProductsPaginated();
    
    // Filter for infrared sauna products
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

      // Get translation for this country
      const translation = translations[countryCode];
      
      if (!translation) {
        errors.push({
          productId,
          productName,
          sku: productSku,
          country: countryCode,
          error: `No translation found for country code: ${countryCode}`,
        });
        continue;
      }

      // Check if name already has the translation (to avoid unnecessary updates)
      if (productName.includes(translation)) {
        results.push({
          productId,
          productName,
          sku: productSku,
          country: countryCode,
          translatedName: productName,
          status: "already_translated",
          success: true,
        });
        continue;
      }

      // Replace "Infrared" with the translated version
      const translatedName = productName.replace(/Infrared/gi, translation);

      // If name didn't change, skip
      if (translatedName === productName) {
        results.push({
          productId,
          productName,
          sku: productSku,
          country: countryCode,
          translatedName: productName,
          status: "no_change_needed",
          success: true,
        });
        continue;
      }

      try {
        await updateProduct(productId, {
          name: translatedName,
        });

        results.push({
          productId,
          productName,
          sku: productSku,
          country: countryCode,
          translatedName,
          oldName: productName,
          status: "updated",
          success: true,
        });

        console.log(`✅ Updated ${productName} (${countryCode}) → ${translatedName}`);

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
      message: `Updated ${results.filter(r => r.status === "updated").length} product(s) with translated names`,
      results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: infraredProducts.length,
        updated: results.filter(r => r.status === "updated").length,
        alreadyTranslated: results.filter(r => r.status === "already_translated").length,
        noChange: results.filter(r => r.status === "no_change_needed").length,
        failed: errors.length,
      },
    });
  } catch (error: any) {
    console.error("Failed to update infrared sauna product translations:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update products",
      },
      { status: 500 }
    );
  }
}
