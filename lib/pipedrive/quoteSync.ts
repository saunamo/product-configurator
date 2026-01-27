/**
 * Pipedrive Quote Integration
 * Syncs quotes to Pipedrive deals and fetches prices
 */

import { Quote } from "@/types/quote";
import { createDeal, createPerson, findPersonByEmail, getDeal, addProductsToDeal } from "./client";

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

  // Create the deal
  // Note: quote.id will be updated to the deal ID after creation
  const dealData: any = {
    title: `Quote: ${quote.productName} - ${quote.customerEmail}`,
    value: quote.total,
    currency: "GBP", // Changed from USD to GBP
    person_id: personId,
  };

  // Add custom fields if provided
  if (config?.customFields) {
    Object.assign(dealData, config.customFields);
  }

  // Set stage if provided
  if (config?.stageId) {
    dealData.stage_id = config.stageId;
  }

  const result = await createDeal(dealData);
  const dealId = result.data.id;

  // Quote data will be saved to Pipedrive note by saveQuote function
  // This happens after the deal is created

  // Add products to the deal if Pipedrive product IDs are available
  if (pipedriveProductIds && quote.items.length > 0) {
    try {
      const productsToAdd: Array<{
        product_id: number;
        item_price: number;
        quantity: number;
      }> = [];

      quote.items.forEach((item) => {
        // For heater stones, use the base stone product ID (not the calculated total)
        // The price should be per-package (£29.50) and quantity should be the number of packages
        const pipedriveProductId = pipedriveProductIds[item.optionId];
        if (pipedriveProductId) {
          // For heater stones with calculated price, use the per-package price
          // For other items, use the item price
          const itemPrice = item.heaterStonesCalculatedPrice !== undefined 
            ? 29.50 // Per-package price for heater stones
            : item.price;
          
          const itemQuantity = item.heaterStonesQuantity || item.quantity || 1;
          
          productsToAdd.push({
            product_id: pipedriveProductId,
            item_price: itemPrice,
            quantity: itemQuantity,
          });
        }
      });

      if (productsToAdd.length > 0) {
        await addProductsToDeal(dealId, productsToAdd);
        console.log(`Added ${productsToAdd.length} product(s) to deal ${dealId}`);
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

