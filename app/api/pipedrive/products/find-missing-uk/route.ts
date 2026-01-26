import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/find-missing-uk
 * Search for missing UK products with alternative SKUs or names
 */
export async function POST(request: NextRequest) {
  try {
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";
    
    const missingProducts = [
      { searchSKU: "CT-CUBE-THE", searchName: "Ice bath Cube", correctName: "Ice bath Cube", priceWithVAT: 5750 },
      { searchSKU: "SPA-VELLAMO-XL", searchName: "Vellamo XL", correctName: "Hot tub Vellamo XL", priceWithVAT: 9150 },
      { searchSKU: "KB-SPAT-220", searchName: "Therma 220", correctName: "Hot tub Therma 220", priceWithVAT: 7250 },
    ];

    console.log("🔍 Fetching all UK products...");
    const allProducts = await getAllProductsPaginated();
    const ukProducts = allProducts.filter((p: any) => (p.code || "").toUpperCase() === "UK");

    const found = [];

    for (const missing of missingProducts) {
      // Search by name pattern
      const matches = ukProducts.filter((p: any) => {
        const productName = (p.name || "").toUpperCase();
        const productSku = ((p[SKU_FIELD_KEY] || p.sku || "")).toUpperCase();
        return productName.includes(missing.searchName.toUpperCase()) || 
               productSku.includes(missing.searchSKU.toUpperCase().replace("-", ""));
      });

      if (matches.length > 0) {
        found.push({
          searchFor: missing.searchSKU,
          correctName: missing.correctName,
          priceWithVAT: missing.priceWithVAT,
          found: matches.map((p: any) => ({
            productId: p.id,
            name: p.name,
            sku: p[SKU_FIELD_KEY] || p.sku || "",
            code: p.code,
            price: p.prices?.[0]?.price || 0,
            currency: p.prices?.[0]?.currency || "EUR",
            tax: p.tax || 0,
          })),
        });
      }
    }

    return NextResponse.json({
      success: true,
      found: found,
      stillMissing: missingProducts.filter(m => 
        !found.some(f => f.searchFor === m.searchSKU)
      ).map(m => ({ sku: m.searchSKU, name: m.correctName, priceWithVAT: m.priceWithVAT })),
    });
  } catch (error: any) {
    console.error("Failed to find missing products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to search",
      },
      { status: 500 }
    );
  }
}
