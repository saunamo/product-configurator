/**
 * Script to create "Havia Vega compact 3,5 kW" product in Pipedrive
 * Run with: npx tsx scripts/create-havia-vega-product.ts
 */

import { createProduct } from "../lib/pipedrive/client";

async function createHaviaVegaProduct() {
  try {
    const productName = "Havia Vega compact 3,5 kW";
    const priceInclVat = 369; // EUR
    const vatRate = 0.20; // 20% VAT
    const sku = "HAVIA-VEGA-COMPACT-35KW";

    // Calculate price excluding VAT
    const priceExclVat = priceInclVat / (1 + vatRate);

    // Common currencies and their approximate exchange rates
    const currencies = [
      { code: "EUR", rate: 1.0, vatRate: 0.20 }, // Base currency
      { code: "GBP", rate: 0.85, vatRate: 0.20 }, // UK
      { code: "USD", rate: 1.10, vatRate: 0.20 }, // US (if applicable)
      { code: "SEK", rate: 11.5, vatRate: 0.25 }, // Sweden
      { code: "NOK", rate: 11.8, vatRate: 0.25 }, // Norway
      { code: "DKK", rate: 7.45, vatRate: 0.25 }, // Denmark
      { code: "PLN", rate: 4.35, vatRate: 0.23 }, // Poland
    ];

    // Create prices array for all currencies
    const prices = currencies.map((curr) => {
      const priceInCurrency = priceInclVat * curr.rate;
      const priceExclVatInCurrency = priceInCurrency / (1 + curr.vatRate);
      
      return {
        price: priceExclVatInCurrency, // Pipedrive typically stores prices excl VAT
        currency: curr.code,
        cost: 0,
        overhead_cost: 0,
      };
    });

    // Create the product
    const productData = {
      name: productName,
      code: sku,
      unit: "pcs",
      tax: vatRate * 100, // Tax as percentage
      prices: prices,
    };

    console.log("Creating product in Pipedrive...");
    console.log("Product Name:", productName);
    console.log("SKU:", sku);
    console.log("Price (EUR incl VAT):", priceInclVat);
    console.log("Price (EUR excl VAT):", priceExclVat.toFixed(2));
    console.log("\nPrices for all currencies:");
    prices.forEach((p) => {
      const inclVat = p.price * (1 + vatRate);
      console.log(`  ${p.currency}: ${inclVat.toFixed(2)} incl VAT (${p.price.toFixed(2)} excl VAT)`);
    });

    const result = await createProduct(productData);

    console.log("\n✅ Product created successfully!");
    console.log("Product ID:", result.data.id);
    console.log("SKU:", sku);
    console.log("\nProduct details:", JSON.stringify(result.data, null, 2));
  } catch (error: any) {
    console.error("❌ Failed to create product:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
createHaviaVegaProduct();
