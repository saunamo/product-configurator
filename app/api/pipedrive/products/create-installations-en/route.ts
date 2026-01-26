import { NextRequest, NextResponse } from "next/server";
import { createProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/create-installations-en
 * Create installation products in English for Pipedrive
 */
export async function POST(request: NextRequest) {
  try {
    // Installation products in English
    const products = [
      {
        name: "Installations outside PT (WITHOUT VAT)",
        price: 1033.05,
        sku: "INSFPT",
      },
      {
        name: "Sauna Assembly Spain",
        price: 1100.00,
        sku: "MONSES",
      },
      {
        name: "Sauna Assembly Islands",
        price: 1500.00,
        sku: "MONSIS",
      },
      {
        name: "Woodburning Hot Tub Installation",
        price: 350.00,
        sku: "INSBHL",
      },
      {
        name: "Electrical installation (connections only)",
        price: 750.00,
        sku: "INSELE",
      },
      {
        name: "Electrical installation (full installation)",
        price: 1300.00,
        sku: "INSEIC",
      },
      {
        name: "Wood treatment",
        price: 345.53,
        sku: "TRAMAD",
      },
    ];

    // Format products for Pipedrive
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a"; // Pipedrive SKU field key
    
    const productsToCreate = products.map((product) => {
      const fullName = `${product.name} | ${product.sku}`;
      
      return {
        name: fullName,
        code: "EN", // Product code is "EN" for English products
        [SKU_FIELD_KEY]: product.sku, // SKU goes to the SKU field
        prices: [
          {
            price: product.price,
            currency: "EUR",
          },
        ],
        tax: 23, // 23% tax for English products
        unit: "piece",
      };
    });

    const results = [];
    const errors = [];

    // Create products one by one
    for (let i = 0; i < productsToCreate.length; i++) {
      const productData = productsToCreate[i];
      try {
        const result = await createProduct(productData);
        results.push({
          index: i,
          name: productData.name,
          success: true,
          productId: result.data.id,
          product: result.data,
        });
        
        // Small delay to avoid rate limiting
        if (i < productsToCreate.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error: any) {
        errors.push({
          index: i,
          name: productData.name,
          error: error.message || "Failed to create product",
        });
      }
    }

    return NextResponse.json({
      success: true,
      created: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Failed to create English installation products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create English installation products",
      },
      { status: 500 }
    );
  }
}


