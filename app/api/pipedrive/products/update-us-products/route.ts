import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated, updateProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/update-us-products
 * Update the price for US products (0% tax) for SI-AISTI150 and SI-AISTI220
 * SI-AISTI150: 7500€ (with 0% tax = 7500€ VAT-less)
 * SI-AISTI220: 8900€ (with 0% tax = 8900€ VAT-less)
 */
export async function POST(request: NextRequest) {
  try {
    const SKUS = ["SI-AISTI150", "SI-AISTI220"];
    const pricesWithVAT: Record<string, number> = {
      "SI-AISTI150": 7500,
      "SI-AISTI220": 8900,
    };

    // US has 0% tax, so VAT-less price = price with VAT
    const US_TAX_RATE = 0;

    console.log(`🔍 Searching for US products with SKUs: ${SKUS.join(", ")}`);

    // Search for all products
    const allProducts = await getAllProductsPaginated();
    
    // Find products with the SKUs and US code
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a"; // Pipedrive SKU field key
    const matchingProducts = allProducts.filter((product: any) => {
      const productSku = product[SKU_FIELD_KEY] || product.sku || "";
      const productCode = product.code || "";
      return productCode === "US" && SKUS.some(sku => productSku === sku || productSku.includes(sku));
    });

    if (matchingProducts.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No US products found with SKUs: ${SKUS.join(", ")}`,
      }, { status: 404 });
    }

    console.log(`✅ Found ${matchingProducts.length} US product(s)`);

    const results = [];
    const errors = [];

    // Update each product
    for (const product of matchingProducts) {
      const productId = product.id;
      const productName = product.name || `Product ${productId}`;
      const productSku = product[SKU_FIELD_KEY] || product.sku || "";
      const currentPrice = product.prices?.[0]?.price || 0;
      const currentTax = product.tax || 0;

      // Determine which SKU this is
      let sku: string | null = null;
      let expectedPrice: number | null = null;
      
      if (productSku.includes("SI-AISTI150")) {
        sku = "SI-AISTI150";
        expectedPrice = pricesWithVAT["SI-AISTI150"];
      } else if (productSku.includes("SI-AISTI220")) {
        sku = "SI-AISTI220";
        expectedPrice = pricesWithVAT["SI-AISTI220"];
      }

      if (!sku || !expectedPrice) {
        errors.push({
          productId,
          productName,
          productSku,
          error: `Could not determine SKU or expected price`,
        });
        continue;
      }

      // For US (0% tax), VAT-less price = price with VAT
      const expectedPriceWithoutVAT = expectedPrice; // Since tax is 0%

      try {
        // Update the product price and tax
        await updateProduct(productId, {
          prices: [
            {
              price: expectedPriceWithoutVAT,
              currency: "EUR",
            },
          ],
          tax: US_TAX_RATE,
        });

        results.push({
          productId,
          productName,
          sku,
          country: "US",
          taxRate: `${US_TAX_RATE}%`,
          oldPrice: currentPrice,
          oldTax: `${currentTax}%`,
          newPrice: expectedPriceWithoutVAT,
          newTax: `${US_TAX_RATE}%`,
          priceWithVAT: expectedPrice,
          success: true,
        });

        console.log(`✅ Updated ${productName} (US): ${currentPrice}€ → ${expectedPriceWithoutVAT}€ (${US_TAX_RATE}% tax = ${expectedPrice}€ with tax)`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: any) {
        errors.push({
          productId,
          productName,
          sku,
          error: error.message || "Failed to update product",
        });
        console.error(`❌ Failed to update ${productName} (US):`, error);
      }
    }

    return NextResponse.json({
      success: true,
      country: "US",
      taxRate: `${US_TAX_RATE}%`,
      pricesWithVAT,
      updated: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Failed to update US products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update US products",
      },
      { status: 500 }
    );
  }
}
