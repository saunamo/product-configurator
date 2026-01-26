import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated, updateProduct, createProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/update-uk-installation-products
 * Update UK installation product prices and create ice bath installation product
 */
export async function POST(request: NextRequest) {
  try {
    const UK_TAX_RATE = 20; // 20% VAT for UK
    const UK_CURRENCY = "GBP";
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";

    // Products to update (prices are with VAT)
    const productsToUpdate = [
      {
        sku: "sauna-normal-assembly",
        priceWithVAT: 1250.00,
      },
      {
        sku: "INSELE",
        priceWithVAT: 200.00,
      },
      {
        sku: "EL-INSTALL",
        priceWithVAT: 1250.00,
      },
    ];

    // New product to create
    const newProduct = {
      name: "Ice Bath Installation",
      sku: "ICE-BATH-INSTALL",
      priceWithVAT: 200.00,
    };

    console.log("🔍 Fetching all products from Pipedrive...");
    const allProducts = await getAllProductsPaginated();
    
    // Filter UK products
    const ukProducts = allProducts.filter((p: any) => (p.code || "").toUpperCase() === "UK");
    console.log(`✅ Found ${ukProducts.length} UK products`);

    const results = [];
    const errors = [];
    const notFound = [];

    // Update existing products
    for (const productUpdate of productsToUpdate) {
      // Find product by SKU
      const product = ukProducts.find((p: any) => {
        const sku = (p[SKU_FIELD_KEY] || p.sku || "").toUpperCase();
        return sku === productUpdate.sku.toUpperCase();
      });

      if (!product) {
        notFound.push({
          sku: productUpdate.sku,
          reason: "Product not found in UK",
        });
        continue;
      }

      const productId = product.id;
      const currentPrice = product.prices?.[0]?.price || 0;
      const currentCurrency = product.prices?.[0]?.currency || "EUR";

      // Calculate VAT-less price
      const vatlessPrice = Math.round((productUpdate.priceWithVAT / (1 + UK_TAX_RATE / 100)) * 100) / 100;

      const needsPriceUpdate = Math.abs(currentPrice - vatlessPrice) > 0.01;
      const needsCurrencyUpdate = currentCurrency !== UK_CURRENCY;

      if (needsPriceUpdate || needsCurrencyUpdate) {
        try {
          await updateProduct(productId, {
            prices: [
              {
                price: vatlessPrice,
                currency: UK_CURRENCY,
              },
            ],
            tax: UK_TAX_RATE,
          });

          results.push({
            productId,
            sku: productUpdate.sku,
            productName: product.name,
            oldPrice: currentPrice,
            oldCurrency: currentCurrency,
            newPrice: vatlessPrice,
            newCurrency: UK_CURRENCY,
            priceWithVAT: productUpdate.priceWithVAT,
            taxRate: `${UK_TAX_RATE}%`,
            status: "updated",
            success: true,
          });

          console.log(`✅ Updated ${product.name} (${productUpdate.sku}): ${vatlessPrice} ${UK_CURRENCY} (${UK_TAX_RATE}% VAT = ${productUpdate.priceWithVAT} ${UK_CURRENCY})`);

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error: any) {
          errors.push({
            sku: productUpdate.sku,
            productId,
            error: error.message || "Unknown error",
            success: false,
          });
          console.error(`❌ Failed to update ${productUpdate.sku}:`, error);
        }
      } else {
        results.push({
          productId,
          sku: productUpdate.sku,
          productName: product.name,
          oldPrice: currentPrice,
          oldCurrency: currentCurrency,
          newPrice: vatlessPrice,
          newCurrency: UK_CURRENCY,
          priceWithVAT: productUpdate.priceWithVAT,
          taxRate: `${UK_TAX_RATE}%`,
          status: "already_correct",
          success: true,
        });
        console.log(`✓ ${product.name} (${productUpdate.sku}) already has correct price`);
      }
    }

    // Create new ice bath installation product
    // Check if it already exists
    const existingIceBath = ukProducts.find((p: any) => {
      const sku = (p[SKU_FIELD_KEY] || p.sku || "").toUpperCase();
      const name = (p.name || "").toLowerCase();
      return sku === newProduct.sku.toUpperCase() || 
             (name.includes("ice bath") && name.includes("install"));
    });

    if (existingIceBath) {
      results.push({
        productId: existingIceBath.id,
        sku: newProduct.sku,
        productName: existingIceBath.name,
        status: "already_exists",
        success: true,
      });
      console.log(`✓ Ice bath installation product already exists (ID: ${existingIceBath.id})`);
    } else {
      // Calculate VAT-less price
      const vatlessPrice = Math.round((newProduct.priceWithVAT / (1 + UK_TAX_RATE / 100)) * 100) / 100;

      // Create product name following convention: "Product Name | SKU"
      const productName = `${newProduct.name} | ${newProduct.sku}`;

      try {
        const productData = {
          name: productName,
          code: "UK",
          [SKU_FIELD_KEY]: newProduct.sku,
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
          productId: result.data.id,
          sku: newProduct.sku,
          productName: productName,
          newPrice: vatlessPrice,
          newCurrency: UK_CURRENCY,
          priceWithVAT: newProduct.priceWithVAT,
          taxRate: `${UK_TAX_RATE}%`,
          status: "created",
          success: true,
        });

        console.log(`✅ Created ${productName} (UK): ${vatlessPrice} ${UK_CURRENCY} (${UK_TAX_RATE}% VAT = ${newProduct.priceWithVAT} ${UK_CURRENCY})`);
      } catch (error: any) {
        errors.push({
          sku: newProduct.sku,
          error: error.message || "Unknown error",
          success: false,
        });
        console.error(`❌ Failed to create ice bath installation product:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${results.filter(r => r.status === "updated").length} product(s) and created ${results.filter(r => r.status === "created").length} new product(s)`,
      results,
      notFound: notFound.length > 0 ? notFound : undefined,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        updated: results.filter(r => r.status === "updated").length,
        alreadyCorrect: results.filter(r => r.status === "already_correct").length,
        created: results.filter(r => r.status === "created").length,
        alreadyExists: results.filter(r => r.status === "already_exists").length,
        notFound: notFound.length,
        failed: errors.length,
      },
    });
  } catch (error: any) {
    console.error("Failed to update UK installation products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update products",
      },
      { status: 500 }
    );
  }
}
