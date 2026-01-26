import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated, updateProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/update-uk-products-correct
 * Update UK product names and prices based on correct website data
 * Prices are with VAT, will be converted to VAT-less (20% VAT for UK)
 */
export async function POST(request: NextRequest) {
  try {
    const UK_TAX_RATE = 20; // 20% VAT for UK
    const UK_CURRENCY = "GBP";

    // Correct product data from website (prices are WITH VAT)
    const correctProducts = [
      // Indoor Saunas
      { sku: "SI-AISTI220", name: "Indoor Sauna Thermo Black 220", priceWithVAT: 9500 },
      { sku: "SI-AISTI150", name: "Indoor Sauna Aisti 150", priceWithVAT: 7500 },
      
      // Ice Baths
      { sku: "CT-OFURO", name: "Ice bath Ofuro", priceWithVAT: 6950 },
      { sku: "CT-CUBE-THE", name: "Ice bath Cube", priceWithVAT: 5750 },
      { sku: "CT-ERGO-THE", name: "Ice bath Ergo", priceWithVAT: 5750 },
      
      // Hot Tubs
      { sku: "SPA-VELLAMO-XL", name: "Hot tub Vellamo XL", priceWithVAT: 9150 },
      { sku: "SPA-VELLAMO-L", name: "Hot tub Vellamo L", priceWithVAT: 8250 },
      { sku: "SPA-VELLAMO-M", name: "Hot tub Vellamo M", priceWithVAT: 7950 },
      { sku: "SPA-VELLAMO-S", name: "Hot tub Vellamo S", priceWithVAT: 7350 },
      { sku: "SPA-C200", name: "Hot tub Cube 200", priceWithVAT: 6950 },
      { sku: "KB-SPAT-200", name: "Hot tub Therma 200", priceWithVAT: 6950 },
      { sku: "KB-SPAT-220", name: "Hot tub Therma 220", priceWithVAT: 7250 },
      
      // Outdoor Saunas
      { sku: "S280D-THE", name: "Outdoor Sauna Barrel 280 Deluxe", priceWithVAT: 9950 },
      { sku: "SC-THE", name: "Outdoor Sauna Cube 300", priceWithVAT: 10750 },
      { sku: "SC220-THE-FGW", name: "Outdoor Sauna Cube 220", priceWithVAT: 9750 },
      { sku: "SC125-THE", name: "Outdoor Sauna Cube 125", priceWithVAT: 7750 },
      { sku: "SE-HIKI-L", name: "Outdoor Sauna Hiki L", priceWithVAT: 10950 },
      { sku: "SE-HIKI-S", name: "Outdoor Sauna Hiki S", priceWithVAT: 8850 },
    ];

    // Calculate VAT-less prices
    const productsWithVATless = correctProducts.map(product => ({
      ...product,
      vatlessPrice: Math.round((product.priceWithVAT / (1 + UK_TAX_RATE / 100)) * 100) / 100,
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

    // Process each correct product
    for (const correctProduct of productsWithVATless) {
      // Find matching UK product by SKU
      const product = ukProducts.find((p: any) => {
        const productSku = (p[SKU_FIELD_KEY] || p.sku || "").toUpperCase();
        return productSku === correctProduct.sku.toUpperCase();
      });

      if (!product) {
        errors.push({
          sku: correctProduct.sku,
          name: correctProduct.name,
          error: "Product not found in Pipedrive",
        });
        continue;
      }

      const productId = product.id;
      const currentName = product.name || "";
      const currentPrice = product.prices?.[0]?.price || 0;
      const currentCurrency = product.prices?.[0]?.currency || "EUR";
      const currentTax = product.tax || 0;

      const needsNameUpdate = currentName !== correctProduct.name;
      const needsPriceUpdate = Math.abs(currentPrice - correctProduct.vatlessPrice) > 0.01;
      const needsCurrencyUpdate = currentCurrency !== UK_CURRENCY;
      const needsTaxUpdate = Math.abs(currentTax - UK_TAX_RATE) > 0.1;

      if (needsNameUpdate || needsPriceUpdate || needsCurrencyUpdate || needsTaxUpdate) {
        try {
          await updateProduct(productId, {
            name: correctProduct.name,
            prices: [
              {
                price: correctProduct.vatlessPrice,
                currency: UK_CURRENCY,
              },
            ],
            tax: UK_TAX_RATE,
          });

          updated.push({
            productId,
            sku: correctProduct.sku,
            oldName: currentName,
            newName: correctProduct.name,
            oldPrice: currentPrice,
            oldCurrency: currentCurrency,
            oldTax: `${currentTax}%`,
            newPrice: correctProduct.vatlessPrice,
            newCurrency: UK_CURRENCY,
            newTax: `${UK_TAX_RATE}%`,
            priceWithVAT: correctProduct.priceWithVAT,
            nameUpdated: needsNameUpdate,
            priceUpdated: needsPriceUpdate || needsCurrencyUpdate || needsTaxUpdate,
            success: true,
          });

          console.log(`✅ Updated ${correctProduct.sku}: "${currentName}" → "${correctProduct.name}", ${currentPrice} ${currentCurrency} → ${correctProduct.vatlessPrice} ${UK_CURRENCY} (${UK_TAX_RATE}% VAT = ${correctProduct.priceWithVAT} ${UK_CURRENCY})`);

          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error: any) {
          errors.push({
            sku: correctProduct.sku,
            name: correctProduct.name,
            error: error.message || "Failed to update product",
          });
          console.error(`❌ Failed to update ${correctProduct.sku}:`, error);
        }
      } else {
        results.push({
          productId,
          sku: correctProduct.sku,
          name: correctProduct.name,
          price: correctProduct.vatlessPrice,
          currency: UK_CURRENCY,
          taxRate: `${UK_TAX_RATE}%`,
          priceWithVAT: correctProduct.priceWithVAT,
          alreadyCorrect: true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalProducts: productsWithVATless.length,
      updated: updated.length,
      alreadyCorrect: results.length,
      failed: errors.length,
      updated: updated,
      alreadyCorrect: results.length > 0 ? results : undefined,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Failed to update UK products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update UK products",
      },
      { status: 500 }
    );
  }
}
