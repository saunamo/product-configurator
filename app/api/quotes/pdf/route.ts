import { NextRequest, NextResponse } from "next/server";
import { generateQuotePDF } from "@/lib/quotes/pdfGenerator";
import { Quote } from "@/types/quote";

/**
 * POST /api/quotes/pdf
 * Generate PDF for a quote
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const quote: Quote = body.quote;
    const quoteSettings = body.quoteSettings; // Optional quote settings

    if (!quote) {
      return NextResponse.json(
        { success: false, error: "Quote data is required" },
        { status: 400 }
      );
    }

    // Generate PDF
    const pdfBuffer = await generateQuotePDF(quote, quoteSettings);

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="quote-${quote.id}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate PDF",
      },
      { status: 500 }
    );
  }
}

