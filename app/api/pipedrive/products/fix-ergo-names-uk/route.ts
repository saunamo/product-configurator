import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated, updateProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/fix-ergo-names-uk
 * Fix incorrectly renamed Ergo products in UK
 * Only CT-ERGO-THE should be "Ice bath Ergo", all others should be "Ergo Outdoor Sauna" variants
 */
export async function POST(request: NextRequest) {
  try {
    const UK_TAX_RATE = 20; // 20% VAT for UK
    const UK_CURRENCY = "GBP";
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";

    // Correct product mappings for Ergo products with original names
    const correctErgoProducts: Array<{
      sku: string;
      correctName: string;
      priceWithVATGBP?: number; // Only specify if price needs to be updated
    }> = [
      // Ice Bath (correct - should stay as is)
      { sku: "CT-ERGO-THE", correctName: "Ice bath Ergo" },
      
      // Outdoor Sauna Ergo products (correct names from the image)
      { sku: "ERGO-150-THE", correctName: "Ergo Outdoor Sauna 1500 × 2005 mm | ERGO-150-THE" },
      { sku: "ERGO-150-S", correctName: "Ergo Outdoor Sauna 1500 × 2005 mm | ERGO-150-S" },
      { sku: "ERGO-180-THE", correctName: "Ergo Outdoor Sauna 1800 × 2005 mm | ERGO-180-THE" },
      { sku: "ERGO-180-SPR", correctName: "Ergo Outdoor Sauna 1800 × 2005 mm | ERGO-180-SPR" },
      { sku: "ERGO-220-SPR", correctName: "Ergo Outdoor Sauna 2200 × 2005 mm | ERGO-220-SPR" },
      // ERGO-220-THE needs price update: £7,750.00 with VAT
      { sku: "ERGO-220-THE", correctName: "Ergo Outdoor Sauna 2200 × 2005 mm | ERGO-220-THE", priceWithVATGBP: 7750 },
    ];

    console.log("🔍 Fetching all UK products from Pipedrive...");
    const allProducts = await getAllProductsPaginated();
    
    // Filter UK products
    const ukProducts = allProducts.filter((p: any) => (p.code || "").toUpperCase() === "UK");
    console.log(`✅ Found ${ukProducts.length} UK products`);

    // Find all Ergo products in UK
    const ergoProducts = ukProducts.filter((p: any) => {
      const name = (p.name || "").toUpperCase();
      const sku = (p[SKU_FIELD_KEY] || p.sku || "").toUpperCase();
      return name.includes("ERGO") || sku.includes("ERGO");
    });

    console.log(`🔍 Found ${ergoProducts.length} Ergo products in UK`);

    const results = [];
    const errors = [];
    const updated = [];
    const skipped = [];

    // Process each Ergo product
    for (const product of ergoProducts) {
      const productId = product.id;
      const currentName = product.name || "";
      const productSku = (product[SKU_FIELD_KEY] || product.sku || "").toUpperCase();
      const currentPrice = product.prices?.[0]?.price || 0;
      const currentCurrency = product.prices?.[0]?.currency || "EUR";

      // Find the correct mapping for this SKU
      const correctMapping = correctErgoProducts.find(
        (m) => m.sku.toUpperCase() === productSku
      );

      if (!correctMapping) {
        skipped.push({
          productId,
          sku: productSku,
          name: currentName,
          reason: "No mapping found for this SKU",
        });
        console.log(`⚠️  Skipped ${productSku}: ${currentName} (no mapping found)`);
        continue;
      }

      // Determine if we need to update price
      let vatlessPrice: number;
      let priceWithVAT: number;
      let needsPriceUpdate = false;
      let needsCurrencyUpdate = currentCurrency !== UK_CURRENCY;

      if (correctMapping.priceWithVATGBP) {
        // This product has a specified price that needs updating
        priceWithVAT = correctMapping.priceWithVATGBP;
        vatlessPrice = Math.round((priceWithVAT / (1 + UK_TAX_RATE / 100)) * 100) / 100;
        needsPriceUpdate = Math.abs(currentPrice - vatlessPrice) > 0.01 || needsCurrencyUpdate;
      } else {
        // Keep current price, just ensure currency is GBP
        vatlessPrice = currentPrice;
        priceWithVAT = Math.round(vatlessPrice * (1 + UK_TAX_RATE / 100) * 100) / 100;
        needsPriceUpdate = needsCurrencyUpdate;
      }

      const needsNameUpdate = currentName !== correctMapping.correctName;

      if (needsNameUpdate || needsPriceUpdate) {
        try {
          await updateProduct(productId, {
            name: correctMapping.correctName,
            prices: [
              {
                price: vatlessPrice,
                currency: UK_CURRENCY,
              },
            ],
            tax: UK_TAX_RATE,
          });

          updated.push({
            productId,
            sku: productSku,
            oldName: currentName,
            newName: correctMapping.correctName,
            oldPrice: currentPrice,
            oldCurrency: currentCurrency,
            newPrice: vatlessPrice,
            newCurrency: UK_CURRENCY,
            priceWithVAT: priceWithVAT,
            nameUpdated: needsNameUpdate,
            priceUpdated: needsPriceUpdate,
            success: true,
          });

          const priceInfo = correctMapping.priceWithVATGBP 
            ? `${currentPrice} ${currentCurrency} → ${vatlessPrice} ${UK_CURRENCY} (${UK_TAX_RATE}% VAT = ${priceWithVAT} ${UK_CURRENCY})`
            : `${currentPrice} ${currentCurrency} → ${vatlessPrice} ${UK_CURRENCY} (price kept, currency updated)`;

          console.log(
            `✅ Fixed ${productSku}: "${currentName}" → "${correctMapping.correctName}", ${priceInfo}`
          );

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error: any) {
          errors.push({
            productId,
            sku: productSku,
            name: currentName,
            error: error.message || "Failed to update product",
          });
          console.error(`❌ Failed to fix ${productSku}:`, error);
        }
      } else {
        results.push({
          productId,
          sku: productSku,
          name: currentName,
          price: vatlessPrice,
          currency: UK_CURRENCY,
          alreadyCorrect: true,
        });
        console.log(`✓ ${productSku}: ${currentName} (already correct)`);
      }
    }

    return NextResponse.json({
      success: true,
      totalErgoProducts: ergoProducts.length,
      fixed: updated.length,
      alreadyCorrect: results.length,
      skipped: skipped.length,
      failed: errors.length,
      updated: updated,
      alreadyCorrect: results.length > 0 ? results : undefined,
      skipped: skipped.length > 0 ? skipped : undefined,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Failed to fix Ergo product names:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fix Ergo product names",
      },
      { status: 500 }
    );
  }
}
