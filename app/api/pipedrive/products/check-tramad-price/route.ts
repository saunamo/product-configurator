import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated } from "@/lib/pipedrive/client";

/**
 * GET /api/pipedrive/products/check-tramad-price
 * Check current TRAMAD product details
 */
export async function GET(request: NextRequest) {
  try {
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";

    console.log("🔍 Fetching all products from Pipedrive...");
    const allProducts = await getAllProductsPaginated();
    
    // Find TRAMAD product
    const tramadProducts = allProducts.filter((p: any) => {
      const sku = (p[SKU_FIELD_KEY] || p.sku || "").toUpperCase();
      const name = (p.name || "").toLowerCase();
      return sku === "TRAMAD" || name.includes("tramad");
    });

    const products = tramadProducts.map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p[SKU_FIELD_KEY] || p.sku || "N/A",
      code: p.code || "N/A",
      price: p.prices?.[0]?.price || 0,
      currency: p.prices?.[0]?.currency || "N/A",
      tax: p.tax || 0,
      priceWithVAT: p.prices?.[0]?.price ? (p.prices[0].price * (1 + (p.tax || 0) / 100)) : 0,
    }));

    return NextResponse.json({
      success: true,
      count: tramadProducts.length,
      products,
    });
  } catch (error: any) {
    console.error("Failed to check TRAMAD price:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to check product",
      },
      { status: 500 }
    );
  }
}
