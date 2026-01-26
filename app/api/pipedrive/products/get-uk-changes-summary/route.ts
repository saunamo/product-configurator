import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated } from "@/lib/pipedrive/client";

/**
 * POST /api/pipedrive/products/get-uk-changes-summary
 * Get summary of all UK product changes with before/after comparison
 */
export async function POST(request: NextRequest) {
  try {
    // This is the data from the previous update run
    const updateHistory = [
      { productId: 16408, sku: "ICE-BATH-INSTALLATION", oldName: "Ice bath installation | ICE-BATH-INSTALLATION", newName: "Ice bath Cube", oldPrice: 166.6666667, oldCurrency: "EUR", newPrice: 4791.67, newCurrency: "GBP", priceWithVAT: 5750 },
      { productId: 16416, sku: "SE-HIKI-L", oldName: "Outdoor Sauna Hiki L", newName: "Outdoor Sauna Hiki L", oldPrice: 9125, oldCurrency: "EUR", newPrice: 9125, newCurrency: "GBP", priceWithVAT: 10950 },
      { productId: 16421, sku: "SPA-VELLAMO-S", oldName: "Hot tub Vellamo S", newName: "Hot tub Vellamo S", oldPrice: 5958.333333, oldCurrency: "EUR", newPrice: 6125, newCurrency: "GBP", priceWithVAT: 7350 },
      { productId: 16422, sku: "SE-HIKI-S", oldName: "Outdoor Sauna Hiki S", newName: "Outdoor Sauna Hiki S", oldPrice: 7125, oldCurrency: "EUR", newPrice: 7375, newCurrency: "GBP", priceWithVAT: 8850 },
      { productId: 16423, sku: "SPA-VELLAMO-M", oldName: "Hot tub Vellamo M", newName: "Hot tub Vellamo M", oldPrice: 6375, oldCurrency: "EUR", newPrice: 6625, newCurrency: "GBP", priceWithVAT: 7950 },
      { productId: 16426, sku: "SPA-VELLAMO-L", oldName: "Hot tub Vellamo L", newName: "Hot tub Vellamo L", oldPrice: 6625, oldCurrency: "EUR", newPrice: 6875, newCurrency: "GBP", priceWithVAT: 8250 },
      { productId: 17774, sku: "CT-OFURO", oldName: "Ice bath Ofuro", newName: "Ice bath Ofuro", oldPrice: 5625, oldCurrency: "EUR", newPrice: 5791.67, newCurrency: "GBP", priceWithVAT: 6950 },
      { productId: 17782, sku: "KB-SPAT-200", oldName: "Hot tub Therma 200", newName: "Hot tub Therma 200", oldPrice: 3791.666667, oldCurrency: "EUR", newPrice: 5791.67, newCurrency: "GBP", priceWithVAT: 6950 },
      { productId: 17812, sku: "SPA-C200", oldName: "Hot tub Cube 200", newName: "Hot tub Cube 200", oldPrice: 4333.333333, oldCurrency: "EUR", newPrice: 5791.67, newCurrency: "GBP", priceWithVAT: 6950 },
      { productId: 17855, sku: "SC125-THE", oldName: "Outdoor Sauna Cube 125", newName: "Outdoor Sauna Cube 125", oldPrice: 6208.333333, oldCurrency: "EUR", newPrice: 6458.33, newCurrency: "GBP", priceWithVAT: 7750 },
      { productId: 17873, sku: "JAC-LEGEND", oldName: "Ice bath Ofuro", newName: "Ice bath Ofuro", oldPrice: 4000, oldCurrency: "EUR", newPrice: 5791.67, newCurrency: "GBP", priceWithVAT: 6950 },
      { productId: 17881, sku: "CT-ERGO-THE", oldName: "Ice bath Ergo", newName: "Ice bath Ergo", oldPrice: 4583.333333, oldCurrency: "EUR", newPrice: 4791.67, newCurrency: "GBP", priceWithVAT: 5750 },
      { productId: 17940, sku: "SC-THE", oldName: "Outdoor Sauna Cubus", newName: "Outdoor Sauna Cubus", oldPrice: 8791.666666, oldCurrency: "EUR", newPrice: 8958.33, newCurrency: "GBP", priceWithVAT: 10750 },
      { productId: 17945, sku: "S280D-THE", oldName: "Outdoor Sauna Barrel 280 Deluxe", newName: "Outdoor Sauna Barrel 280 Deluxe", oldPrice: 8208.333333, oldCurrency: "EUR", newPrice: 8291.67, newCurrency: "GBP", priceWithVAT: 9950 },
      { productId: 17952, sku: "SPAT-220", oldName: "Hot tub Therma 220", newName: "Hot tub Therma 220", oldPrice: 4041.666667, oldCurrency: "EUR", newPrice: 6041.67, newCurrency: "GBP", priceWithVAT: 7250 },
      { productId: 17956, sku: "ERGO-150-THE", oldName: "Ice bath Ergo", newName: "Ice bath Ergo", oldPrice: 5625, oldCurrency: "EUR", newPrice: 4791.67, newCurrency: "GBP", priceWithVAT: 5750 },
      { productId: 17960, sku: "ERGO-150-S", oldName: "Ice bath Ergo", newName: "Ice bath Ergo", oldPrice: 4583.333333, oldCurrency: "EUR", newPrice: 4791.67, newCurrency: "GBP", priceWithVAT: 5750 },
      { productId: 17961, sku: "ERGO-180-THE", oldName: "Ice bath Ergo", newName: "Ice bath Ergo", oldPrice: 5958.333333, oldCurrency: "EUR", newPrice: 4791.67, newCurrency: "GBP", priceWithVAT: 5750 },
      { productId: 17962, sku: "ERGO-220-THE", oldName: "Ice bath Ergo", newName: "Ice bath Ergo", oldPrice: 6250, oldCurrency: "EUR", newPrice: 4791.67, newCurrency: "GBP", priceWithVAT: 5750 },
      { productId: 17964, sku: "ERGO-220-SPR", oldName: "Ice bath Ergo", newName: "Ice bath Ergo", oldPrice: 4999.999999, oldCurrency: "EUR", newPrice: 4791.67, newCurrency: "GBP", priceWithVAT: 5750 },
      { productId: 17965, sku: "ERGO-180-SPR", oldName: "Ice bath Ergo", newName: "Ice bath Ergo", oldPrice: 4791.666667, oldCurrency: "EUR", newPrice: 4791.67, newCurrency: "GBP", priceWithVAT: 5750 },
      { productId: 17973, sku: "SI-AISTI150", oldName: "Outdoor Sauna Cube 125", newName: "Outdoor Sauna Cube 125", oldPrice: 6250, oldCurrency: "EUR", newPrice: 6458.33, newCurrency: "GBP", priceWithVAT: 7750 },
      { productId: 17975, sku: "SPA-VELLAMO-L", oldName: "Hot tub Vellamo L", newName: "Hot tub Vellamo L", oldPrice: 7041.66595, oldCurrency: "EUR", newPrice: 6875, newCurrency: "GBP", priceWithVAT: 8250 },
      { productId: 17976, sku: "SI-AISTI220", oldName: "Outdoor Sauna Cube 220", newName: "Outdoor Sauna Cube 220", oldPrice: 7416.67, oldCurrency: "EUR", newPrice: 8125, newCurrency: "GBP", priceWithVAT: 9750 },
    ];

    // Format for table
    const table = updateHistory.map(item => ({
      SKU: item.sku,
      "Old Name": item.oldName,
      "New Name": item.newName,
      "Name Changed": item.oldName !== item.newName ? "YES" : "NO",
      "Old Price": `${item.oldPrice.toFixed(2)} ${item.oldCurrency}`,
      "New Price": `${item.newPrice.toFixed(2)} ${item.newCurrency}`,
      "Price with VAT": `${item.priceWithVAT.toFixed(2)} ${item.newCurrency}`,
    }));

    return NextResponse.json({
      success: true,
      totalChanges: updateHistory.length,
      nameChanges: updateHistory.filter(item => item.oldName !== item.newName).length,
      priceChanges: updateHistory.filter(item => 
        Math.abs(item.oldPrice - item.newPrice) > 0.01 || item.oldCurrency !== item.newCurrency
      ).length,
      changes: table,
    });
  } catch (error: any) {
    console.error("Failed to get changes summary:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get summary",
      },
      { status: 500 }
    );
  }
}
