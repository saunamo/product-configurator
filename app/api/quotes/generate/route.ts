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
    let quote = generateQuote(body, adminConfig);
    
    console.log(`[Quote API] Generated quote with ${quote.items?.length || 0} items`);
    console.log(`[Quote API] Quote items after generation:`, JSON.stringify(quote.items, null, 2));

    // Sync prices from Pipedrive if configured
    if (adminConfig.priceSource === "pipedrive") {
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
        } catch (error) {
          console.error("Pipedrive price sync failed, using stored prices:", error);
        }
      }
    }

    // Create deal in Pipedrive if configured
    let pipedriveDealId: number | undefined;
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
    } catch (error) {
      console.error("Failed to create Pipedrive deal:", error);
      // Continue even if Pipedrive deal creation fails - quote will keep original ID
    }

      // Generate PDF (use updated quote ID)
      let pdfBuffer: Buffer | undefined;
      try {
        const { generateQuotePDF } = await import("@/lib/quotes/pdfGenerator");
        pdfBuffer = await generateQuotePDF(quote, adminConfig.quoteSettings);
      } catch (error) {
        console.error("PDF generation failed:", error);
        // Continue without PDF
      }

    // Send webhook to Zapier for email sending and Klaviyo integration (non-blocking)
    let webhookResult: { success: boolean; error?: string } | undefined;
    const zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL;
    if (zapierWebhookUrl) {
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
        const quotePortalBase = process.env.QUOTE_PORTAL_URL 
          ? process.env.QUOTE_PORTAL_URL.replace(/\/$/, '')
          : `${productionBaseUrl}/quote`;
        const quotePortalUrl = `${quotePortalBase}/${quote.id}`;
        
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

    // Save quote to server storage (for quote portal) - MUST happen before response
    // Pass Pipedrive deal ID if available (for Netlify/Pipedrive storage)
    try {
      console.log(`[Quote API] Saving quote ${quote.id} with ${quote.items?.length || 0} items`);
      console.log(`[Quote API] Quote items before save:`, JSON.stringify(quote.items?.slice(0, 2), null, 2), quote.items?.length > 2 ? '...' : '');
      await saveQuoteServer(quote, pipedriveDealId);
      console.log(`✅ Quote saved to server: ${quote.id}${pipedriveDealId ? ` (Pipedrive deal: ${pipedriveDealId})` : ''}`);
      
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
    } catch (error) {
      console.error("Failed to save quote to server:", error);
      // Don't continue if save fails - return error
      return NextResponse.json(
        {
          success: false,
          error: "Failed to save quote. Please try again.",
        },
        { status: 500 }
      );
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
    console.error("Quote generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate quote",
      },
      { status: 500 }
    );
  }
}


