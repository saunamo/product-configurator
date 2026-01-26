import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated, updateProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/update-aisti220-price
 * Update the price for SI-AISTI220 product across all country variants
 * New price with VAT: 8900€
 * Calculates VAT-less price based on each country's tax rate
 */
export async function POST(request: NextRequest) {
  try {
    const SKU = "SI-AISTI220";
    const priceWithVAT = 8900; // New price with VAT in EUR

    // Tax rates by country code
    const taxRates: Record<string, number> = {
      PT: 23, // 23% VAT
      UK: 20, // 20% VAT
      EN: 23, // 23% VAT
      FR: 20, // 20% VAT
      IT: 22, // 22% VAT
      ES: 21, // 21% VAT
    };

    // Calculate VAT-less prices for each country
    const pricesByCountry: Record<string, number> = {};
    for (const [country, taxRate] of Object.entries(taxRates)) {
      const priceWithoutVAT = priceWithVAT / (1 + taxRate / 100);
      pricesByCountry[country] = Math.round(priceWithoutVAT * 100) / 100; // Round to 2 decimals
    }

    console.log(`🔍 Searching for products with SKU: ${SKU}`);
    console.log(`💰 Price with VAT: ${priceWithVAT}€`);
    console.log(`💰 VAT-less prices by country:`, pricesByCountry);

    // Search for all products (we'll filter by SKU)
    const allProducts = await getAllProductsPaginated();
    
    // Find products with the SKU
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a"; // Pipedrive SKU field key
    const matchingProducts = allProducts.filter((product: any) => {
      const productSku = product[SKU_FIELD_KEY] || product.sku || "";
      return productSku === SKU || productSku.includes(SKU);
    });

    if (matchingProducts.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No products found with SKU: ${SKU}`,
      }, { status: 404 });
    }

    console.log(`✅ Found ${matchingProducts.length} product(s) with SKU ${SKU}`);

    const results = [];
    const errors = [];

    // Update each product based on its country code
    for (const product of matchingProducts) {
      const productCode = product.code || "";
      const productId = product.id;
      const productName = product.name || `Product ${productId}`;

      // Determine country from product code
      let country: string | null = null;
      if (productCode === "PT") country = "PT";
      else if (productCode === "UK") country = "UK";
      else if (productCode === "EN") country = "EN";
      else if (productCode === "FR") country = "FR";
      else if (productCode === "IT") country = "IT";
      else if (productCode === "ES") country = "ES";

      if (!country || !pricesByCountry[country]) {
        errors.push({
          productId,
          productName,
          productCode,
          error: `Unknown country code: ${productCode}`,
        });
        continue;
      }

      const newPrice = pricesByCountry[country];
      const currentPrice = product.prices?.[0]?.price || 0;

      try {
        // Update the product price
        await updateProduct(productId, {
          prices: [
            {
              price: newPrice,
              currency: "EUR",
            },
          ],
        });

        results.push({
          productId,
          productName,
          country,
          taxRate: `${taxRates[country]}%`,
          oldPrice: currentPrice,
          newPrice: newPrice,
          priceWithVAT: priceWithVAT,
          success: true,
        });

        console.log(`✅ Updated ${productName} (${country}): ${currentPrice}€ → ${newPrice}€ (${taxRates[country]}% VAT = ${priceWithVAT}€)`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: any) {
        errors.push({
          productId,
          productName,
          country,
          error: error.message || "Failed to update product",
        });
        console.error(`❌ Failed to update ${productName} (${country}):`, error);
      }
    }

    return NextResponse.json({
      success: true,
      sku: SKU,
      priceWithVAT: priceWithVAT,
      pricesByCountry,
      updated: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Failed to update SI-AISTI220 prices:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update product prices",
      },
      { status: 500 }
    );
  }
}
