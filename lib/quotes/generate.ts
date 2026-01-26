/**
 * Quote Generation Utilities
 * Generates quotes from configurator selections
 */

import { Quote, QuoteItem, QuoteGenerationRequest } from "@/types/quote";
import { AdminConfig } from "@/types/admin";
import { StepId } from "@/types/configurator";

/**
 * Generate a quote from configurator selections
 */
export function generateQuote(
  request: QuoteGenerationRequest,
  config: AdminConfig
): Quote {
  const items: QuoteItem[] = [];
  let subtotal = 0;

  // Add main product as first item if mainProductPipedriveId is configured
  const productConfig = request.productConfig as any;
  const mainProductPipedriveId = productConfig?.mainProductPipedriveId;
  if (mainProductPipedriveId) {
    const mainProductItem: QuoteItem = {
      stepId: "main-product" as StepId,
      stepName: "Sauna",
      optionId: "main-product",
      optionTitle: config.productName || "Main Product",
      optionDescription: "Base product",
      price: 0, // Will be synced from Pipedrive later
      quantity: 1,
    };
    items.push(mainProductItem);
    console.log("[Quote Generation] Added main product item with Pipedrive ID:", mainProductPipedriveId);
  }

  // Iterate through all selections and build quote items
  console.log("[Quote Generation] Starting quote generation with selections:", JSON.stringify(request.selections, null, 2));
  console.log("[Quote Generation] Config stepData keys:", Object.keys(config.stepData || {}));
  Object.entries(request.selections).forEach(([stepId, optionIds]) => {
    // Try config stepData first, then fallback to default stepData
    let stepData = config.stepData?.[stepId];
    if (!stepData) {
      // Fallback to default stepData if not in config
      const { stepDataMap } = require("@/data");
      stepData = stepDataMap[stepId];
      if (stepData) {
        console.log(`[Quote Generation] Using default stepData for step: ${stepId}`);
      }
    }
    
    if (!stepData) {
      console.warn(`[Quote Generation] No stepData found for step: ${stepId} in config or defaults`);
      return;
    }

    const step = config.steps.find((s) => s.id === stepId);
    // Use custom display name for rear-glass-wall step
    let stepName = step?.name || stepData.title;
    if (stepId === "rear-glass-wall") {
      stepName = "Rear Wall Option";
    }
    
    console.log(`[Quote Generation] Processing step: ${stepId} (${stepName}) with ${optionIds.length} option(s):`, optionIds);
    console.log(`[Quote Generation] Available options in stepData:`, stepData.options.map(opt => ({ id: opt.id, title: opt.title })));

    optionIds.forEach((optionId) => {
      // First try to find in config stepData
      let option = stepData.options.find((opt) => opt.id === optionId);
      
      // If not found, try default stepData (for dynamically added options like heater stones)
      if (!option) {
        const { stepDataMap } = require("@/data");
        const defaultStepData = stepDataMap[stepId];
        if (defaultStepData) {
          option = defaultStepData.options.find((opt) => opt.id === optionId);
          if (option) {
            console.log(`[Quote Generation] Found option in default stepData: ${optionId}`);
          }
        }
      }
      
      if (!option) {
        console.warn(`[Quote Generation] Option not found in stepData or default: ${optionId} in step ${stepId}`);
        console.warn(`[Quote Generation] Available option IDs in stepData:`, stepData.options.map(opt => opt.id));
        return;
      }
      
      console.log(`[Quote Generation] Processing option: ${optionId} - "${option.title}"`);

      // Capitalize option title
      const capitalizedTitle = option.title.charAt(0).toUpperCase() + option.title.slice(1);
      
      // Check if this is a lighting option with multiplier (e.g., "2x 2.5m LED")
      let lightingMultiplier: number | null = null;
      let baseLightingOptionId: string | undefined = undefined;
      
      if (stepId === "lighting") {
        // Support both formats: "2x 2.5m LED" or "Under Bench (2x 2.5m LED)"
        const titleMatch = option.title.match(/(?:^|\()(\d+)x\s/i);
        if (titleMatch) {
          lightingMultiplier = parseInt(titleMatch[1], 10);
          // Find the base option (1x version) - look for "1x 2.5m LED" or similar
          const baseOption = stepData.options.find(opt => {
            const baseTitle = opt.title.toLowerCase();
            // Check for 1x pattern in title
            const has1x = baseTitle.match(/(?:^|\()1\s*x/i);
            const has2_5m = baseTitle.includes("2.5m");
            const hasLed = baseTitle.includes("led");
            // Also check if it's the "Under Bench" base option (without multiplier)
            const isUnderBenchBase = baseTitle.includes("under bench") && 
                                     !baseTitle.match(/\d+\s*x/i) &&
                                     !baseTitle.includes("backrests");
            return (has1x && has2_5m && hasLed) || isUnderBenchBase;
          });
          baseLightingOptionId = baseOption?.id;
          console.log(`[Quote Generation] Lighting multiplier detected: ${lightingMultiplier}, base option: ${baseLightingOptionId}`);
        }
      }
      
      // Check if this is a heater stones option that needs calculated price
      let heaterStonesCalculatedPrice: number | undefined = undefined;
      let heaterStonesQuantity: number | undefined = undefined;
      
      if (stepId === "heater") {
        // Check if this is a stone option
        const idLower = option.id.toLowerCase();
        const titleLower = option.title.toLowerCase();
        const isStoneOption = idLower.includes("heater-stone") || 
                             idLower.includes("stone") ||
                             idLower.includes("heaterstone") ||
                             titleLower.includes("according to") ||
                             titleLower.includes("cccording to") || // Handle typo
                             titleLower.includes("heater stone") ||
                             titleLower.includes("heaterstone");
        
        console.log(`[Quote Generation] Checking heater option: ${optionId} (id: "${option.id}", title: "${option.title}")`);
        console.log(`[Quote Generation] isStoneOption check: idLower="${idLower}", titleLower="${titleLower}", result=${isStoneOption}`);
        
        if (isStoneOption) {
          console.log(`[Quote Generation] Found heater stone option: ${optionId}`);
          // Find selected heater (not a stone option)
          const heaterStepData = config.stepData["heater"];
          if (heaterStepData) {
            const allHeaterSelections = request.selections["heater"] || [];
            console.log(`[Quote Generation] All heater selections for stones calculation:`, allHeaterSelections);
            
            const heaterOptions = heaterStepData.options.filter(opt => {
              const optIdLower = opt.id.toLowerCase();
              const optTitleLower = opt.title.toLowerCase();
              return !(optIdLower.includes("heater-stone") || 
                      optIdLower.includes("stone") ||
                      optTitleLower.includes("according to"));
            });
            
            const selectedHeaterId = allHeaterSelections.find(id => 
              heaterOptions.some(opt => opt.id === id)
            );
            
            console.log(`[Quote Generation] Selected heater ID for stones: ${selectedHeaterId}`);
            
            if (selectedHeaterId) {
              const selectedHeater = heaterOptions.find(opt => opt.id === selectedHeaterId);
              if (selectedHeater) {
                // Get original heater title (before global settings override) to extract kg
                // Try to get from default step data
                const { stepDataMap } = require("@/data");
                const defaultHeaterData = stepDataMap["heater"];
                const originalHeaterOption = defaultHeaterData?.options.find(opt => opt.id === selectedHeaterId);
                const titleToUse = originalHeaterOption?.title || selectedHeater.title;
                
                console.log(`[Quote Generation] Heater title for kg extraction: ${titleToUse}`);
                
                // Extract kg from heater title (e.g., "Aava 4.7kW (20kg)" -> 20)
                const kgMatch = titleToUse.match(/\((\d+)\s*kg\)/i) || 
                               titleToUse.match(/(\d+)\s*kg/i) ||
                               titleToUse.match(/\((\d+)kg\)/i);
                
                if (kgMatch) {
                  const kg = parseInt(kgMatch[1], 10);
                  if (!isNaN(kg)) {
                    // Calculate: (kg / 20) * 29.50
                    // 1 package = 20kg = £29.50
                    heaterStonesQuantity = kg / 20;
                    heaterStonesCalculatedPrice = heaterStonesQuantity * 29.50;
                    console.log(`[Quote Generation] Calculated stones: ${heaterStonesQuantity} packages, total: £${heaterStonesCalculatedPrice}`);
                  } else {
                    console.warn(`[Quote Generation] Failed to parse kg from match: ${kgMatch[1]}`);
                  }
                } else {
                  console.warn(`[Quote Generation] Could not extract kg from heater title: ${titleToUse}`);
                }
              } else {
                console.warn(`[Quote Generation] Selected heater not found in options: ${selectedHeaterId}`);
              }
            } else {
              console.warn(`[Quote Generation] No heater selected for stones calculation`);
            }
          }
        }
      }
      
      // For heater stones, use per-package price (£29.50) and quantity
      // For other options, use the option price
      let finalPrice: number;
      let finalQuantity: number;
      
      if (heaterStonesCalculatedPrice !== undefined && heaterStonesQuantity !== undefined) {
        // For heater stones: store per-package price and quantity separately
        // This way the PDF will show: £29.50 × 4 = £118.00
        finalPrice = 29.50; // Per-package price
        finalQuantity = heaterStonesQuantity;
      } else if (lightingMultiplier && baseLightingOptionId) {
        // For lighting with multiplier: use base option price and multiply
        // Find the base option to get its price
        const baseOption = stepData.options.find(opt => opt.id === baseLightingOptionId);
        if (baseOption) {
          // Use base option price and multiply by multiplier
          finalPrice = baseOption.price;
          finalQuantity = lightingMultiplier;
        } else {
          // Fallback: divide option price by multiplier to get base price
          finalPrice = option.price / lightingMultiplier;
          finalQuantity = lightingMultiplier;
        }
      } else {
        // For other options: use option price and quantity
        finalPrice = option.price;
        finalQuantity = 1;
      }
      
      // For heater stones, update the title to "Heater stones" and include quantity information
      let displayTitle = capitalizedTitle;
      if (heaterStonesQuantity !== undefined && heaterStonesQuantity > 0) {
        // Replace "According to selected heater" with "Heater stones"
        const baseTitle = capitalizedTitle.toLowerCase().includes("according to") 
          ? "Heater stones" 
          : capitalizedTitle;
        displayTitle = `${baseTitle} (${heaterStonesQuantity} ${heaterStonesQuantity === 1 ? 'package' : 'packages'})`;
      }
      
      items.push({
        stepId: stepId as StepId,
        stepName,
        optionId: option.id,
        optionTitle: displayTitle,
        optionDescription: option.description,
        price: finalPrice,
        quantity: finalQuantity,
        vatRate: undefined, // Will be set from Pipedrive if available
        lightingMultiplier: lightingMultiplier || undefined,
        baseLightingOptionId: baseLightingOptionId,
        heaterStonesCalculatedPrice: heaterStonesCalculatedPrice,
        heaterStonesQuantity: heaterStonesQuantity,
      });
      
      // Debug logging for heater stones
      if (heaterStonesQuantity !== undefined) {
        console.log(`[Quote Generation] Added heater stones item:`, {
          optionId: option.id,
          title: displayTitle,
          price: finalPrice,
          quantity: finalQuantity,
          totalPrice: finalPrice * finalQuantity,
        });
      }

      // Calculate subtotal: price × quantity
      subtotal += finalPrice * finalQuantity;
    });
  });

  // Calculate discount from active campaigns
  let discount = 0;
  let discountDescription: string | undefined;
  
  if (config.quoteSettings?.discountCampaigns) {
    const activeCampaigns = config.quoteSettings.discountCampaigns.filter(
      (campaign) => {
        if (!campaign.isActive) return false;
        
        // Check date range if specified
        const now = new Date();
        if (campaign.startDate && new Date(campaign.startDate) > now) return false;
        if (campaign.endDate && new Date(campaign.endDate) < now) return false;
        
        return true;
      }
    );
    
    // Find applicable campaign
    for (const campaign of activeCampaigns) {
      let applies = false;
      
      if (campaign.appliesTo === "all") {
        applies = true;
      } else if (campaign.appliesTo === "specific") {
        // Check if product matches (for multi-product support)
        if (campaign.productIds && request.productId && campaign.productIds.includes(request.productId)) {
          applies = true;
        }
      }
      
      if (applies) {
        // Calculate discount
        if (campaign.discountType === "percentage") {
          discount = subtotal * (campaign.discountValue / 100);
        } else {
          discount = campaign.discountValue;
        }
        discountDescription = campaign.name;
        break; // Apply first matching campaign
      }
    }
  }
  
  // Calculate subtotal after discount
  const subtotalAfterDiscount = subtotal - discount;
  
  // Calculate tax (if configured) - tax is calculated on discounted amount
  const taxRate = config.quoteSettings?.taxEnabled ? (config.quoteSettings.taxRate || 0) : 0;
  const tax = subtotalAfterDiscount * taxRate;
  const total = subtotalAfterDiscount + tax;

  // Calculate expiration date from quote settings
  const validityDays = config.quoteSettings?.quoteValidityDays || 30;
  const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

  return {
    id: `quote-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    productName: config.productName,
    customerEmail: request.customerEmail,
    customerName: request.customerName,
    customerPhone: request.customerPhone,
    items,
    subtotal,
    discount: discount > 0 ? discount : undefined,
    discountDescription: discount > 0 ? discountDescription : undefined,
    tax: tax > 0 ? tax : undefined,
    taxRate: taxRate > 0 ? taxRate : undefined,
    total,
    createdAt: new Date(),
    expiresAt,
    notes: request.notes || config.quoteSettings?.notes,
  };
}

/**
 * Sync prices from Shopify before generating quote
 * This is called when quote is generated, not during configurator browsing
 */
export async function syncPricesForQuote(
  quote: Quote,
  shopifyProductIds: Record<string, string> // optionId -> shopifyProductId mapping
): Promise<Quote> {
  // Get all unique Shopify product IDs
  const productIds = Object.values(shopifyProductIds).filter(Boolean);
  
  if (productIds.length === 0) {
    return quote; // No Shopify products to sync
  }

  try {
    // Fetch prices from Shopify (one-time sync)
    const response = await fetch("/api/prices/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds }),
    });

    if (response.ok) {
      const data = await response.json();
      const priceMap: Record<string, number> = data.prices || {};

      // Update quote items with synced prices
      const updatedItems = quote.items.map((item) => {
        const shopifyId = shopifyProductIds[item.optionId];
        if (shopifyId && priceMap[shopifyId]) {
          const newPrice = priceMap[shopifyId];
          return {
            ...item,
            price: newPrice,
          };
        }
        return item;
      });

      // Recalculate totals
      const newSubtotal = updatedItems.reduce((sum, item) => sum + item.price, 0);
      const tax = newSubtotal * (quote.taxRate || 0);
      const newTotal = newSubtotal + tax;

      return {
        ...quote,
        items: updatedItems,
        subtotal: newSubtotal,
        tax: tax > 0 ? tax : undefined,
        total: newTotal,
      };
    }
  } catch (error) {
    console.error("Failed to sync prices from Shopify:", error);
    // Return original quote if sync fails
  }

  return quote;
}

/**
 * Sync prices from Pipedrive products before generating quote
 * Fetches latest prices from Pipedrive product catalog
 */
export async function syncPricesFromPipedrive(
  quote: Quote,
  pipedriveProductIds: Record<string, number> // optionId -> pipedriveProductId mapping
): Promise<Quote> {
  // Get all unique Pipedrive product IDs
  const productIds = Object.values(pipedriveProductIds).filter(Boolean);
  
  if (productIds.length === 0) {
    return quote; // No Pipedrive products to sync
  }

  try {
    // Import Pipedrive client for server-side use
    const { getProduct } = await import("@/lib/pipedrive/client");
    
    // Fetch products from Pipedrive (one-time sync)
    const productDataMap: Record<number, { price: number; vatRate?: number }> = {};
    
    await Promise.all(
      productIds.map(async (productId) => {
        try {
          // Use Pipedrive client directly instead of HTTP fetch (works on server side)
          const response = await getProduct(productId);
          if (response && response.data) {
            const product = response.data;
            // Pipedrive products can have multiple prices, use the first one
            const price = product.prices?.[0]?.price || product.price || 0;
              
              // Extract VAT rate from Pipedrive product
              // Pipedrive may store VAT in different fields: tax, vat, vat_rate, tax_rate, etc.
              // Also check custom fields
              let vatRate: number | undefined;
              
              // Check common VAT/tax fields
              if (product.tax !== undefined && product.tax !== null) {
                vatRate = typeof product.tax === 'number' ? product.tax / 100 : parseFloat(product.tax) / 100;
              } else if (product.vat !== undefined && product.vat !== null) {
                vatRate = typeof product.vat === 'number' ? product.vat / 100 : parseFloat(product.vat) / 100;
              } else if (product.vat_rate !== undefined && product.vat_rate !== null) {
                vatRate = typeof product.vat_rate === 'number' ? product.vat_rate / 100 : parseFloat(product.vat_rate) / 100;
              } else if (product.tax_rate !== undefined && product.tax_rate !== null) {
                vatRate = typeof product.tax_rate === 'number' ? product.tax_rate / 100 : parseFloat(product.tax_rate) / 100;
              }
              
              // Check custom fields (Pipedrive custom fields are in a different structure)
              if (!vatRate && product.custom_fields) {
                // Look for VAT/tax in custom fields
                for (const field of product.custom_fields) {
                  const fieldName = (field.name || '').toLowerCase();
                  if ((fieldName.includes('vat') || fieldName.includes('tax')) && field.value) {
                    vatRate = typeof field.value === 'number' ? field.value / 100 : parseFloat(field.value) / 100;
                    break;
                  }
                }
              }
              
              productDataMap[productId] = { price, vatRate };
            } else {
              console.warn(`Pipedrive product ${productId} not found or has no data`);
            }
          } catch (error) {
            console.error(`Failed to fetch Pipedrive product ${productId}:`, error);
          }
      })
    );

    // Update quote items with synced prices and VAT rates
    const updatedItems = quote.items.map((item) => {
      // Don't override heater stones calculated price - it's already calculated correctly
      if (item.heaterStonesCalculatedPrice !== undefined) {
        return item; // Keep the calculated price
      }
      
      // For lighting options with multiplier, use base option's Pipedrive product
      let pipedriveProductId: number | undefined;
      if (item.lightingMultiplier && item.baseLightingOptionId) {
        pipedriveProductId = pipedriveProductIds[item.baseLightingOptionId];
      } else {
        pipedriveProductId = pipedriveProductIds[item.optionId];
      }
      
      if (pipedriveProductId && productDataMap[pipedriveProductId]) {
        const productData = productDataMap[pipedriveProductId];
        // Only update price if Pipedrive has a valid price (> 0)
        // Otherwise keep the original price from the option
        if (productData.price > 0) {
          // For lighting with multiplier, use the base price from Pipedrive
          // and multiply by the quantity (which is already set to the multiplier)
          if (item.lightingMultiplier && item.baseLightingOptionId) {
            // Use Pipedrive base price - don't multiply again, quantity is already set
            console.log(`[Quote Generation] Syncing lighting with multiplier: base price ${productData.price}, quantity ${item.quantity}`);
            return {
              ...item,
              price: productData.price, // Base price from Pipedrive (e.g., $175 for 1x)
              quantity: item.quantity || item.lightingMultiplier, // Keep existing quantity (e.g., 2)
              vatRate: productData.vatRate,
            };
          } else {
            // Regular option: use Pipedrive price
            return {
              ...item,
              price: productData.price,
              vatRate: productData.vatRate,
            };
          }
        } else {
          // Pipedrive price is 0 or invalid, keep original price but update VAT rate if available
          return {
            ...item,
            vatRate: productData.vatRate,
          };
        }
      }
      // No Pipedrive product linked, keep original price
      return item;
    });

    // Recalculate totals
    // Calculate subtotal (price * quantity for each item)
    const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    
    // Calculate total VAT amount (sum of VAT for each item)
    const totalVat = updatedItems.reduce((sum, item) => {
      const itemVatRate = item.vatRate || 0;
      const itemVat = item.price * (item.quantity || 1) * itemVatRate;
      return sum + itemVat;
    }, 0);
    
    const newTotal = newSubtotal + totalVat;

    return {
      ...quote,
      items: updatedItems,
      subtotal: newSubtotal,
      tax: totalVat > 0 ? totalVat : undefined,
      total: newTotal,
    };
  } catch (error) {
    console.error("Failed to sync prices from Pipedrive:", error);
    // Return original quote if sync fails
  }

  return quote;
}

