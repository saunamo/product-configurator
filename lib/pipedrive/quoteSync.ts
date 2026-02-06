/**
 * Pipedrive Quote Integration
 * Syncs quotes to Pipedrive deals and fetches prices
 */

import { Quote } from "@/types/quote";
import { createDeal, createPerson, findPersonByEmail, getDeal, addProductsToDeal, searchDealsByPersonAndTitle, getStages } from "./client";

export type PipedriveDealConfig = {
  pipelineId?: number;
  stageId?: number;
  customFields?: Record<string, any>;
};

/**
 * Create a Pipedrive deal from a quote
 */
export async function createDealFromQuote(
  quote: Quote,
  config?: PipedriveDealConfig,
  pipedriveProductIds?: Record<string, number>
): Promise<{ dealId: number; personId?: number }> {
  // First, create or find the person (contact)
  let personId: number | undefined;

  if (quote.customerEmail) {
    try {
      // Try to find existing person by email
      const searchResult = await findPersonByEmail(quote.customerEmail);
      const existingPerson = searchResult.data?.items?.[0]?.item;

      if (existingPerson) {
        personId = existingPerson.id;
      } else {
        // Create new person
        const personData: any = {
          name: quote.customerName || quote.customerEmail.split("@")[0],
          email: [quote.customerEmail],
        };
        if (quote.customerPhone) {
          personData.phone = [quote.customerPhone];
        }

        const personResult = await createPerson(personData);
        personId = personResult.data.id;
      }
    } catch (error) {
      console.error("Failed to create/find person:", error);
      // Continue without person if it fails
    }
  }

  // Check for duplicate deals before creating a new one
  // Look for existing deals for this person with the same product
  let existingDealId: number | undefined;
  if (personId) {
    try {
      const dealTitlePattern = `${quote.customerName || quote.customerEmail.split("@")[0]}: ${quote.productName}`;
      const pipelineId = config?.pipelineId || 2;
      
      console.log(`[createDealFromQuote] Checking for duplicate deals for person ${personId} with pattern: "${dealTitlePattern}"`);
      const duplicateSearch = await searchDealsByPersonAndTitle(personId, dealTitlePattern, pipelineId);
      
      if (duplicateSearch.data && duplicateSearch.data.length > 0) {
        // Filter to only recent deals (within last 7 days) to avoid matching very old deals
        const recentDeals = duplicateSearch.data.filter((deal: any) => {
          if (!deal.add_time) return false;
          const dealDate = new Date(deal.add_time);
          const daysAgo = (Date.now() - dealDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysAgo <= 7; // Only consider deals from last 7 days
        });
        
        if (recentDeals.length > 0) {
          // Sort by most recent first
          recentDeals.sort((a: any, b: any) => {
            const dateA = new Date(a.add_time).getTime();
            const dateB = new Date(b.add_time).getTime();
            return dateB - dateA;
          });
          
          existingDealId = recentDeals[0].id;
          console.log(`⚠️ [createDealFromQuote] Found ${recentDeals.length} existing deal(s) for this customer/product. Most recent: deal ${existingDealId}`);
          console.log(`⚠️ [createDealFromQuote] Will update existing deal ${existingDealId} instead of creating duplicate`);
        }
      }
    } catch (error: any) {
      console.warn(`[createDealFromQuote] Error checking for duplicates (will create new deal):`, error?.message || error);
      // Continue to create new deal if duplicate check fails
    }
  }
  
  // If we found an existing deal, return it instead of creating a new one
  // Don't send notification for duplicate deals
  if (existingDealId) {
    console.log(`[createDealFromQuote] Using existing deal ${existingDealId} to prevent duplicate`);
    console.log(`[createDealFromQuote] Skipping lead notification (duplicate deal)`);
    return {
      dealId: existingDealId,
      personId,
    };
  }
  
  // Create the deal
  // Note: quote.id will be updated to the deal ID after creation
  const pipelineId = config?.pipelineId || 2; // Default to Saunamo Website pipeline (ID 2)
  
  // Log all available stages for debugging
  try {
    const stagesResponse = await getStages(pipelineId);
    const stages = stagesResponse.data || [];
    console.log(`[createDealFromQuote] Available stages in pipeline ${pipelineId}:`);
    stages.forEach((stage: any) => {
      console.log(`  - Stage ID ${stage.id}: "${stage.name}"`);
    });
  } catch (e) {
    console.log(`[createDealFromQuote] Could not fetch stages for logging`);
  }
  
  // Use stage ID 13 directly (hardcoded - do not change based on stage name)
  const stageId: number = 13;
  
  const dealData: any = {
    title: `Config Quote UK: ${quote.customerName || quote.customerEmail.split("@")[0]}: ${quote.productName}`,
    value: quote.total,
    currency: "GBP",
    person_id: personId,
    pipeline_id: pipelineId,
    stage_id: stageId,  // Always set stage_id to 13
  };
  
  console.log(`[createDealFromQuote] IMPORTANT: stage_id is set to ${dealData.stage_id}`);

  // Add custom fields if provided
  if (config?.customFields) {
    Object.assign(dealData, config.customFields);
  }

  console.log(`[createDealFromQuote] Creating deal with data:`, {
    title: dealData.title,
    pipeline_id: dealData.pipeline_id,
    stage_id: dealData.stage_id,
    value: dealData.value,
    currency: dealData.currency,
    person_id: dealData.person_id,
  });

  let result;
  try {
    result = await createDeal(dealData);
    console.log(`[createDealFromQuote] Deal created successfully:`, {
      dealId: result?.data?.id,
      title: result?.data?.title,
      pipeline_id: result?.data?.pipeline?.id,
      stage_id: result?.data?.stage_id,
    });
  } catch (error: any) {
    console.error("[createDealFromQuote] Failed to create deal:", error?.message || error);
    console.error("[createDealFromQuote] Deal data that failed:", JSON.stringify(dealData, null, 2));
    throw error; // Re-throw so caller knows it failed
  }
  
  if (!result || !result.data || !result.data.id) {
    throw new Error("Pipedrive deal creation returned invalid response");
  }
  
  const dealId = result.data.id;

  // Quote data will be saved to Pipedrive note by saveQuote function
  // This happens after the deal is created
  // Lead notification will be sent via Zapier webhook (configured in quote generation route)

  // Add products to the deal if Pipedrive product IDs are available
  if (pipedriveProductIds && quote.items.length > 0) {
    try {
      const productsToAdd: Array<{
        product_id: number;
        item_price: number;
        quantity: number;
        tax?: number;
        comments?: string;
      }> = [];

      console.log(`[quoteSync] Processing ${quote.items.length} items for Pipedrive deal ${dealId}`);
      console.log(`[quoteSync] Available Pipedrive product IDs:`, Object.keys(pipedriveProductIds));

      quote.items.forEach((item) => {
        // For heater stones, use the base stone product ID (not the calculated total)
        // The price should be per-package (£29.50) and quantity should be the number of packages
        const pipedriveProductId = pipedriveProductIds[item.optionId];
        
        console.log(`[quoteSync] Item "${item.optionTitle}" (${item.optionId}): pipedriveProductId=${pipedriveProductId}`);
        
        if (pipedriveProductId) {
          // For heater stones with calculated price, use the per-package price
          // For other items, use the item price
          const itemPrice = item.heaterStonesCalculatedPrice !== undefined 
            ? 29.50 // Per-package price for heater stones
            : item.price;
          
          const itemQuantity = item.heaterStonesQuantity || item.quantity || 1;
          
          // Get VAT rate from item and convert to percentage (Pipedrive expects 20 for 20%, not 0.2)
          // Default to 20% VAT if not specified (UK standard rate)
          const taxPercentage = item.vatRate !== undefined 
            ? item.vatRate * 100 // Convert decimal (0.2) to percentage (20)
            : 20; // Default 20% VAT for UK
          
          productsToAdd.push({
            product_id: pipedriveProductId,
            item_price: itemPrice,
            quantity: itemQuantity,
            tax: taxPercentage,
            comments: item.optionDescription || undefined,
          });
          
          console.log(`[quoteSync] Added product: ${item.optionTitle}, price=${itemPrice}, qty=${itemQuantity}, tax=${taxPercentage}%`);
        } else {
          console.log(`[quoteSync] Skipping item "${item.optionTitle}" - no Pipedrive product ID mapped`);
        }
      });

      if (productsToAdd.length > 0) {
        await addProductsToDeal(dealId, productsToAdd);
        console.log(`✅ Added ${productsToAdd.length} product(s) to deal ${dealId} with VAT`);
      } else {
        console.log(`⚠️ No products to add to deal ${dealId} - no Pipedrive product IDs matched`);
      }
    } catch (error) {
      console.error("Failed to add products to deal:", error);
      // Continue even if adding products fails - deal is still created
    }
  }

  return {
    dealId,
    personId,
  };
}

/**
 * Get price from Pipedrive deal custom field
 * This assumes you have custom fields set up in Pipedrive for product prices
 */
export async function getPriceFromPipedrive(
  customFieldKey: string,
  dealId?: number
): Promise<number | null> {
  if (!dealId) {
    return null;
  }

  try {
    const deal = await getDeal(dealId);
    const customFieldValue = deal.data?.[customFieldKey];
    
    if (customFieldValue && typeof customFieldValue === "number") {
      return customFieldValue;
    }
    
    return null;
  } catch (error) {
    console.error("Failed to get price from Pipedrive:", error);
    return null;
  }
}

/**
 * Sync quote items to Pipedrive deal
 * This can be used to add products/line items to a deal
 */
export async function syncQuoteItemsToDeal(
  dealId: number,
  quoteItems: Quote["items"]
): Promise<void> {
  // Pipedrive doesn't have native line items, but you can:
  // 1. Add items as custom fields (if set up)
  // 2. Add items as notes
  // 3. Use Pipedrive Products API (if you have Products add-on)
  
  // For now, we'll add a summary note
  const itemsSummary = quoteItems
    .map((item) => `${item.optionTitle}: $${item.price.toFixed(2)}`)
    .join("\n");

  // You could update the deal with this information
  // This would require implementing updateDeal functionality
  console.log("Quote items summary:", itemsSummary);
}

