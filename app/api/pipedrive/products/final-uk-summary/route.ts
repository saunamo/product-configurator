import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/pipedrive/products/final-uk-summary
 * Final summary of all UK product changes
 */
export async function POST(request: NextRequest) {
  const allChanges = [
    // Name and Price Changes
    { sku: "SI-AISTI220", oldName: "Outdoor Sauna Aisti 220", newName: "Indoor Sauna Thermo Black 220", oldPrice: "7416.67 EUR", newPrice: "7916.67 GBP", priceWithVAT: "9500 GBP", nameChanged: true },
    { sku: "SI-AISTI150", oldName: "Outdoor Sauna Aisti 150", newName: "Indoor Sauna Aisti 150", oldPrice: "6250 EUR", newPrice: "6250 GBP", priceWithVAT: "7500 GBP", nameChanged: true },
    { sku: "CT-CUBE-THE", oldSKU: "ICE-BATH-INSTALLATION", oldName: "Ice bath Cube", newName: "Ice bath Cube", oldPrice: "166.67 EUR", newPrice: "4791.67 GBP", priceWithVAT: "5750 GBP", nameChanged: false, skuChanged: true },
    { sku: "CT-OFURO", oldName: "Ice bath Ofuro", newName: "Ice bath Ofuro", oldPrice: "5625 EUR", newPrice: "5791.67 GBP", priceWithVAT: "6950 GBP", nameChanged: false },
    { sku: "CT-ERGO-THE", oldName: "Ice bath Ergo", newName: "Ice bath Ergo", oldPrice: "4583.33 EUR", newPrice: "4791.67 GBP", priceWithVAT: "5750 GBP", nameChanged: false },
    { sku: "KB-SPAT-220", oldSKU: "SPAT-220", oldName: "Hot tub Therma 220", newName: "Hot tub Therma 220", oldPrice: "4041.67 EUR", newPrice: "6041.67 GBP", priceWithVAT: "7250 GBP", nameChanged: false, skuChanged: true },
    { sku: "SPA-VELLAMO-L", oldName: "Hot tub Vellamo L", newName: "Hot tub Vellamo L", oldPrice: "6625 EUR", newPrice: "6875 GBP", priceWithVAT: "8250 GBP", nameChanged: false },
    { sku: "SPA-VELLAMO-M", oldName: "Hot tub Vellamo M", newName: "Hot tub Vellamo M", oldPrice: "6375 EUR", newPrice: "6625 GBP", priceWithVAT: "7950 GBP", nameChanged: false },
    { sku: "SPA-VELLAMO-S", oldName: "Hot tub Vellamo S", newName: "Hot tub Vellamo S", oldPrice: "5958.33 EUR", newPrice: "6125 GBP", priceWithVAT: "7350 GBP", nameChanged: false },
    { sku: "SPA-C200", oldName: "Hot tub Cube 200", newName: "Hot tub Cube 200", oldPrice: "4333.33 EUR", newPrice: "5791.67 GBP", priceWithVAT: "6950 GBP", nameChanged: false },
    { sku: "KB-SPAT-200", oldName: "Hot tub Therma 200", newName: "Hot tub Therma 200", oldPrice: "3791.67 EUR", newPrice: "5791.67 GBP", priceWithVAT: "6950 GBP", nameChanged: false },
    { sku: "S280D-THE", oldName: "Outdoor Sauna Barrel 280 Deluxe", newName: "Outdoor Sauna Barrel 280 Deluxe", oldPrice: "8208.33 EUR", newPrice: "8291.67 GBP", priceWithVAT: "9950 GBP", nameChanged: false },
    { sku: "SC-THE", oldName: "Outdoor Sauna Cubus", newName: "Outdoor Sauna Cube 300", oldPrice: "8791.67 EUR", newPrice: "8958.33 GBP", priceWithVAT: "10750 GBP", nameChanged: true },
    { sku: "SC220-THE-FGW", oldName: "Cube 220 Outdoor Sauna with Full Glass Front | SC220-THE-FGW", newName: "Outdoor Sauna Cube 220", oldPrice: "7875 EUR", newPrice: "8125 GBP", priceWithVAT: "9750 GBP", nameChanged: true },
    { sku: "SC125-THE", oldName: "Outdoor Sauna Cube 125", newName: "Outdoor Sauna Cube 125", oldPrice: "6208.33 EUR", newPrice: "6458.33 GBP", priceWithVAT: "7750 GBP", nameChanged: false },
    { sku: "SE-HIKI-L", oldName: "Outdoor Sauna Hiki L", newName: "Outdoor Sauna Hiki L", oldPrice: "9125 EUR", newPrice: "9125 GBP", priceWithVAT: "10950 GBP", nameChanged: false },
    { sku: "SE-HIKI-S", oldName: "Outdoor Sauna Hiki S", newName: "Outdoor Sauna Hiki S", oldPrice: "7125 EUR", newPrice: "7375 GBP", priceWithVAT: "8850 GBP", nameChanged: false },
  ];

  const nameChanges = allChanges.filter(c => c.nameChanged);
  const skuChanges = allChanges.filter(c => c.skuChanged);
  const priceChanges = allChanges.filter(c => c.oldPrice !== c.newPrice);

  return NextResponse.json({
    success: true,
    summary: {
      totalUpdated: allChanges.length,
      nameChanges: nameChanges.length,
      skuChanges: skuChanges.length,
      priceChanges: priceChanges.length,
    },
    nameChanges: nameChanges,
    skuChanges: skuChanges,
    allChanges: allChanges,
    missing: [
      { sku: "SPA-VELLAMO-XL", name: "Hot tub Vellamo XL", priceWithVAT: "9150 GBP", note: "Product not found in Pipedrive - may need to be created" }
    ],
  });
}
