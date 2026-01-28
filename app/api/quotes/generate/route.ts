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
      
      // Validate quote was generated
      if (!quote) {
        throw new Error("Quote generation returned undefined");
      }
      
      if (!quote.id) {
        throw new Error("Quote generated but missing ID");
      }
      
      if (!quote.items || !Array.isArray(quote.items)) {
        console.warn(`[Quote API] Quote generated but items is not an array:`, quote.items);
        quote.items = quote.items || [];
      }
      
      console.log(`[Quote API] Generated quote ${quote.id} with ${quote.items?.length || 0} items`);
      console.log(`[Quote API] Quote items after generation:`, JSON.stringify(quote.items, null, 2));
    } catch (error: any) {
      console.error("[Quote API] Failed to generate quote:", error);
      console.error("[Quote API] Error stack:", error.stack);
      console.error("[Quote API] Request body:", JSON.stringify(body, null, 2));
      return NextResponse.json(
        {
          success: false,
          error: `Failed to generate quote: ${error.message || 'Unknown error'}`,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        { status: 500 }
      );
    }

    // Check Pipedrive token once at the top
    const pipedriveToken = process.env.PIPEDRIVE_API_TOKEN;
    
    // Sync prices from Pipedrive if configured AND token is available
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
    
    // Use the pipedriveToken already declared above
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
        
        // IMPORTANT: Wait for Pipedrive to fully index the new deal before we try to add notes
        // Without this delay, note creation may silently fail because the deal isn't fully ready
        if (pipedriveDealId) {
          console.log(`[Quote API] Deal ${pipedriveDealId} created, waiting 2 seconds for Pipedrive to index...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log(`[Quote API] Wait complete, proceeding...`);
        }
        
        // Update quote ID to use Pipedrive deal ID BEFORE saving
        if (pipedriveDealId) {
          const oldQuoteId = quote.id;
          quote.id = pipedriveDealId.toString();
          console.log(`[Quote API] Updated quote ID from ${oldQuoteId} to Pipedrive deal ID: ${quote.id}`);
          console.log(`[Quote API] Quote will be saved to Pipedrive deal ${pipedriveDealId}`);
        } else {
          console.warn(`⚠️ [Quote API] No Pipedrive deal ID - quote ${quote.id} will not be saved on Netlify`);
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
      // Ensure quote is initialized before using it
      if (!quote || !quote.id) {
        console.error("❌ CRITICAL: Quote is not initialized before PDF generation");
        return NextResponse.json(
          {
            success: false,
            error: "Quote generation failed: Quote is not initialized",
          },
          { status: 500 }
        );
      }
      
      let pdfBuffer: Buffer | undefined;
      try {
        const { generateQuotePDF } = await import("@/lib/quotes/pdfGenerator");
        pdfBuffer = await generateQuotePDF(quote, adminConfig.quoteSettings);
      } catch (error: any) {
        console.error("PDF generation failed (non-critical):", error?.message || error);
        // Continue without PDF - this is not critical
        pdfBuffer = undefined;
      }

    // Initialize variables for quote saving and webhook
    let quoteSaved = false;
    let webhookResult: { success: boolean; error?: string } | undefined;
    const zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL;

    // CRITICAL: Save quote to server storage FIRST
    // The quote MUST be saved so it's retrievable at the URL we send in the email
    // Pass Pipedrive deal ID if available (for Netlify/Pipedrive storage)
    // Note: quoteSaved is already declared above, just updating it here
    try {
      console.log(`[Quote API] Saving quote ${quote.id} with ${quote.items?.length || 0} items`);
      console.log(`[Quote API] Quote items before save:`, JSON.stringify(quote.items?.slice(0, 2), null, 2), quote.items?.length > 2 ? '...' : '');
      console.log(`[Quote API] Environment: NETLIFY=${!!process.env.NETLIFY}, pipedriveDealId=${pipedriveDealId}`);
      
      await saveQuoteServer(quote, pipedriveDealId);
      quoteSaved = true;
      console.log(`✅ Quote saved to server: ${quote.id}${pipedriveDealId ? ` (Pipedrive deal: ${pipedriveDealId})` : ''}`);
      
      // CRITICAL CHECK: On Netlify, quotes must be saved to Pipedrive to be retrievable
      if (process.env.NETLIFY && !pipedriveDealId) {
        console.error(`❌ WARNING: Quote ${quote.id} was not saved to Pipedrive on Netlify.`);
        console.error(`❌ The quote URL in the email will not work because the quote cannot be retrieved.`);
        console.error(`❌ Please configure PIPEDRIVE_API_TOKEN in Netlify environment variables.`);
        quoteSaved = false; // Mark as not saved so webhook is skipped
      }
      
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
      console.error("❌ CRITICAL: Failed to save quote to server:", error);
      console.error("❌ Save error details:", {
        message: error.message,
        code: error.code,
        stack: error.stack?.substring(0, 500),
        quoteId: quote?.id,
        hasQuote: !!quote,
        pipedriveDealId,
        isNetlify: !!process.env.NETLIFY,
      });
      
      // CRITICAL: On Netlify, if note creation fails, quote CANNOT be retrieved
      // We MUST fail the request so the user knows something is wrong
      if (process.env.NETLIFY && pipedriveDealId) {
        // Deal was created but note wasn't - this is a critical failure
        console.error("❌ CRITICAL: Deal created but note not saved. Quote cannot be retrieved.");
        return NextResponse.json(
          {
            success: false,
            error: `Failed to save quote: ${error.message || 'Note creation failed'}`,
            details: process.env.NODE_ENV === 'development' ? {
              message: error.message,
              code: error.code,
              dealId: pipedriveDealId,
            } : {
              dealId: pipedriveDealId,
            },
          },
          { status: 500 }
        );
      } else if (process.env.NETLIFY && !pipedriveDealId) {
        // On Netlify without Pipedrive: quote can't be saved
        console.warn("⚠️ On Netlify: Quote generated but cannot be saved (Pipedrive not configured). Quote will not be retrievable.");
        quoteSaved = false; // Mark as not saved
        // Continue anyway - don't fail the request, but skip webhook
      } else {
        // For localhost: file system save failed, but try to continue
        console.warn("⚠️ File system save failed on localhost, but quote generation succeeded. Continuing...");
        quoteSaved = false; // Mark as not saved, but don't fail
      }
    }

    // NOW send the Zapier webhook AFTER quote is saved
    // This ensures the quote URL will work when the user clicks it in the email
    if (zapierWebhookUrl && quoteSaved) {
      try {
        console.log(`\n📤 [Webhook] Sending Zapier webhook NOW (after quote saved)...`);
        
        // Get production base URL
        let productionBaseUrl = "https://config.saunamo.co.uk"; // Default to config subdomain
        
        if (process.env.QUOTE_PORTAL_URL) {
          productionBaseUrl = process.env.QUOTE_PORTAL_URL.replace(/\/quote.*$/, '').replace(/\/$/, '');
        } else if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
          productionBaseUrl = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
        }
        
        console.log(`[Webhook] Using production base URL: ${productionBaseUrl}`);
        
        // Get product image URL
        const productConfig = body.productConfig as any;
        let productImageUrl = productConfig?.mainProductImageUrl || "";
        
        if (!productImageUrl && adminConfig) {
          productImageUrl = (adminConfig as any)?.mainProductImageUrl || "";
        }
        
        // Make URL absolute
        if (productImageUrl && !productImageUrl.startsWith('http')) {
          productImageUrl = `${productionBaseUrl}${productImageUrl.startsWith('/') ? '' : '/'}${productImageUrl}`;
        }
        
        // Quote portal URL
        const quotePortalUrl = `${productionBaseUrl}/quote/${quote.id}`;
        console.log(`[Webhook] Quote portal URL: ${quotePortalUrl}`);
        console.log(`[Webhook] Product image URL: ${productImageUrl}`);
        
        // Logo URL (no spaces in filename for email compatibility)
        const logoUrl = `${productionBaseUrl}/saunamo-logo.png`;
        console.log(`[Webhook] Logo URL: ${logoUrl}`);
        
        const companyName = process.env.COMPANY_NAME || "Saunamo, Arbor Eco LDA";
        
        const webhookPayload = {
          quoteId: quote.id,
          customerEmail: body.customerEmail,
          customerName: body.customerName || "",
          customerPhone: body.customerPhone || "",
          productName: quote.productName,
          productId: body.productId,
          productImageUrl: productImageUrl,
          logoUrl: logoUrl,
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
          quotePortalUrl: quotePortalUrl,
          companyName: companyName,
          pdfBase64: pdfBuffer ? pdfBuffer.toString('base64') : undefined,
          pdfFilename: pdfBuffer ? `quote-${quote.id}.pdf` : undefined,
        };

        console.log("📤 [Webhook] Payload summary:", {
          quoteId: webhookPayload.quoteId,
          customerEmail: webhookPayload.customerEmail,
          productName: webhookPayload.productName,
          productImageUrl: webhookPayload.productImageUrl,
          quotePortalUrl: webhookPayload.quotePortalUrl,
          logoUrl: webhookPayload.logoUrl,
          hasPdf: !!webhookPayload.pdfBase64,
          itemCount: webhookPayload.items.length,
        });

        const webhookResponse = await fetch(zapierWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload),
        });

        if (webhookResponse.ok) {
          webhookResult = { success: true };
          console.log("✅ [Webhook] Zapier webhook sent successfully!");
        } else {
          const errorText = await webhookResponse.text();
          webhookResult = { success: false, error: errorText };
          console.error("❌ [Webhook] Zapier webhook failed:", errorText);
        }
      } catch (error: any) {
        webhookResult = { success: false, error: error.message };
        console.error("❌ [Webhook] Error sending webhook:", error?.message);
      }
    } else if (!zapierWebhookUrl) {
      console.log("ℹ️ [Webhook] ZAPIER_WEBHOOK_URL not configured, skipping webhook");
    } else if (!quoteSaved) {
      console.log("⚠️ [Webhook] Quote not saved, skipping webhook (email would have broken link)");
    }

    // Final validation before returning
    if (!quote || !quote.id) {
      console.error("❌ CRITICAL: Quote is missing or has no ID before returning response");
      return NextResponse.json(
        {
          success: false,
          error: "Quote generation failed: Quote is missing or invalid",
          details: process.env.NODE_ENV === 'development' ? {
            hasQuote: !!quote,
            quoteId: quote?.id,
            quoteKeys: quote ? Object.keys(quote) : [],
          } : undefined,
        },
        { status: 500 }
      );
    }

    // Return success even if save failed - quote was generated successfully
    return NextResponse.json({
      success: true,
      quoteId: quote.id,
      quote,
      pipedriveDealId,
      quoteSaved, // Indicate if quote was actually saved
      // Email is handled by Zapier webhook
      emailSent: webhookResult?.success || false,
      emailError: webhookResult?.error,
      webhookSent: webhookResult?.success || false,
      webhookError: webhookResult?.error,
      message: quoteSaved 
        ? "Quote generated successfully. Email will be sent via Zapier."
        : "Quote generated successfully, but could not be saved permanently. Email will not be sent.",
      warning: !quoteSaved ? "Quote cannot be retrieved later. Please configure Pipedrive for permanent storage." : undefined,
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
    
    // Return detailed error message in both dev and production
    // This helps debug issues on Netlify
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate quote. Please try again.",
        details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          errorType: error.name,
          code: error.code,
        } : {
          // In production, still include error message for debugging
          message: error.message,
        },
      },
      { status: 500 }
    );
  }
}


