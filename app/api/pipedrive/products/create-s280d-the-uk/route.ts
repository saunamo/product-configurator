import { NextRequest, NextResponse } from "next/server";
import { createProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/create-s280d-the-uk
 * Create "S280D-THE" product in Pipedrive for UK
 * Price: £9,950.00 (including 20% VAT)
 */
export async function POST(request: NextRequest) {
  try {
    const productName = "S280D-THE";
    const priceWithVAT = 9950.00; // £9,950.00 including VAT
    const taxRate = 20; // UK VAT rate
    const currency = "GBP";
    
    // Calculate VAT-less price
    const priceWithoutVAT = priceWithVAT / (1 + taxRate / 100);
    const vatlessPrice = Math.round(priceWithoutVAT * 100) / 100; // £8,291.67

    try {
      const productData = {
        name: productName,
        code: "S280D-THE",
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
        message: `Created product "${productName}" in Pipedrive for UK`,
        product: {
          productId: result.data.id,
          productName: productName,
          sku: "S280D-THE",
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
    console.error("Failed to create S280D-THE product:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create product",
      },
      { status: 500 }
    );
  }
}
