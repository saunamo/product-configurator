import { NextRequest, NextResponse } from "next/server";
import { createProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/create-cube125-delivery-uk
 * Create "Cube 125 Standard Delivery UK" product in Pipedrive
 * Price: £1,125.00 (including 20% VAT)
 */
export async function POST(request: NextRequest) {
  try {
    const productName = "Cube 125 Standard Delivery UK";
    const priceWithVAT = 1125.00; // £1,125.00 including VAT
    const taxRate = 20; // UK VAT rate
    const currency = "GBP";
    
    // Calculate VAT-less price
    const priceWithoutVAT = priceWithVAT / (1 + taxRate / 100);
    const vatlessPrice = Math.round(priceWithoutVAT * 100) / 100; // £937.50

    try {
      const productData = {
        name: productName,
        code: "UK",
        prices: [
          {
            price: vatlessPrice,
            currency: currency,
          },
        ],
        tax: taxRate,
        unit: "piece",
      };

      const result = await createProduct(productData);
      
      return NextResponse.json({
        success: true,
        message: `Created product "${productName}" in Pipedrive`,
        product: {
          productId: result.data.id,
          productName: productName,
          vatlessPrice: vatlessPrice,
          currency: currency,
          taxRate: `${taxRate}%`,
          priceWithVAT: priceWithVAT,
        },
      });
    } catch (error: any) {
      console.error(`❌ Failed to create ${productName}:`, error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Failed to create Cube 125 Standard Delivery UK product:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create product",
      },
      { status: 500 }
    );
  }
}
