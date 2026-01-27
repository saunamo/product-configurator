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
    console.error(`[Quote API GET] Error retrieving quote ${quoteId}:`, error);
    console.error(`[Quote API GET] Error stack:`, error.stack);
    console.error(`[Quote API GET] Error details:`, {
      message: error.message,
      name: error.name,
      code: error.code,
    });
    
    // If it's a "not found" type error, return 404 instead of 500
    if (error.message?.includes('not found') || 
        error.message?.includes('404') ||
        error.message?.includes('PIPEDRIVE_API_TOKEN is not configured')) {
      return NextResponse.json(
        {
          success: false,
          error: "Quote not found",
        },
        { status: 404 }
      );
    }
    
    // For other errors, return 500 with detailed error (only in development)
    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === 'development' 
          ? error.message || "Failed to retrieve quote"
          : "Failed to retrieve quote. Please try again.",
      },
      { status: 500 }
    );
  }
}
