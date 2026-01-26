import { NextRequest, NextResponse } from "next/server";
import { createProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/create-vellamo-xl-uk
 * Create Hot tub Vellamo XL product for UK
 */
export async function POST(request: NextRequest) {
  try {
    const UK_TAX_RATE = 20; // 20% VAT for UK
    const UK_CURRENCY = "GBP";
    const priceWithVAT = 9150;
    const vatlessPrice = Math.round((priceWithVAT / (1 + UK_TAX_RATE / 100)) * 100) / 100;

    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";

    const productData = {
      name: "Hot tub Vellamo XL",
      code: "UK",
      [SKU_FIELD_KEY]: "SPA-VELLAMO-XL",
      prices: [
        {
          price: vatlessPrice,
          currency: UK_CURRENCY,
        },
      ],
      tax: UK_TAX_RATE,
      unit: "piece",
    };

    const result = await createProduct(productData);

    return NextResponse.json({
      success: true,
      productId: result.data.id,
      productName: "Hot tub Vellamo XL",
      sku: "SPA-VELLAMO-XL",
      country: "UK",
      vatlessPrice: vatlessPrice,
      currency: UK_CURRENCY,
      taxRate: `${UK_TAX_RATE}%`,
      priceWithVAT: priceWithVAT,
      product: result.data,
    });
  } catch (error: any) {
    console.error("Failed to create Vellamo XL:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create product",
      },
      { status: 500 }
    );
  }
}
