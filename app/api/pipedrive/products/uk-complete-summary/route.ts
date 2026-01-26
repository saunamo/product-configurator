import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/pipedrive/products/uk-complete-summary
 * Complete summary table of all UK product changes
 */
export async function POST(request: NextRequest) {
  const allChanges = [
    // Indoor Saunas
    { sku: "SI-AISTI220", category: "Indoor Sauna", productName: "Indoor Sauna Thermo Black 220", oldName: "Outdoor Sauna Aisti 220", oldPrice: "7416.67 EUR", newPrice: "7916.67 GBP", priceWithVAT: "9500 GBP", nameChanged: true, priceChanged: true, skuChanged: false },
    { sku: "SI-AISTI150", category: "Indoor Sauna", productName: "Indoor Sauna Aisti 150", oldName: "Outdoor Sauna Aisti 150", oldPrice: "6250 EUR", newPrice: "6250 GBP", priceWithVAT: "7500 GBP", nameChanged: true, priceChanged: true, skuChanged: false },
    
    // Ice Baths
    { sku: "CT-CUBE-THE", category: "Ice Bath", productName: "Ice bath Cube", oldName: "Ice bath Cube", oldSKU: "ICE-BATH-INSTALLATION", oldPrice: "166.67 EUR", newPrice: "4791.67 GBP", priceWithVAT: "5750 GBP", nameChanged: false, priceChanged: true, skuChanged: true },
    { sku: "CT-OFURO", category: "Ice Bath", productName: "Ice bath Ofuro", oldName: "Ice bath Ofuro", oldPrice: "5625 EUR", newPrice: "5791.67 GBP", priceWithVAT: "6950 GBP", nameChanged: false, priceChanged: true, skuChanged: false },
    { sku: "CT-ERGO-THE", category: "Ice Bath", productName: "Ice bath Ergo", oldName: "Ice bath Ergo", oldPrice: "4583.33 EUR", newPrice: "4791.67 GBP", priceWithVAT: "5750 GBP", nameChanged: false, priceChanged: true, skuChanged: false },
    
    // Hot Tubs
    { sku: "SPA-VELLAMO-XL", category: "Hot Tub", productName: "Hot tub Vellamo XL", oldName: "N/A (Created)", oldPrice: "N/A (Created)", newPrice: "7625 GBP", priceWithVAT: "9150 GBP", nameChanged: false, priceChanged: false, skuChanged: false, created: true },
    { sku: "SPA-VELLAMO-L", category: "Hot Tub", productName: "Hot tub Vellamo L", oldName: "Hot tub Vellamo L", oldPrice: "6625 EUR", newPrice: "6875 GBP", priceWithVAT: "8250 GBP", nameChanged: false, priceChanged: true, skuChanged: false },
    { sku: "SPA-VELLAMO-M", category: "Hot Tub", productName: "Hot tub Vellamo M", oldName: "Hot tub Vellamo M", oldPrice: "6375 EUR", newPrice: "6625 GBP", priceWithVAT: "7950 GBP", nameChanged: false, priceChanged: true, skuChanged: false },
    { sku: "SPA-VELLAMO-S", category: "Hot Tub", productName: "Hot tub Vellamo S", oldName: "Hot tub Vellamo S", oldPrice: "5958.33 EUR", newPrice: "6125 GBP", priceWithVAT: "7350 GBP", nameChanged: false, priceChanged: true, skuChanged: false },
    { sku: "SPA-C200", category: "Hot Tub", productName: "Hot tub Cube 200", oldName: "Hot tub Cube 200", oldPrice: "4333.33 EUR", newPrice: "5791.67 GBP", priceWithVAT: "6950 GBP", nameChanged: false, priceChanged: true, skuChanged: false },
    { sku: "KB-SPAT-200", category: "Hot Tub", productName: "Hot tub Therma 200", oldName: "Hot tub Therma 200", oldPrice: "3791.67 EUR", newPrice: "5791.67 GBP", priceWithVAT: "6950 GBP", nameChanged: false, priceChanged: true, skuChanged: false },
    { sku: "KB-SPAT-220", category: "Hot Tub", productName: "Hot tub Therma 220", oldName: "Hot tub Therma 220", oldSKU: "SPAT-220", oldPrice: "4041.67 EUR", newPrice: "6041.67 GBP", priceWithVAT: "7250 GBP", nameChanged: false, priceChanged: true, skuChanged: true },
    
    // Outdoor Saunas
    { sku: "S280D-THE", category: "Outdoor Sauna", productName: "Outdoor Sauna Barrel 280 Deluxe", oldName: "Outdoor Sauna Barrel 280 Deluxe", oldPrice: "8208.33 EUR", newPrice: "8291.67 GBP", priceWithVAT: "9950 GBP", nameChanged: false, priceChanged: true, skuChanged: false },
    { sku: "SC-THE", category: "Outdoor Sauna", productName: "Outdoor Sauna Cube 300", oldName: "Outdoor Sauna Cubus", oldPrice: "8791.67 EUR", newPrice: "8958.33 GBP", priceWithVAT: "10750 GBP", nameChanged: true, priceChanged: true, skuChanged: false },
    { sku: "SC220-THE-FGW", category: "Outdoor Sauna", productName: "Outdoor Sauna Cube 220", oldName: "Cube 220 Outdoor Sauna with Full Glass Front | SC220-THE-FGW", oldPrice: "7875 EUR", newPrice: "8125 GBP", priceWithVAT: "9750 GBP", nameChanged: true, priceChanged: true, skuChanged: false },
    { sku: "SC125-THE", category: "Outdoor Sauna", productName: "Outdoor Sauna Cube 125", oldName: "Outdoor Sauna Cube 125", oldPrice: "6208.33 EUR", newPrice: "6458.33 GBP", priceWithVAT: "7750 GBP", nameChanged: false, priceChanged: true, skuChanged: false },
    { sku: "SE-HIKI-L", category: "Outdoor Sauna", productName: "Outdoor Sauna Hiki L", oldName: "Outdoor Sauna Hiki L", oldPrice: "9125 EUR", newPrice: "9125 GBP", priceWithVAT: "10950 GBP", nameChanged: false, priceChanged: true, skuChanged: false },
    { sku: "SE-HIKI-S", category: "Outdoor Sauna", productName: "Outdoor Sauna Hiki S", oldName: "Outdoor Sauna Hiki S", oldPrice: "7125 EUR", newPrice: "7375 GBP", priceWithVAT: "8850 GBP", nameChanged: false, priceChanged: true, skuChanged: false },
  ];

  const summary = {
    total: allChanges.length,
    created: allChanges.filter(c => c.created).length,
    nameChanges: allChanges.filter(c => c.nameChanged).length,
    skuChanges: allChanges.filter(c => c.skuChanged).length,
    priceChanges: allChanges.filter(c => c.priceChanged).length,
    byCategory: {
      "Indoor Sauna": allChanges.filter(c => c.category === "Indoor Sauna").length,
      "Ice Bath": allChanges.filter(c => c.category === "Ice Bath").length,
      "Hot Tub": allChanges.filter(c => c.category === "Hot Tub").length,
      "Outdoor Sauna": allChanges.filter(c => c.category === "Outdoor Sauna").length,
    },
  };

  return NextResponse.json({
    success: true,
    summary,
    changes: allChanges,
  });
}
