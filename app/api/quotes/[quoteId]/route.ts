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

    const quote = await getQuoteById(quoteId);

    if (!quote) {
      return NextResponse.json(
        { success: false, error: "Quote not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      quote,
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
