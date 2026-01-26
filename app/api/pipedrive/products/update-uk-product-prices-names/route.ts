import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated, updateProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/update-uk-product-prices-names
 * Update UK product prices and names based on current website prices
 */
export async function POST(request: NextRequest) {
  try {
    const UK_TAX_RATE = 20; // 20% VAT for UK
    const UK_CURRENCY = "GBP";

    // Product mappings: SKU pattern or name pattern -> { newName, priceWithVAT }
    // Note: Cube 300 = Cubus
    const productUpdates: Array<{
      skuPattern?: string;
      namePattern?: string;
      newName: string;
      priceWithVAT: number;
    }> = [
      // Outdoor Saunas
      { skuPattern: "CUBE125", namePattern: "Cube 125", newName: "Outdoor Sauna Cube 125", priceWithVAT: 7750 },
      { skuPattern: "AISTI220", namePattern: "Aisti 220", newName: "Outdoor Sauna Cube 220", priceWithVAT: 9750 },
      { skuPattern: "AISTI150", namePattern: "Aisti 150", newName: "Outdoor Sauna Cube 125", priceWithVAT: 7750 },
      { skuPattern: "CUBUS", namePattern: "Cubus", newName: "Outdoor Sauna Cubus", priceWithVAT: 10750 },
      { skuPattern: "HIKI", namePattern: "Hiki S", newName: "Outdoor Sauna Hiki S", priceWithVAT: 8850 },
      { skuPattern: "HIKI", namePattern: "Hiki L", newName: "Outdoor Sauna Hiki L", priceWithVAT: 10950 },
      { skuPattern: "BARREL", namePattern: "Barrel 220", newName: "Outdoor Sauna Barrel 220", priceWithVAT: 7750 },
      { skuPattern: "BARREL", namePattern: "Barrel 280", newName: "Outdoor Sauna Barrel 280 Deluxe", priceWithVAT: 9950 },
      
      // Hot Tubs
      { skuPattern: "CUBE-200", namePattern: "Cube 200", newName: "Hot tub Cube 200", priceWithVAT: 6950 },
      { skuPattern: "THERMA", namePattern: "Therma 200", newName: "Hot tub Therma 200", priceWithVAT: 6950 },
      { skuPattern: "THERMA", namePattern: "Therma 220", newName: "Hot tub Therma 220", priceWithVAT: 7250 },
      { skuPattern: "VELLAMO", namePattern: "Vellamo S", newName: "Hot tub Vellamo S", priceWithVAT: 7350 },
      { skuPattern: "VELLAMO", namePattern: "Vellamo M", newName: "Hot tub Vellamo M", priceWithVAT: 7950 },
      { skuPattern: "VELLAMO", namePattern: "Vellamo L", newName: "Hot tub Vellamo L", priceWithVAT: 8250 },
      
      // Ice Baths
      { skuPattern: "ERGO", namePattern: "Ergo", newName: "Ice bath Ergo", priceWithVAT: 5750 },
      { skuPattern: "ICE", namePattern: "Ice Cube", newName: "Ice bath Cube", priceWithVAT: 5750 },
      { skuPattern: "OFURO", namePattern: "Ofuro", newName: "Ice bath Ofuro", priceWithVAT: 6950 },
    ];

    // Calculate VAT-less prices
    const updatesWithPrices = productUpdates.map(update => ({
      ...update,
      vatlessPrice: Math.round((update.priceWithVAT / (1 + UK_TAX_RATE / 100)) * 100) / 100,
    }));

    console.log("🔍 Fetching all UK products from Pipedrive...");
    const allProducts = await getAllProductsPaginated();
    
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";
    
    // Filter UK products
    const ukProducts = allProducts.filter((p: any) => (p.code || "").toUpperCase() === "UK");
    console.log(`✅ Found ${ukProducts.length} UK products`);

    const results = [];
    const errors = [];
    const updated = [];

    // Process each UK product
    for (const product of ukProducts) {
      const productId = product.id;
      const productName = product.name || "";
      const productSku = (product[SKU_FIELD_KEY] || product.sku || "").toUpperCase();
      const currentPrice = product.prices?.[0]?.price || 0;
      const currentCurrency = product.prices?.[0]?.currency || "EUR";
      const currentTax = product.tax || 0;

      // Try to match product - prioritize name pattern matching for better accuracy
      let match: typeof updatesWithPrices[0] | null = null;
      
      // First try to match by name pattern (more specific)
      for (const update of updatesWithPrices) {
        if (update.namePattern && productName.toUpperCase().includes(update.namePattern.toUpperCase())) {
          match = update;
          break;
        }
      }
      
      // If no name match, try SKU pattern
      if (!match) {
        for (const update of updatesWithPrices) {
          if (update.skuPattern && productSku.includes(update.skuPattern.toUpperCase())) {
            match = update;
            break;
          }
        }
      }

      if (!match) {
        // Product not in our update list, skip
        continue;
      }

      const needsPriceUpdate = Math.abs(currentPrice - match.vatlessPrice) > 0.01;
      const needsCurrencyUpdate = currentCurrency !== UK_CURRENCY;
      const needsTaxUpdate = Math.abs(currentTax - UK_TAX_RATE) > 0.1;
      const needsNameUpdate = productName !== match.newName;

      if (needsPriceUpdate || needsCurrencyUpdate || needsTaxUpdate || needsNameUpdate) {
        try {
          await updateProduct(productId, {
            name: match.newName, // Always update name to ensure consistency
            prices: [
              {
                price: match.vatlessPrice,
                currency: UK_CURRENCY,
              },
            ],
            tax: UK_TAX_RATE,
          });

          updated.push({
            productId,
            oldName: productName,
            newName: match.newName,
            sku: productSku,
            oldPrice: currentPrice,
            oldCurrency: currentCurrency,
            oldTax: `${currentTax}%`,
            newPrice: match.vatlessPrice,
            newCurrency: UK_CURRENCY,
            newTax: `${UK_TAX_RATE}%`,
            priceWithVAT: match.priceWithVAT,
            priceUpdated: needsPriceUpdate || needsCurrencyUpdate || needsTaxUpdate,
            nameUpdated: needsNameUpdate,
            success: true,
          });

          console.log(`✅ Updated ${productName} → ${match.newName} (${productSku}): ${currentPrice} ${currentCurrency} → ${match.vatlessPrice} ${UK_CURRENCY} (${UK_TAX_RATE}% VAT = ${match.priceWithVAT} ${UK_CURRENCY})`);

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error: any) {
          errors.push({
            productId,
            productName,
            sku: productSku,
            error: error.message || "Failed to update product",
          });
          console.error(`❌ Failed to update ${productName} (${productSku}):`, error);
        }
      } else {
        results.push({
          productId,
          productName,
          sku: productSku,
          price: match.vatlessPrice,
          currency: UK_CURRENCY,
          taxRate: `${UK_TAX_RATE}%`,
          priceWithVAT: match.priceWithVAT,
          alreadyCorrect: true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalUKProducts: ukProducts.length,
      productsInUpdateList: updatesWithPrices.length,
      updated: updated.length,
      alreadyCorrect: results.length,
      failed: errors.length,
      updated: updated,
      alreadyCorrect: results.length > 0 ? results : undefined,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Failed to update UK product prices and names:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update UK products",
      },
      { status: 500 }
    );
  }
}
