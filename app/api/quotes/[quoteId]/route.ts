import { NextRequest, NextResponse } from "next/server";
import { getQuoteById } from "@/lib/database/quotes";

/**
 * GET /api/quotes/[quoteId]
 * Retrieve a quote by ID for the quote portal
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { quoteId: string } }
) {
  try {
    const quoteId = params.quoteId;
    
    if (!quoteId) {
      return NextResponse.json(
        { success: false, error: "Quote ID is required" },
        { status: 400 }
      );
    }

    console.log(`[Quote API GET] Retrieving quote ${quoteId}`);
    const quote = await getQuoteById(quoteId);

    if (!quote) {
      console.error(`[Quote API GET] Quote ${quoteId} not found`);
      return NextResponse.json(
        { success: false, error: "Quote not found" },
        { status: 404 }
      );
    }

    console.log(`[Quote API GET] Successfully retrieved quote ${quoteId} with ${quote.items?.length || 0} items`);
    return NextResponse.json({
      success: true,
      quote,
    }, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error: any) {
    console.error("Failed to retrieve quote:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to retrieve quote",
      },
      { status: 500 }
    );
  }
}
