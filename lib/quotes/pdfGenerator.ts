/**
 * PDF Generator Helper
 * Creates PDF documents from quotes
 */

import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { QuotePDFDocument } from "./pdf";
import { Quote } from "@/types/quote";
import { QuoteSettings } from "@/types/admin";
import { defaultQuoteSettings } from "@/constants/defaultQuoteSettings";

export async function generateQuotePDF(
  quote: Quote,
  quoteSettings?: QuoteSettings
): Promise<Buffer> {
  const processedQuote: Quote = {
    ...quote,
    createdAt: quote.createdAt instanceof Date 
      ? quote.createdAt 
      : new Date(quote.createdAt),
    expiresAt: quote.expiresAt 
      ? (quote.expiresAt instanceof Date 
          ? quote.expiresAt 
          : new Date(quote.expiresAt))
      : undefined,
  };

  // Use provided quote settings or fall back to defaults/environment variables
  const settings = quoteSettings || defaultQuoteSettings;

  // Build full company address
  const addressParts = [
    settings.companyAddress,
    settings.companyCity,
    settings.companyState,
    settings.companyZip,
    settings.companyCountry,
  ].filter(Boolean);
  const fullAddress = addressParts.join(", ");

  const pdfBuffer = await renderToBuffer(
    React.createElement(QuotePDFDocument, {
      quote: processedQuote,
      companyName: settings.companyName || process.env.COMPANY_NAME || "Saunamo, Arbor Eco LDA",
      companyAddress: fullAddress || process.env.COMPANY_ADDRESS || "",
      companyPhone: settings.companyPhone || process.env.COMPANY_PHONE || "",
      companyEmail: settings.companyEmail || process.env.COMPANY_EMAIL || "",
      companyWebsite: settings.companyWebsite || "",
      logoUrl: settings.companyLogoUrl || process.env.COMPANY_LOGO_URL,
      currency: settings.currency || "USD",
      termsAndConditions: settings.termsAndConditions || "",
      paymentTerms: settings.paymentTerms || "",
      footerText: settings.footerText || "",
      defaultNotes: settings.notes || "",
    })
  );

  return pdfBuffer;
}

