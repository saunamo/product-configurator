/**
 * Server-side quote storage
 * For Netlify: Uses Pipedrive as storage (deals already created)
 * For local/dev: Falls back to file system if Pipedrive not available
 */

import { Quote } from "@/types/quote";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getDeal, pipedriveRequest, createNote, getDealNotes } from "@/lib/pipedrive/client";

const DATA_DIR = join(process.cwd(), "data-store");
const QUOTES_DIR = join(DATA_DIR, "quotes");

// Check if we're in a serverless environment (Netlify, Vercel, etc.)
// On localhost, NETLIFY and VERCEL are undefined, so isServerless will be false
const isServerless = !!(process.env.NETLIFY || process.env.VERCEL);

/**
 * Ensure quotes directory exists (only for file-based storage)
 */
async function ensureQuotesDir() {
  if (isServerless) return; // Skip in serverless environments
  
  try {
    await mkdir(QUOTES_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, that's fine
  }
}

/**
 * Save quote to Pipedrive deal (for Netlify/serverless)
 */
async function saveQuoteToPipedrive(quote: Quote, dealId?: number): Promise<void> {
  if (!dealId) {
    console.warn("No Pipedrive deal ID provided, cannot save quote to Pipedrive");
    return;
  }

  try {
    // Store full quote JSON in a custom field or as a note
    // Using a custom field named "quote_data" (you'll need to create this in Pipedrive)
    // Or we can use the deal's notes field
    
    const quoteData = {
      ...quote,
      createdAt: quote.createdAt instanceof Date ? quote.createdAt.toISOString() : quote.createdAt,
      expiresAt: quote.expiresAt instanceof Date ? quote.expiresAt.toISOString() : quote.expiresAt,
    };
    
    console.log(`[Quote Save] Saving quote to Pipedrive with ${quoteData.items?.length || 0} items`);
    console.log(`[Quote Save] Quote items:`, JSON.stringify(quoteData.items, null, 2));

    // Store full quote JSON as a note in Pipedrive
    try {
      await createNote({
        content: `QUOTE_DATA_JSON:\n${JSON.stringify(quoteData, null, 2)}`,
        deal_id: dealId,
        pinned_to_deal_flag: 1, // Pin the note so it's easy to find
      });
      console.log(`✅ Quote saved to Pipedrive deal ${dealId} as note with ${quoteData.items?.length || 0} items`);
    } catch (noteError) {
      console.error("Could not save quote to Pipedrive note:", noteError);
      throw noteError;
    }
  } catch (error) {
    console.error("Failed to save quote to Pipedrive:", error);
    throw error;
  }
}

/**
 * Get quote from Pipedrive deal
 * Searches for deal by quote ID in deal title or notes
 * Includes retry logic to handle timing issues with Pipedrive indexing
 */
async function getQuoteFromPipedrive(quoteId: string, retries = 3): Promise<Quote | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Search for deal by quote ID in title
      // Deal title format: "Quote {quoteId}: ..."
      const searchResponse = await pipedriveRequest<{ data: { items?: Array<{ item: any }> } }>(
        `/deals/search?term=${encodeURIComponent(quoteId)}&fields=title`
      );

      const deals = searchResponse.data?.items || [];
      
      // Find deal that has quote ID in title
      const matchingDeal = deals.find((item: any) => 
        item.item?.title?.includes(quoteId)
      );

      if (!matchingDeal) {
        if (attempt < retries) {
          // Wait before retrying (Pipedrive search might need time to index)
          console.log(`[Quote Retrieval] Attempt ${attempt}/${retries}: Deal not found yet, retrying in ${attempt * 500}ms...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
          continue;
        }
        console.warn(`No Pipedrive deal found for quote ${quoteId} after ${retries} attempts`);
        return null;
      }

      const dealId = matchingDeal.item.id;
      
      // Get deal details
      const deal = await getDeal(dealId);
      
      // Try to get quote data from deal notes
      // For now, reconstruct quote from deal data
      // In production, you'd store full quote JSON in a note or custom field
      
      // Get notes for this deal
      try {
        const notesResponse = await getDealNotes(dealId);
        const notes = notesResponse.data || [];
        
        // Look for note with full quote JSON (starts with QUOTE_DATA_JSON:)
        const quoteNote = notes.find((note: any) => 
          note.content?.startsWith('QUOTE_DATA_JSON:')
        );
        
        if (quoteNote) {
          // Extract JSON from note content
          const jsonContent = quoteNote.content.replace('QUOTE_DATA_JSON:\n', '');
          let quoteData;
          try {
            quoteData = JSON.parse(jsonContent);
          } catch (parseError) {
            console.error(`[Quote Retrieval] Failed to parse quote JSON from Pipedrive note:`, parseError);
            console.error(`[Quote Retrieval] Note content (first 500 chars):`, quoteNote.content.substring(0, 500));
            return null;
          }
          console.log(`[Quote Retrieval] Retrieved quote ${quoteId} from Pipedrive, items count: ${quoteData.items?.length || 0}`);
          console.log(`[Quote Retrieval] Quote items:`, JSON.stringify(quoteData.items, null, 2));
          
          // Ensure items array exists and is properly formatted
          const items = Array.isArray(quoteData.items) ? quoteData.items : [];
          if (items.length === 0 && quoteData.items) {
            console.warn(`[Quote Retrieval] Items array is empty but quoteData.items exists:`, quoteData.items);
          }
          
          return {
            ...quoteData,
            createdAt: quoteData.createdAt ? new Date(quoteData.createdAt) : new Date(),
            expiresAt: quoteData.expiresAt ? new Date(quoteData.expiresAt) : undefined,
            // Ensure items array exists and is an array
            items: items,
          } as Quote;
        }
      } catch (noteError) {
        console.warn("Could not retrieve quote from Pipedrive notes:", noteError);
      }

      // Fallback: Reconstruct basic quote from deal data
      // This won't have all items, but it's better than nothing
      const dealData = deal.data;
      return {
        id: quoteId,
        productName: dealData.title?.replace(`Quote ${quoteId}: `, '').split(' - ')[0] || 'Unknown Product',
        customerEmail: dealData.title?.split(' - ')[1] || '',
        total: dealData.value || 0,
        subtotal: dealData.value || 0,
        items: [], // Items would need to be retrieved from deal products
        createdAt: new Date(),
        customerName: '',
      } as Quote;
    } catch (error) {
      console.error(`[Quote Retrieval] Attempt ${attempt} failed:`, error);
      if (attempt < retries) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, attempt * 500));
        continue;
      }
      console.error("Failed to get quote from Pipedrive after all retries:", error);
      return null;
    }
  }
  
  return null;
}

/**
 * Save a quote to server storage
 * Uses Pipedrive for Netlify, file system for local dev
 */
export async function saveQuote(quote: Quote, pipedriveDealId?: number): Promise<void> {
  console.log(`[saveQuote] Saving quote ${quote.id}, items count: ${quote.items?.length || 0}`);
  console.log(`[saveQuote] Quote items:`, JSON.stringify(quote.items, null, 2));
  console.log(`[saveQuote] isServerless: ${isServerless}, NETLIFY: ${process.env.NETLIFY}, VERCEL: ${process.env.VERCEL}, pipedriveDealId: ${pipedriveDealId}`);
  
  // On Netlify (serverless), save to Pipedrive only (file system is ephemeral)
  if (isServerless) {
    if (pipedriveDealId) {
      try {
        await saveQuoteToPipedrive(quote, pipedriveDealId);
        console.log(`✅ Quote saved to Pipedrive deal ${pipedriveDealId}`);
        return; // Success - return early
      } catch (error) {
        console.error(`❌ Failed to save quote to Pipedrive:`, error);
        throw error; // Re-throw - this is required on Netlify
      }
    } else {
      // On Netlify but no Pipedrive deal ID - this shouldn't happen, but try file system as last resort
      console.warn(`⚠️ On Netlify but no Pipedrive deal ID provided. Attempting file system save (may fail).`);
    }
  }
  
  // For local development, ALWAYS save to file system
  console.log(`[saveQuote] Saving to file system (localhost mode)`);
  await ensureQuotesDir();
  
  const quoteFile = join(QUOTES_DIR, `${quote.id}.json`);
  const quoteToSave = {
    ...quote,
    createdAt: quote.createdAt instanceof Date ? quote.createdAt.toISOString() : quote.createdAt,
    expiresAt: quote.expiresAt instanceof Date ? quote.expiresAt.toISOString() : quote.expiresAt,
  };
  
  try {
    await writeFile(quoteFile, JSON.stringify(quoteToSave, null, 2), "utf-8");
    console.log(`✅ Quote saved to file: ${quote.id} at ${quoteFile}`);
    
    // Verify file was written
    const { readFile } = await import("fs/promises");
    const verifyData = await readFile(quoteFile, "utf-8");
    const verifyQuote = JSON.parse(verifyData);
    console.log(`✅ Verified quote file written: ${verifyQuote.id} with ${verifyQuote.items?.length || 0} items`);
  } catch (error: any) {
    console.error(`❌ Failed to save quote to file system:`, error);
    console.error(`❌ Error details:`, error.message, error.code, error.path);
    throw error; // Re-throw so caller knows save failed
  }
}

/**
 * Get a quote by ID
 * Tries Pipedrive first (for Netlify), falls back to file system
 */
export async function getQuoteById(quoteId: string): Promise<Quote | null> {
  console.log(`[getQuoteById] Looking for quote ${quoteId}, isServerless: ${isServerless}`);
  
  // Try Pipedrive first (for Netlify)
  if (isServerless) {
    try {
      const pipedriveQuote = await getQuoteFromPipedrive(quoteId);
      if (pipedriveQuote) {
        console.log(`✅ Found quote ${quoteId} in Pipedrive with ${pipedriveQuote.items?.length || 0} items`);
        return pipedriveQuote;
      } else {
        console.log(`⚠️ Quote ${quoteId} not found in Pipedrive, trying file system fallback`);
      }
    } catch (error) {
      console.error(`❌ Error retrieving quote from Pipedrive:`, error);
      // Fall through to file system
    }
  }

  // Fallback to file system (for localhost)
  try {
    // Ensure quotes directory exists
    await ensureQuotesDir();
    
    const quoteFile = join(QUOTES_DIR, `${quoteId}.json`);
    console.log(`[getQuoteById] Attempting to read quote file: ${quoteFile}`);
    
    const data = await readFile(quoteFile, "utf-8");
    const quote = JSON.parse(data) as any;
    
    console.log(`✅ Found quote ${quoteId} in file system with ${quote.items?.length || 0} items`);
    return {
      ...quote,
      createdAt: quote.createdAt ? new Date(quote.createdAt) : new Date(),
      expiresAt: quote.expiresAt ? new Date(quote.expiresAt) : undefined,
      // Ensure items array exists
      items: quote.items || [],
    } as Quote;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error(`❌ Quote file not found: ${quoteId}.json (file does not exist)`);
    } else {
      console.error(`❌ Failed to load quote ${quoteId} from file system:`, error);
    }
    return null;
  }
}

/**
 * Get all quotes (for admin/management)
 */
export async function getAllQuotes(): Promise<Quote[]> {
  await ensureQuotesDir();
  
  try {
    const files = await readFile(QUOTES_DIR, "utf-8").then(() => {
      // This is a simplified version - in production you'd use fs.readdir
      return [];
    }).catch(() => []);
    
    // For now, return empty array - we'll implement directory reading if needed
    return [];
  } catch (error) {
    return [];
  }
}
