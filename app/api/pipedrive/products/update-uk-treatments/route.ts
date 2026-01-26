import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated, updateProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/update-uk-treatments
 * Update UK interior/exterior treatment products to 416.66 GBP (without VAT)
 */
export async function POST(request: NextRequest) {
  try {
    const UK_TAX_RATE = 20; // 20% VAT for UK
    const UK_CURRENCY = "GBP";
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";
    const TARGET_VATLESS_PRICE = 416.66; // Price without VAT
    const PRICE_WITH_VAT = Math.round((TARGET_VATLESS_PRICE * (1 + UK_TAX_RATE / 100)) * 100) / 100; // 500.00

    console.log("🔍 Fetching all products from Pipedrive...");
    const allProducts = await getAllProductsPaginated();
    
    // Filter UK products
    const ukProducts = allProducts.filter((p: any) => (p.code || "").toUpperCase() === "UK");
    console.log(`✅ Found ${ukProducts.length} UK products`);

    // Find interior/exterior treatment products
    // Look for products with names containing: treatment, interior, exterior, wood treatment
    const treatmentProducts = ukProducts.filter((p: any) => {
      const name = (p.name || "").toLowerCase();
      return (name.includes("treatment") || 
              name.includes("interior") || 
              name.includes("exterior")) &&
             (name.includes("wood") || 
              name.includes("treatment") ||
              name.includes("interior") ||
              name.includes("exterior"));
    });

    console.log(`✅ Found ${treatmentProducts.length} UK treatment product(s)`);

    const results = [];
    const errors = [];

    for (const product of treatmentProducts) {
      const productId = product.id;
      const productName = product.name || "";
      const productSku = (product[SKU_FIELD_KEY] || product.sku || "").toUpperCase();
      const currentPrice = product.prices?.[0]?.price || 0;
      const currentCurrency = product.prices?.[0]?.currency || "EUR";

      const needsPriceUpdate = Math.abs(currentPrice - TARGET_VATLESS_PRICE) > 0.01;
      const needsCurrencyUpdate = currentCurrency !== UK_CURRENCY;

      if (needsPriceUpdate || needsCurrencyUpdate) {
        try {
          await updateProduct(productId, {
            prices: [
              {
                price: TARGET_VATLESS_PRICE,
                currency: UK_CURRENCY,
              },
            ],
            tax: UK_TAX_RATE,
          });

          results.push({
            productId,
            sku: productSku || "N/A",
            productName,
            oldPrice: currentPrice,
            oldCurrency: currentCurrency,
            newPrice: TARGET_VATLESS_PRICE,
            newCurrency: UK_CURRENCY,
            priceWithVAT: PRICE_WITH_VAT,
            taxRate: `${UK_TAX_RATE}%`,
            status: "updated",
            success: true,
          });

          console.log(`✅ Updated ${productName}: ${TARGET_VATLESS_PRICE} ${UK_CURRENCY} (${UK_TAX_RATE}% VAT = ${PRICE_WITH_VAT} ${UK_CURRENCY})`);

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error: any) {
          errors.push({
            productId,
            productName,
            sku: productSku,
            error: error.message || "Unknown error",
            success: false,
          });
          console.error(`❌ Failed to update ${productName}:`, error);
        }
      } else {
        results.push({
          productId,
          sku: productSku || "N/A",
          productName,
          oldPrice: currentPrice,
          oldCurrency: currentCurrency,
          newPrice: TARGET_VATLESS_PRICE,
          newCurrency: UK_CURRENCY,
          priceWithVAT: PRICE_WITH_VAT,
          taxRate: `${UK_TAX_RATE}%`,
          status: "already_correct",
          success: true,
        });
        console.log(`✓ ${productName} already has correct price`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${results.filter(r => r.status === "updated").length} UK treatment product(s)`,
      results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        found: treatmentProducts.length,
        updated: results.filter(r => r.status === "updated").length,
        alreadyCorrect: results.filter(r => r.status === "already_correct").length,
        failed: errors.length,
      },
    });
  } catch (error: any) {
    console.error("Failed to update UK treatment products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update products",
      },
      { status: 500 }
    );
  }
}
