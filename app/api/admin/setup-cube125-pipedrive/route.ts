import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/setup-cube125-pipedrive
 * Helper endpoint to add Pipedrive products to Cube 125 configuration
 * This is a server-side helper - actual config is stored in localStorage (client-side)
 */
export async function POST(request: NextRequest) {
  try {
    // This endpoint provides instructions since config is stored client-side
    // The actual setup needs to be done through the admin interface
    
    return NextResponse.json({
      success: true,
      message: "To add Pipedrive products to Cube 125, use the admin interface",
      instructions: {
        step1: "Go to /admin/products/cube-125",
        step2: "Click on 'Steps & Options' tab",
        step3: "Expand each step",
        step4: "Use the Pipedrive Product Selector for each option",
        recommendedProducts: {
          lighting: {
            search: "Hiki",
            select: "Sauna Exterior Hiki L",
            id: 6689,
            price: 8902.44
          },
          "aromas-accessories": [
            {
              search: "Whisk or Oak",
              select: "Natural Oak Sauna Whisk",
              id: 6688,
              price: 22.72
            },
            {
              search: "Birch or Whisk",
              select: "Organic Birch Sauna Whisk",
              id: 6690,
              price: 22.72
            }
          ],
          "electrical-assembly": {
            search: "Installation or Ice",
            select: "Ice Bath Installation",
            id: 6677,
            price: 162.60
          },
          "cold-plunge": {
            search: "Chiller or Cooling",
            select: "Cooling and Heating Unit",
            id: 6692,
            price: 2642.28
          }
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process request",
      },
      { status: 500 }
    );
  }
}



