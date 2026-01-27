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

    // PDF filename: "Product name Quote + Name"
    const customerName = quote.customerName || quote.customerEmail.split('@')[0];
    const sanitizedName = customerName.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, ' ');
    const sanitizedProductName = quote.productName.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, ' ');
    const filename = `${sanitizedProductName} Quote ${sanitizedName}.pdf`;
    
    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
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

