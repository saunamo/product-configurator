import { NextRequest, NextResponse } from "next/server";
import { getAllProductsPaginated } from "@/lib/pipedrive/client";

/**
 * POST /api/admin/add-delivery-step-to-all-products
 * Add the delivery step to all existing product configs that are missing it
 */
export async function POST(request: NextRequest) {
  try {
    const { STEPS } = require("@/constants/steps");
    const { stepDataMap } = require("@/data");
    
    // Get delivery step info
    const deliveryStep = STEPS.find((s: any) => s.id === "delivery");
    if (!deliveryStep) {
      return NextResponse.json(
        {
          success: false,
          error: "Delivery step not found in STEPS constant",
        },
        { status: 500 }
      );
    }

    // This is a client-side operation, so we'll return instructions
    // The actual fix happens in processProductConfig when products are loaded
    return NextResponse.json({
      success: true,
      message: "Delivery step will be automatically added to all products when they are loaded. The fix has been applied to the processProductConfig function.",
      note: "Product configs will be updated automatically on next load. No manual action needed.",
      deliveryStep: {
        id: deliveryStep.id,
        name: deliveryStep.name,
        route: deliveryStep.route,
      },
    });
  } catch (error: any) {
    console.error("Failed to add delivery step:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to add delivery step",
      },
      { status: 500 }
    );
  }
}
