import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated } from "@/lib/pipedrive/client";

/**
 * GET /api/pipedrive/products/check-cariitti-products
 * Check what Cariitti products exist in Pipedrive
 */
export async function GET(request: NextRequest) {
  try {
    const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";

    console.log("🔍 Fetching all products from Pipedrive...");
    const allProducts = await getAllProductsPaginated();
    
    // Find all Cariitti products
    const cariittiProducts = allProducts.filter((p: any) => {
      const name = (p.name || "").toLowerCase();
      const sku = (p[SKU_FIELD_KEY] || p.sku || "").toUpperCase();
      return name.includes("cariitti") || sku.includes("CAR-LED");
    });

    console.log(`✅ Found ${cariittiProducts.length} Cariitti product(s)`);

    const products = cariittiProducts.map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p[SKU_FIELD_KEY] || p.sku || "N/A",
      code: p.code || "N/A",
      price: p.prices?.[0]?.price || 0,
      currency: p.prices?.[0]?.currency || "N/A",
      tax: p.tax || 0,
    }));

    return NextResponse.json({
      success: true,
      count: cariittiProducts.length,
      products,
    });
  } catch (error: any) {
    console.error("Failed to check Cariitti products:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to check products",
      },
      { status: 500 }
    );
  }
}
