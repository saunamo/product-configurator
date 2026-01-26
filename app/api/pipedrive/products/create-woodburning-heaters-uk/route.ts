import { NextRequest, NextResponse } from "next/server";
import { createProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/create-woodburning-heaters-uk
 * Create woodburning heater products for UK only
 */
export async function POST(request: NextRequest) {
  try {
    const UK_TAX_RATE = 20; // 20% VAT for UK
    const UK_CURRENCY = "GBP";
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";

    // Woodburning heater products with prices in GBP (with VAT)
    const heaters = [
      { 
        name: "Woodburning heater Noki 12", 
        sku: "ACC-NOKI12", 
        priceWithVAT: 695.00 
      },
      { 
        name: "Woodburning Heater Pyros 20", 
        sku: "ACC-PYROS20", 
        priceWithVAT: 1850.00 
      },
      { 
        name: "Woodburning Heater Pyros 16", 
        sku: "ACC-PYROS16", 
        priceWithVAT: 1450.00 
      },
    ];

    const results = [];
    const errors = [];

    for (const heater of heaters) {
      // Calculate VAT-less price
      const vatlessPrice = Math.round((heater.priceWithVAT / (1 + UK_TAX_RATE / 100)) * 100) / 100;

      // Create product name following convention: "Product Name | SKU"
      const productName = `${heater.name} | ${heater.sku}`;

      try {
        const productData = {
          name: productName,
          code: "UK",
          [SKU_FIELD_KEY]: heater.sku,
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
        
        results.push({
          heater: heater.name,
          sku: heater.sku,
          country: "UK",
          productId: result.data.id,
          productName: productName,
          vatlessPrice: vatlessPrice,
          currency: UK_CURRENCY,
          taxRate: `${UK_TAX_RATE}%`,
          priceWithVAT: heater.priceWithVAT,
          success: true,
        });

        console.log(`✅ Created ${productName} (UK): ${vatlessPrice} ${UK_CURRENCY} (${UK_TAX_RATE}% VAT = ${heater.priceWithVAT} ${UK_CURRENCY})`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: any) {
        errors.push({
          heater: heater.name,
          sku: heater.sku,
          country: "UK",
          error: error.message || "Unknown error",
          success: false,
        });
        console.error(`❌ Failed to create ${heater.name} (${heater.sku}):`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${results.length} woodburning heater product(s) for UK`,
      results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: heaters.length,
        created: results.length,
        failed: errors.length,
      },
    });
  } catch (error: any) {
    console.error("Failed to create woodburning heater products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create products",
      },
      { status: 500 }
    );
  }
}
