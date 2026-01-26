import { NextRequest, NextResponse } from "next/server";
import { Quote } from "@/types/quote";

/**
 * POST /api/quotes/webhook
 * Webhook endpoint for Zapier to listen to quote generation events
 * This allows Zapier to add quotes to Klaviyo automatically
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate webhook secret if configured
    const webhookSecret = process.env.QUOTE_WEBHOOK_SECRET;
    if (webhookSecret) {
      const providedSecret = request.headers.get("x-webhook-secret");
      if (providedSecret !== webhookSecret) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    // Return success - Zapier will receive the quote data
    return NextResponse.json({
      success: true,
      message: "Webhook received",
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      {
        success: false,
      error: error.message || "Failed to process webhook",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/quotes/webhook
 * Health check endpoint for Zapier
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Quote webhook endpoint is active",
  });
}
