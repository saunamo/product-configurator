import { NextRequest, NextResponse } from "next/server";
import { generateQuote, syncPricesFromPipedrive } from "@/lib/quotes/generate";
import { createDealFromQuote } from "@/lib/pipedrive/quoteSync";
import { renderToBuffer } from "@react-pdf/renderer";
import { QuoteGenerationRequest, Quote } from "@/types/quote";
import { loadConfigFromStorage } from "@/utils/configStorage";
import { saveQuote as saveQuoteServer } from "@/lib/database/quotes";
import { STEPS } from "@/constants/steps";
import { stepDataMap } from "@/data";
import { defaultDesignConfig } from "@/constants/defaultDesign";
import { AdminConfig } from "@/types/admin";
import { ProductConfig } from "@/types/product";

/**
 * POST /api/quotes/generate
 * Generate a quote from configurator selections
 */
export async function POST(request: NextRequest) {
  try {
    const body: QuoteGenerationRequest = await request.json();

    // Validate request
    if (!body.selections || Object.keys(body.selections).length === 0) {
      return NextResponse.json(
        { success: false, error: "No selections provided" },
        { status: 400 }
      );
    }

    if (!body.customerEmail) {
      return NextResponse.json(
        { success: false, error: "Customer email is required" },
        { status: 400 }
      );
    }

    // Load config - check if productId is provided (multi-product) or use default (single product)
    let adminConfig: AdminConfig | ProductConfig;
    
    // If productConfig is passed from client, use it (since server can't access localStorage)
    if (body.productConfig) {
      adminConfig = body.productConfig as ProductConfig;
      // Ensure stepData exists - if missing, merge with defaults
      if (!adminConfig.stepData || Object.keys(adminConfig.stepData).length === 0) {
        console.log("[Quote Generation] ProductConfig missing stepData, merging with defaults");
        adminConfig = {
          ...adminConfig,
          stepData: { ...stepDataMap, ...(adminConfig.stepData || {}) },
        };
      }
      // Ensure steps exist
      if (!adminConfig.steps || adminConfig.steps.length === 0) {
        console.log("[Quote Generation] ProductConfig missing steps, using defaults");
        adminConfig = {
          ...adminConfig,
          steps: STEPS,
        };
      }
    } else if (body.productId) {
      // Server can't access localStorage, so we need the client to pass the config
      // For now, use default config structure - client should pass full config
      // This is a fallback that won't have the actual product configuration
      console.warn(`Product config not provided for productId: ${body.productId}. Using default config.`);
      adminConfig = {
        productId: body.productId,
        productName: body.productName || "Product",
        steps: STEPS,
        stepData: stepDataMap,
        design: defaultDesignConfig,
        priceSource: "pipedrive",
      };
    } else {
      // Single product mode: use legacy config (also can't access localStorage on server)
      // This will use default config
      adminConfig = {
        productName: "The Skuare",
        steps: STEPS,
        stepData: stepDataMap,
        design: defaultDesignConfig,
        priceSource: "pipedrive",
      };
    }

    // Generate quote
    let quote: Quote;
    try {
      quote = generateQuote(body, adminConfig);
      console.log(`[Quote API] Generated quote with ${quote.items?.length || 0} items`);
      console.log(`[Quote API] Quote items after generation:`, JSON.stringify(quote.items, null, 2));
    } catch (error: any) {
      console.error("[Quote API] Failed to generate quote:", error);
      throw new Error(`Failed to generate quote: ${error.message || 'Unknown error'}`);
    }

    // Sync prices from Pipedrive if configured AND token is available
    const pipedriveToken = process.env.PIPEDRIVE_API_TOKEN;
    if (adminConfig.priceSource === "pipedrive" && pipedriveToken) {
      try {
        // Sync prices from Pipedrive products if configured
        const pipedriveProductIds: Record<string, number> = {};
        
        // Add main product Pipedrive ID if configured
        const productConfig = body.productConfig as any;
        if (productConfig?.mainProductPipedriveId) {
          pipedriveProductIds["main-product"] = productConfig.mainProductPipedriveId;
          console.log("[Quote Generation] Added main product Pipedrive ID:", productConfig.mainProductPipedriveId);
        }
      
        // Get Pipedrive product IDs from globalSettings (preferred) or option.pipedriveProductId (fallback)
        const globalSettings = (adminConfig as any).globalSettings;
        if (globalSettings?.optionPipedriveProducts) {
          Object.entries(globalSettings.optionPipedriveProducts).forEach(([optionId, productId]) => {
            if (typeof productId === 'number') {
              pipedriveProductIds[optionId] = productId;
            }
          });
        }
        
        // Also check option.pipedriveProductId as fallback
        Object.values(adminConfig.stepData).forEach((stepData) => {
          stepData.options.forEach((option) => {
            if (option.pipedriveProductId && !pipedriveProductIds[option.id]) {
              pipedriveProductIds[option.id] = option.pipedriveProductId;
            }
          });
        });

        if (Object.keys(pipedriveProductIds).length > 0) {
          try {
            const quoteBeforeSync = { ...quote };
            quote = await syncPricesFromPipedrive(quote, pipedriveProductIds);
            console.log(`[Quote API] After Pipedrive sync: ${quote.items?.length || 0} items`);
            console.log(`[Quote API] Items before sync: ${quoteBeforeSync.items?.length || 0}, after sync: ${quote.items?.length || 0}`);
            if (quote.items?.length !== quoteBeforeSync.items?.length) {
              console.error(`[Quote API] WARNING: Items count changed during sync! Before: ${quoteBeforeSync.items?.length}, After: ${quote.items?.length}`);
            }
          } catch (error: any) {
            console.error("⚠️ Pipedrive price sync failed, using stored prices:", error?.message || error);
            // Continue with original prices - this is not critical
          }
        }
      } catch (error: any) {
        console.error("⚠️ Error setting up Pipedrive price sync:", error?.message || error);
        // Continue without price sync - quote will use stored prices
      }
    } else if (adminConfig.priceSource === "pipedrive" && !pipedriveToken) {
      console.log("ℹ️ Pipedrive price source configured but PIPEDRIVE_API_TOKEN not set, using stored prices");
    }

    // Create deal in Pipedrive if configured (OPTIONAL - don't fail if this doesn't work)
    let pipedriveDealId: number | undefined;
    
    // Check if Pipedrive is configured before attempting to create deal
    const pipedriveToken = process.env.PIPEDRIVE_API_TOKEN;
    if (pipedriveToken) {
      try {
        // Collect Pipedrive product IDs from quote items
        const pipedriveProductIds: Record<string, number> = {};
        
        if (adminConfig.priceSource === "pipedrive") {
          // Get Pipedrive product IDs from globalSettings (preferred) or option.pipedriveProductId (fallback)
          const globalSettings = (adminConfig as any).globalSettings;
          if (globalSettings?.optionPipedriveProducts) {
            Object.entries(globalSettings.optionPipedriveProducts).forEach(([optionId, productId]) => {
              if (typeof productId === 'number') {
                pipedriveProductIds[optionId] = productId;
              }
            });
          }
          
          // Also check option.pipedriveProductId as fallback
          Object.values(adminConfig.stepData).forEach((stepData) => {
            stepData.options.forEach((option) => {
              if (option.pipedriveProductId && !pipedriveProductIds[option.id]) {
                pipedriveProductIds[option.id] = option.pipedriveProductId;
              }
            });
          });
        }

        const dealResult = await createDealFromQuote(quote, undefined, pipedriveProductIds);
        pipedriveDealId = dealResult.dealId;
        
        // Update quote ID to use Pipedrive deal ID BEFORE saving
        if (pipedriveDealId) {
          quote.id = pipedriveDealId.toString();
          console.log(`[Quote API] Updated quote ID to Pipedrive deal ID: ${quote.id}`);
        }
      } catch (error: any) {
        console.error("⚠️ Failed to create Pipedrive deal (non-critical):", error?.message || error);
        // Continue even if Pipedrive deal creation fails - quote will keep original ID
        // This is OPTIONAL - quote generation should work without Pipedrive
        pipedriveDealId = undefined;
      }
    } else {
      console.log("ℹ️ [Quote API] PIPEDRIVE_API_TOKEN not configured, skipping deal creation (quote will still be generated)");
    }

      // Generate PDF (use updated quote ID)
      let pdfBuffer: Buffer | undefined;
      try {
        const { generateQuotePDF } = await import("@/lib/quotes/pdfGenerator");
        pdfBuffer = await generateQuotePDF(quote, adminConfig.quoteSettings);
      } catch (error: any) {
        console.error("PDF generation failed (non-critical):", error?.message || error);
        // Continue without PDF - this is not critical
        pdfBuffer = undefined;
      }

    // CRITICAL: Only send webhook if quote was saved successfully
    // The URL in the email must point to a quote that actually exists
    let webhookResult: { success: boolean; error?: string } | undefined;
    const zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL;
    
    if (zapierWebhookUrl && quoteSaved) {
      try {
        // Get production base URL - prioritize environment variables (set in Netlify)
        // This ensures emails always use the public-facing URL, not localhost or internal URLs
        let productionBaseUrl = "https://saunamo.co.uk"; // Default fallback
        
        if (process.env.QUOTE_PORTAL_URL) {
          // Extract base URL from QUOTE_PORTAL_URL (e.g., "https://saunamo.co.uk/quote" -> "https://saunamo.co.uk")
          productionBaseUrl = process.env.QUOTE_PORTAL_URL.replace(/\/quote.*$/, '').replace(/\/$/, '');
        } else if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
          productionBaseUrl = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
        }
        
        console.log(`[Quote API] Using production base URL: ${productionBaseUrl}`);
        console.log(`[Quote API] Quote ID for URL: ${quote.id}`);
        
        // Get product image URL - check multiple sources
        const productConfig = body.productConfig as any;
        let productImageUrl = productConfig?.mainProductImageUrl || "";
        
        // If still empty, try to get from admin config (fallback)
        if (!productImageUrl && adminConfig) {
          productImageUrl = (adminConfig as any)?.mainProductImageUrl || "";
        }
        
        // If it's a relative URL, make it absolute using production URL
        if (productImageUrl && !productImageUrl.startsWith('http')) {
          productImageUrl = `${productionBaseUrl}${productImageUrl.startsWith('/') ? '' : '/'}${productImageUrl}`;
        }
        
        // Construct quote portal URL - use production URL from env or request
        // Use QUOTE_PORTAL_URL if set, otherwise construct from production base URL
        // IMPORTANT: Use the FINAL quote.id (after Pipedrive deal creation if successful)
        const quotePortalBase = process.env.QUOTE_PORTAL_URL 
          ? process.env.QUOTE_PORTAL_URL.replace(/\/$/, '')
          : `${productionBaseUrl}/quote`;
        const quotePortalUrl = `${quotePortalBase}/${quote.id}`;
        
        console.log(`[Quote API] Quote portal URL for email: ${quotePortalUrl}`);
        
        const companyName = process.env.COMPANY_NAME || "Saunamo, Arbor Eco LDA";
        
        // Get logo URL - use absolute production URL for email
        let logoUrl = "";
        const logoPath = "/Saunamo-Logo text only Bold-2.png";
        if (logoPath) {
          logoUrl = `${productionBaseUrl}${logoPath}`;
        }
        
        const webhookPayload = {
          quoteId: quote.id,
          customerEmail: body.customerEmail,
          customerName: body.customerName || "",
          customerPhone: body.customerPhone || "",
          productName: quote.productName,
          productId: body.productId,
          productImageUrl: productImageUrl, // Product image for email template
          logoUrl: logoUrl, // Logo URL for email template
          total: quote.total,
          subtotal: quote.subtotal,
          tax: quote.tax || 0,
          items: quote.items.map(item => ({
            stepName: item.stepName,
            optionTitle: item.optionTitle,
            price: item.price,
            quantity: item.quantity,
            total: item.price * item.quantity,
          })),
          createdAt: quote.createdAt,
          expiresAt: quote.expiresAt,
          notes: body.notes || "",
          // Additional data for Zapier email generation
          quotePortalUrl: quotePortalUrl, // Link to quote portal page
          companyName: companyName,
          // Include PDF as base64 if available (Zapier can attach it to email)
          pdfBase64: pdfBuffer ? pdfBuffer.toString('base64') : undefined,
          pdfFilename: pdfBuffer ? `quote-${quote.id}.pdf` : undefined,
        };

        // Log webhook payload for debugging (excluding base64 PDF)
        console.log("📤 Sending webhook to Zapier:", {
          quoteId: webhookPayload.quoteId,
          customerEmail: webhookPayload.customerEmail,
          productName: webhookPayload.productName,
          productImageUrl: webhookPayload.productImageUrl,
          quotePortalUrl: webhookPayload.quotePortalUrl,
          hasPdf: !!webhookPayload.pdfBase64,
          itemCount: webhookPayload.items.length,
        });

        const webhookResponse = await fetch(zapierWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(webhookPayload),
        });

        if (webhookResponse.ok) {
          webhookResult = { success: true };
          console.log("✅ Quote webhook sent to Zapier successfully (email will be sent via Zapier)");
        } else {
          const errorText = await webhookResponse.text();
          webhookResult = { success: false, error: errorText };
          console.error("⚠️ Zapier webhook failed:", errorText);
        }
      } catch (error: any) {
        webhookResult = { success: false, error: error.message };
        console.error("⚠️ Failed to send webhook to Zapier:", error);
        // Continue even if webhook fails
      }
    } else {
      console.log("ℹ️ ZAPIER_WEBHOOK_URL not configured, skipping webhook (email will not be sent)");
    }

    // CRITICAL: Save quote to server storage BEFORE constructing URL and sending webhook
    // The quote MUST be saved so it's retrievable at the URL we send in the email
    // Pass Pipedrive deal ID if available (for Netlify/Pipedrive storage)
    let quoteSaved = false;
    try {
      console.log(`[Quote API] Saving quote ${quote.id} with ${quote.items?.length || 0} items`);
      console.log(`[Quote API] Quote items before save:`, JSON.stringify(quote.items?.slice(0, 2), null, 2), quote.items?.length > 2 ? '...' : '');
      console.log(`[Quote API] Environment: NETLIFY=${!!process.env.NETLIFY}, pipedriveDealId=${pipedriveDealId}`);
      
      await saveQuoteServer(quote, pipedriveDealId);
      quoteSaved = true;
      console.log(`✅ Quote saved to server: ${quote.id}${pipedriveDealId ? ` (Pipedrive deal: ${pipedriveDealId})` : ''}`);
      
      // For Netlify: Wait longer for Pipedrive note to be indexed before responding
      // This gives Pipedrive time to make the note searchable
      if (process.env.NETLIFY && pipedriveDealId) {
        console.log(`[Quote API] Waiting 2 seconds for Pipedrive note to be indexed (Netlify)...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log(`[Quote API] Wait complete, quote should now be retrievable`);
      }
      
      // Verify quote was saved by trying to read it back (for file system)
      // Add a small delay to allow file system to flush
      if (!process.env.NETLIFY && !process.env.VERCEL) {
        // Wait a bit for file system to flush
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
          const { getQuoteById } = await import("@/lib/database/quotes");
          // Retry up to 3 times with increasing delays
          let verifyQuote = null;
          for (let attempt = 1; attempt <= 3; attempt++) {
            verifyQuote = await getQuoteById(quote.id);
            if (verifyQuote) {
              console.log(`✅ Verified quote ${quote.id} can be retrieved with ${verifyQuote.items?.length || 0} items (attempt ${attempt})`);
              break;
            }
            if (attempt < 3) {
              console.log(`⚠️ Quote ${quote.id} not found on attempt ${attempt}, retrying in ${attempt * 100}ms...`);
              await new Promise(resolve => setTimeout(resolve, attempt * 100));
            }
          }
          
          if (!verifyQuote) {
            console.error(`❌ CRITICAL: Quote ${quote.id} was saved but cannot be retrieved after 3 attempts`);
            // Don't fail the request, but log the error
          }
        } catch (verifyError) {
          console.error(`❌ Error verifying quote save:`, verifyError);
          // Don't fail the request, but log the error
        }
      }
    } catch (error: any) {
      console.error("❌ Failed to save quote to server:", error);
      console.error("❌ Save error details:", {
        message: error.message,
        code: error.code,
        stack: error.stack?.substring(0, 300),
      });
      
      // On Netlify, if Pipedrive save fails, try to continue anyway
      // The quote might still be accessible via the deal ID
      if (process.env.NETLIFY && pipedriveDealId) {
        console.warn("⚠️ On Netlify: Pipedrive save failed but deal was created, continuing...");
        // Continue - quote ID is the deal ID, so it might still work
      } else {
        // For localhost or if no deal ID, fail the request
        return NextResponse.json(
          {
            success: false,
            error: "Failed to save quote. Please try again.",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      quoteId: quote.id,
      quote,
      pipedriveDealId,
      // Email is handled by Zapier webhook
      emailSent: webhookResult?.success || false,
      emailError: webhookResult?.error,
      webhookSent: webhookResult?.success || false,
      webhookError: webhookResult?.error,
      message: "Quote generated successfully. Email will be sent via Zapier.",
    });
  } catch (error: any) {
    console.error("❌ Quote generation error:", error);
    console.error("❌ Error stack:", error.stack);
    console.error("❌ Error details:", {
      message: error.message,
      name: error.name,
      code: error.code,
      status: error.status,
    });
    
    // Return more detailed error in development, generic in production
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message || "Failed to generate quote"
      : "Failed to generate quote. Please try again.";
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && {
          details: error.stack,
          errorType: error.name,
        }),
      },
      { status: 500 }
    );
  }
}


