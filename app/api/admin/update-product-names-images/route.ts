import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/update-product-names-images
 * Update all product configs with correct names and images
 * This is a client-side operation, so we'll return instructions
 */
export async function POST(request: NextRequest) {
  // This needs to run client-side to access localStorage
  // Return the update mapping so client can execute it
  const PRODUCT_UPDATES = {
    // Outdoor Saunas
    "cube-125": {
      name: "Outdoor Sauna Cube 125",
      imageUrl: "/outdoor-sauna-cube-125.webp",
    },
    "cube-220": {
      name: "Outdoor Sauna Cube 220",
      imageUrl: "/outdoor-sauna-cube-220.webp",
    },
    "cube-300": {
      name: "Outdoor Sauna Cube 300",
      imageUrl: "/outdoor-sauna-cube-300.webp",
    },
    "cubus": {
      name: "Outdoor Sauna Cube 300",
      imageUrl: "/outdoor-sauna-cube-300.webp",
    },
    "hiki-s": {
      name: "Outdoor Sauna Hiki S",
      imageUrl: "/outdoor-sauna-hiki-s.webp",
    },
    "hiki-l": {
      name: "Outdoor Sauna Hiki L",
      imageUrl: "/outdoor-sauna-hiki-l.webp",
    },
    "barrel-220": {
      name: "Outdoor Sauna Barrel 220",
      imageUrl: "/outdoor-sauna-barrel-220.webp",
    },
    "barrel-280": {
      name: "Outdoor Sauna Barrel 280 Deluxe",
      imageUrl: "/outdoor-sauna-barrel-280-deluxe.webp",
    },
    // Indoor Saunas
    "aisti-150": {
      name: "Indoor Sauna Aisti 150",
      imageUrl: "/indoor-sauna-aisti-150.webp",
    },
    "aisti-220": {
      name: "Indoor Sauna Thermo Black 220",
      imageUrl: "/indoor-sauna-thermo-black-220.webp",
    },
    "thermo-black-220": {
      name: "Indoor Sauna Thermo Black 220",
      imageUrl: "/indoor-sauna-thermo-black-220.webp",
    },
  };

  return NextResponse.json({
    success: true,
    message: "Use the client-side function to update products",
    updates: PRODUCT_UPDATES,
  });
}
