import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated, updateProduct } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/update-missing-uk-products
 * Update the missing UK products found with alternative SKUs
 */
export async function POST(request: NextRequest) {
  try {
    const UK_TAX_RATE = 20;
    const UK_CURRENCY = "GBP";
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";

    // Products found with alternative SKUs
    const productsToUpdate = [
      { productId: 16408, sku: "ICE-BATH-INSTALLATION", correctSKU: "CT-CUBE-THE", name: "Ice bath Cube", priceWithVAT: 5750 },
      { productId: 17952, sku: "SPAT-220", correctSKU: "KB-SPAT-220", name: "Hot tub Therma 220", priceWithVAT: 7250 },
    ];

    // Also search for Vellamo XL
    const allProducts = await getAllProductsPaginated();
    const ukProducts = allProducts.filter((p: any) => (p.code || "").toUpperCase() === "UK");
    
    const vellamoXL = ukProducts.find((p: any) => {
      const name = (p.name || "").toUpperCase();
      return name.includes("VELLAMO") && name.includes("XL");
    });

    if (vellamoXL) {
      productsToUpdate.push({
        productId: vellamoXL.id,
        sku: vellamoXL[SKU_FIELD_KEY] || vellamoXL.sku || "",
        correctSKU: "SPA-VELLAMO-XL",
        name: "Hot tub Vellamo XL",
        priceWithVAT: 9150,
      });
    }

    const results = [];
    const errors = [];

    for (const product of productsToUpdate) {
      const productData = allProducts.find((p: any) => p.id === product.productId);
      if (!productData) {
        errors.push({ productId: product.productId, error: "Product not found" });
        continue;
      }

      const currentName = productData.name || "";
      const currentPrice = productData.prices?.[0]?.price || 0;
      const currentCurrency = productData.prices?.[0]?.currency || "EUR";
      const vatlessPrice = Math.round((product.priceWithVAT / (1 + UK_TAX_RATE / 100)) * 100) / 100;

      try {
        await updateProduct(product.productId, {
          name: product.name,
          [SKU_FIELD_KEY]: product.correctSKU, // Update SKU to correct one
          prices: [
            {
              price: vatlessPrice,
              currency: UK_CURRENCY,
            },
          ],
          tax: UK_TAX_RATE,
        });

        results.push({
          productId: product.productId,
          oldSKU: product.sku,
          newSKU: product.correctSKU,
          oldName: currentName,
          newName: product.name,
          oldPrice: currentPrice,
          oldCurrency: currentCurrency,
          newPrice: vatlessPrice,
          newCurrency: UK_CURRENCY,
          priceWithVAT: product.priceWithVAT,
          success: true,
        });

        console.log(`✅ Updated ${product.sku} → ${product.correctSKU}: "${currentName}" → "${product.name}", ${currentPrice} ${currentCurrency} → ${vatlessPrice} ${UK_CURRENCY}`);

        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: any) {
        errors.push({
          productId: product.productId,
          sku: product.sku,
          error: error.message || "Failed to update",
        });
      }
    }

    return NextResponse.json({
      success: true,
      updated: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
      vellamoXLFound: !!vellamoXL,
    });
  } catch (error: any) {
    console.error("Failed to update missing products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update",
      },
      { status: 500 }
    );
  }
}
