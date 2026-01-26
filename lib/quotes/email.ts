/**
 * Email Utilities for Quotes
 * Sends quote emails using Resend
 */

import { Quote } from "@/types/quote";
import { Resend } from "resend";

// Initialize Resend only if API key is available
let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

/**
 * Send a quote email
 */
export async function sendQuoteEmail(
  quote: Quote,
  pdfBuffer?: Buffer,
  productImageUrl?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!resend || !process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured. Email sending disabled.");
    return {
      success: false,
      error: "Email service not configured",
    };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "info@saunamo.co.uk";
  const companyName = process.env.COMPANY_NAME || "Saunamo, Arbor Eco LDA";

  const html = generateQuoteEmailHTML(quote, companyName, productImageUrl);

  try {
    if (!resend) {
      throw new Error("Resend client not initialized");
    }

    const emailOptions: any = {
      from: fromEmail,
      to: quote.customerEmail,
      subject: `Your ${quote.productName} Quote - ${quote.id}`,
      html,
    };

    // Attach PDF if provided
    if (pdfBuffer) {
      emailOptions.attachments = [
        {
          filename: `quote-${quote.id}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ];
    }

    const data = await resend.emails.send(emailOptions);

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error: any) {
    console.error("Failed to send quote email:", error);
    return {
      success: false,
      error: error.message || "Failed to send email",
    };
  }
}

/**
 * Generate HTML email template for quote
 * Matches the Welvaere-style email design
 */
function generateQuoteEmailHTML(quote: Quote, companyName: string, productImageUrl?: string): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Get quote portal URL (you can customize this)
  const quotePortalUrl = process.env.QUOTE_PORTAL_URL || `${process.env.NEXT_PUBLIC_APP_URL || "https://saunamo.co.uk"}/quote/${quote.id}`;
  
  // Get product image URL (use provided image, quote image, or a default)
  const imageUrl = productImageUrl || (quote as any).productImageUrl || "/images/default-sauna.jpg";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Quote - ${quote.productName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Questrial', Arial, sans-serif; background-color: #F3F0ED; line-height: 1.6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #F3F0ED; padding: 20px;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #F3F0ED; border-collapse: collapse;">
          <!-- Logo Section -->
          <tr>
            <td style="padding: 30px 20px; text-align: center; background-color: #F3F0ED;">
              <div style="color: #303337; font-size: 32px; font-weight: bold; letter-spacing: 2px;">
                ${companyName}
              </div>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 20px 20px 10px 20px; background-color: #F3F0ED;">
              <h2 style="margin: 0; color: #303337; font-size: 24px; font-weight: normal;">
                Hi ${quote.customerName || "there"},
              </h2>
            </td>
          </tr>
          
          <!-- Product Image -->
          <tr>
            <td style="padding: 20px; background-color: #F3F0ED;">
              <img src="${imageUrl}" alt="${quote.productName}" style="width: 100%; max-width: 600px; height: auto; border-radius: 8px; display: block;" />
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 20px; background-color: #F3F0ED;">
              <p style="margin: 0 0 30px 0; color: #303337; font-size: 16px; line-height: 1.6;">
                Thank you for requesting a quote for a <span style="color: #D4A574;">${quote.productName}</span> from ${companyName}! View the quote easily in our quote portal through this link:
              </p>
              
              <!-- View Quote Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="${quotePortalUrl}" style="display: inline-block; padding: 15px 40px; background-color: #303337; color: #ffffff; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; text-align: center;">
                      View quote
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Quote Summary -->
              <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <h3 style="margin: 0 0 15px 0; color: #303337; font-size: 18px; font-weight: bold;">Quote Summary</h3>
                <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Quote ID:</strong> ${quote.id}</p>
                <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Quote Date:</strong> ${formatDate(quote.createdAt)}</p>
                ${quote.expiresAt ? `<p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Valid Until:</strong> ${formatDate(quote.expiresAt)}</p>` : ""}
                <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #E2DEDA;">
                  <div style="display: flex; justify-content: space-between; margin: 10px 0;">
                    <span style="color: #303337; font-size: 16px;"><strong>Total:</strong></span>
                    <span style="color: #303337; font-size: 20px; font-weight: bold;">${formatCurrency(quote.total)}</span>
                  </div>
                </div>
              </div>
              
              <p style="margin: 30px 0 0 0; color: #303337; font-size: 16px;">
                If you have any questions about this quote, please don't hesitate to contact us.
              </p>
              
              <p style="margin: 20px 0 0 0; color: #303337; font-size: 16px;">
                Best regards,<br>
                <strong>The ${companyName} Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #F3F0ED;">
              <p style="margin: 0; color: #908F8D; font-size: 12px;">
                This is an automated email. Please do not reply directly to this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

