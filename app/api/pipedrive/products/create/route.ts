import { NextRequest, NextResponse } from "next/server";
import { createProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/create
 * Create a product in Pipedrive with prices for multiple currencies
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, priceInclVat, vatRate = 0.20, sku } = body;

    if (!name || !priceInclVat) {
      return NextResponse.json(
        { success: false, error: "Product name and price (incl VAT) are required" },
        { status: 400 }
      );
    }

    // Calculate price excluding VAT
    const priceExclVat = priceInclVat / (1 + vatRate);

    // Generate SKU if not provided
    let productSku = sku;
    if (!productSku) {
      // Generate SKU from product name
      productSku = name
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, "")
        .replace(/\s+/g, "-")
        .substring(0, 50);
    }

    // Common currencies and their approximate exchange rates (as of typical rates)
    // You may want to update these with current exchange rates
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
      name: name,
      code: productSku,
      unit: "pcs",
      tax: vatRate * 100, // Tax as percentage
      prices: prices,
    };

    const result = await createProduct(productData);

    return NextResponse.json({
      success: true,
      productId: result.data.id,
      product: result.data,
      sku: productSku,
      prices: prices.map((p) => ({
        currency: p.currency,
        priceExclVat: p.price,
        priceInclVat: p.price * (1 + vatRate),
      })),
      message: `Product "${name}" created successfully with SKU "${productSku}"`,
    });
  } catch (error: any) {
    console.error("Failed to create product:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create product in Pipedrive",
      },
      { status: 500 }
    );
  }
}
