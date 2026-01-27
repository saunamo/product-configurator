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
    throw new Error("No Pipedrive deal ID provided. Cannot save quote.");
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
    
    console.log(`[Quote Save] Saving quote to Pipedrive deal ${dealId} with ${quoteData.items?.length || 0} items`);
    console.log(`[Quote Save] Quote ID: ${quote.id}`);
    console.log(`[Quote Save] Quote items (first 2):`, JSON.stringify(quoteData.items?.slice(0, 2), null, 2));

    // Store full quote JSON as a note in Pipedrive
    // Retry logic for Pipedrive API calls (sometimes they can be flaky)
    let lastError: any = null;
    let noteCreated = false;
    let createdNoteId: number | undefined;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[Quote Save] Attempt ${attempt}/3: Creating note in Pipedrive deal ${dealId}...`);
        const noteContent = `QUOTE_DATA_JSON:\n${JSON.stringify(quoteData, null, 2)}`;
        console.log(`[Quote Save] Note content length: ${noteContent.length} characters`);
        
        const noteResponse = await createNote({
          content: noteContent,
          deal_id: dealId,
          pinned_to_deal_flag: 1, // Pin the note so it's easy to find
        });
        
        createdNoteId = noteResponse.data?.id;
        console.log(`✅ Note created successfully! Note ID: ${createdNoteId}, Deal ID: ${dealId}`);
        console.log(`✅ Quote saved to Pipedrive deal ${dealId} as note with ${quoteData.items?.length || 0} items (attempt ${attempt})`);
        
        // Verify the note was actually created by trying to retrieve it
        console.log(`[Quote Save] Verifying note creation...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s for indexing
        
        const { getDealNotes } = await import("@/lib/pipedrive/client");
        const notesResponse = await getDealNotes(dealId);
        const notes = notesResponse.data || [];
        const foundNote = notes.find((note: any) => 
          note.content?.startsWith('QUOTE_DATA_JSON:') || note.id === createdNoteId
        );
        
        if (foundNote) {
          console.log(`✅ Verification successful: Note found in deal ${dealId} (Note ID: ${foundNote.id})`);
          noteCreated = true;
          return; // Success - exit function
        } else {
          console.warn(`⚠️ Note created but not found in verification (may need more time to index)`);
          // Still consider it a success if we got a note ID back
          if (createdNoteId) {
            noteCreated = true;
            return;
          }
        }
      } catch (noteError: any) {
        lastError = noteError;
        console.error(`[Quote Save] Attempt ${attempt}/3 failed:`, {
          message: noteError?.message || noteError,
          status: noteError?.status,
          statusText: noteError?.statusText,
          response: noteError?.response ? await noteError.response.text().catch(() => 'N/A') : 'N/A',
        });
        
        // If it's a rate limit error, wait longer
        if (noteError?.status === 429 || noteError?.message?.includes('rate limit')) {
          const waitTime = attempt * 2000; // 2s, 4s, 6s
          console.log(`[Quote Save] Rate limited, waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else if (attempt < 3) {
          // Wait before retrying (exponential backoff)
          const waitTime = attempt * 500; // 500ms, 1000ms
          console.log(`[Quote Save] Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // If we get here, all retries failed
    console.error(`❌ CRITICAL: Failed to save quote to Pipedrive after 3 attempts`);
    console.error(`❌ Last error:`, {
      message: lastError?.message,
      status: lastError?.status,
      stack: lastError?.stack?.substring(0, 500),
    });
    console.error(`❌ Deal ${dealId} was created but quote note was NOT saved`);
    console.error(`❌ Quote ${quote.id} will NOT be retrievable from Pipedrive`);
    throw new Error(`Failed to save quote to Pipedrive: ${lastError?.message || 'Unknown error'}`);
  } catch (error) {
    console.error("Failed to save quote to Pipedrive:", error);
    throw error;
  }
}

/**
 * Get quote from Pipedrive deal
 * Searches for deal by quote ID in deal title or notes
 * Includes retry logic to handle timing issues with Pipedrive indexing
 * Increased retries and wait times for better reliability on Netlify
 */
async function getQuoteFromPipedrive(quoteId: string, retries = 5): Promise<Quote | null> {
  // Check if Pipedrive is configured
  if (!process.env.PIPEDRIVE_API_TOKEN) {
    console.error(`[Quote Retrieval] PIPEDRIVE_API_TOKEN not configured`);
    return null;
  }
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Quote ID is now the Pipedrive deal ID, so try to get deal directly first
      let dealId: number | null = null;
      
      // Try parsing as number (deal ID)
      const parsedDealId = parseInt(quoteId, 10);
      if (!isNaN(parsedDealId)) {
        try {
          const deal = await getDeal(parsedDealId);
          if (deal && deal.data) {
            dealId = parsedDealId;
            console.log(`[Quote Retrieval] Found deal directly by ID: ${dealId} (attempt ${attempt})`);
          }
        } catch (error: any) {
          // Handle different types of errors gracefully
          const errorMsg = error.message || String(error);
          if (errorMsg.includes('404') || errorMsg.includes('not found')) {
            console.log(`[Quote Retrieval] Deal ID ${parsedDealId} not found (attempt ${attempt}), trying search...`);
          } else if (errorMsg.includes('401') || errorMsg.includes('unauthorized')) {
            console.error(`[Quote Retrieval] Pipedrive authentication failed - check API token`);
            return null; // Don't retry auth errors
          } else if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
            console.log(`[Quote Retrieval] Rate limited (attempt ${attempt}), will retry...`);
            // Will retry with backoff
          } else {
            console.log(`[Quote Retrieval] Error getting deal ${parsedDealId}:`, errorMsg.substring(0, 100));
          }
        }
      }
      
      // If direct lookup failed, try search
      if (!dealId) {
        try {
          const searchResponse = await pipedriveRequest<{ data: { items?: Array<{ item: any }> } }>(
            `/deals/search?term=${encodeURIComponent(quoteId)}&fields=title`
          );

          const deals = searchResponse.data?.items || [];
          
          // Find deal that has quote ID in title or matches deal ID
          const matchingDeal = deals.find((item: any) => 
            item.item?.title?.includes(quoteId) || item.item?.id?.toString() === quoteId
          );
          
          if (matchingDeal) {
            dealId = matchingDeal.item.id;
            console.log(`[Quote Retrieval] Found deal via search: ${dealId} (attempt ${attempt})`);
          }
        } catch (searchError) {
          console.log(`[Quote Retrieval] Search failed (attempt ${attempt}):`, searchError);
        }
      }
      
      if (!dealId) {
        if (attempt < retries) {
          // Exponential backoff: 1s, 2s, 3s, 4s, 5s
          const waitTime = attempt * 1000;
          console.log(`[Quote Retrieval] Attempt ${attempt}/${retries}: Deal not found yet, retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        console.warn(`❌ No Pipedrive deal found for quote ${quoteId} after ${retries} attempts`);
        return null;
      }
      
      // Get deal details
      const deal = await getDeal(dealId);
      
      // Try to get quote data from deal notes
      // Retry note retrieval separately (notes might take longer to index)
      let quoteNote = null;
      for (let noteAttempt = 1; noteAttempt <= 3; noteAttempt++) {
        try {
          const notesResponse = await getDealNotes(dealId);
          const notes = notesResponse.data || [];
          
          // Look for note with full quote JSON (starts with QUOTE_DATA_JSON:)
          quoteNote = notes.find((note: any) => 
            note.content?.startsWith('QUOTE_DATA_JSON:')
          );
          
          if (quoteNote) {
            console.log(`[Quote Retrieval] Found quote note on attempt ${noteAttempt}`);
            break;
          } else {
            if (noteAttempt < 3) {
              console.log(`[Quote Retrieval] Quote note not found yet (attempt ${noteAttempt}/3), waiting 1s...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              console.warn(`[Quote Retrieval] Quote note not found after 3 attempts. Total notes: ${notes.length}`);
              // Log note titles for debugging
              notes.forEach((note: any, idx: number) => {
                console.log(`[Quote Retrieval] Note ${idx + 1}: ${note.content?.substring(0, 50)}...`);
              });
            }
          }
        } catch (noteError: any) {
          console.warn(`[Quote Retrieval] Error getting notes (attempt ${noteAttempt}):`, noteError.message);
          if (noteAttempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      if (quoteNote) {
        // Extract JSON from note content
        const jsonContent = quoteNote.content.replace('QUOTE_DATA_JSON:\n', '').replace('QUOTE_DATA_JSON:', '');
        let quoteData;
        try {
          quoteData = JSON.parse(jsonContent);
        } catch (parseError: any) {
          console.error(`[Quote Retrieval] Failed to parse quote JSON from Pipedrive note:`, parseError.message);
          console.error(`[Quote Retrieval] Note content (first 500 chars):`, quoteNote.content.substring(0, 500));
          // Don't return null here - try fallback
        }
        
        if (quoteData) {
          console.log(`✅ [Quote Retrieval] Retrieved quote ${quoteId} from Pipedrive, items count: ${quoteData.items?.length || 0}`);
          
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
      }

      // Fallback: Reconstruct basic quote from deal data
      // This won't have all items, but it's better than nothing
      console.warn(`⚠️ [Quote Retrieval] Quote note not found, using fallback reconstruction from deal data`);
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
    } catch (error: any) {
      console.error(`[Quote Retrieval] Attempt ${attempt} failed:`, error.message || error);
      if (attempt < retries) {
        // Exponential backoff: 1s, 2s, 3s, 4s, 5s
        const waitTime = attempt * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      console.error(`❌ Failed to get quote from Pipedrive after all ${retries} retries:`, error);
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
        console.log(`[saveQuote] Attempting to save quote ${quote.id} to Pipedrive deal ${pipedriveDealId}...`);
        await saveQuoteToPipedrive(quote, pipedriveDealId);
        console.log(`✅ Quote ${quote.id} successfully saved to Pipedrive deal ${pipedriveDealId} with ${quote.items?.length || 0} items`);
        
        // Verify the save by trying to retrieve it immediately (with a short delay for indexing)
        console.log(`[saveQuote] Verifying quote save by attempting retrieval...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s for Pipedrive to index
        
        const { getQuoteById } = await import("@/lib/database/quotes");
        const verifyQuote = await getQuoteById(quote.id);
        if (verifyQuote) {
          console.log(`✅ Verification successful: Quote ${quote.id} can be retrieved with ${verifyQuote.items?.length || 0} items`);
        } else {
          console.warn(`⚠️ Verification failed: Quote ${quote.id} was saved but cannot be retrieved yet (may need more time to index)`);
        }
        
        return; // Success - return early
      } catch (error: any) {
        console.error(`❌ Failed to save quote to Pipedrive:`, error?.message || error);
        console.error(`❌ Error details:`, {
          message: error.message,
          code: error.code,
          status: error.status,
          stack: error.stack?.substring(0, 300),
        });
        // On Netlify, if Pipedrive save fails, we can't use file system
        // But we should NOT throw - let the quote be generated anyway
        // The quote ID is already set, so the user can still access it via URL
        // (though it won't be retrievable from Pipedrive)
        console.warn(`⚠️ Quote ${quote.id} generated but could not be saved to Pipedrive. Quote ID is: ${quote.id}`);
        // Don't throw - allow quote generation to succeed
        return;
      }
    } else {
      // On Netlify but no Pipedrive deal ID - Pipedrive is not configured
      // CRITICAL: On Netlify, quotes MUST be saved to Pipedrive to be retrievable
      // The file system is read-only, so quotes can't be saved there
      // If Pipedrive is not configured, the quote URL in the email won't work
      console.error(`❌ CRITICAL: On Netlify but no Pipedrive deal ID. Quote ${quote.id} cannot be saved permanently.`);
      console.error(`❌ The quote URL will not work because the quote cannot be retrieved.`);
      console.error(`❌ Please configure PIPEDRIVE_API_TOKEN in Netlify environment variables.`);
      // Still don't throw - let the quote generation complete, but log the error
      // The quote will be generated but won't be accessible via URL
      return;
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
 * Increased retries and better error handling for Netlify reliability
 */
export async function getQuoteById(quoteId: string): Promise<Quote | null> {
  console.log(`[getQuoteById] Looking for quote ${quoteId}, isServerless: ${isServerless}, NETLIFY: ${process.env.NETLIFY}`);
  
  // Check if Pipedrive is configured
  const pipedriveToken = process.env.PIPEDRIVE_API_TOKEN;
  if (!pipedriveToken) {
    console.warn(`[getQuoteById] PIPEDRIVE_API_TOKEN not configured, skipping Pipedrive lookup`);
  }
  
  // Try Pipedrive first (for Netlify)
  if (isServerless && pipedriveToken) {
    try {
      // Use more retries for Netlify (5 attempts with exponential backoff)
      const pipedriveQuote = await getQuoteFromPipedrive(quoteId, 5);
      if (pipedriveQuote) {
        const itemCount = pipedriveQuote.items?.length || 0;
        console.log(`✅ Found quote ${quoteId} in Pipedrive with ${itemCount} items`);
        if (itemCount === 0) {
          console.warn(`⚠️ Quote ${quoteId} found but has no items - this might indicate a problem`);
        }
        return pipedriveQuote;
      } else {
        console.log(`⚠️ Quote ${quoteId} not found in Pipedrive after all retries, trying file system fallback`);
      }
    } catch (error: any) {
      console.error(`❌ Error retrieving quote from Pipedrive:`, {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 200),
      });
      // Don't throw - fall through to file system fallback
      // This prevents 500 errors if Pipedrive is temporarily unavailable
    }
  } else if (isServerless && !pipedriveToken) {
    console.error(`❌ [getQuoteById] On Netlify but PIPEDRIVE_API_TOKEN not configured - quotes cannot be retrieved`);
    console.error(`❌ [getQuoteById] Quote ${quoteId} was likely generated but not saved to Pipedrive`);
    console.error(`❌ [getQuoteById] Please configure PIPEDRIVE_API_TOKEN in Netlify environment variables`);
    return null;
  }

  // Fallback to file system (for localhost, or Netlify if Pipedrive not configured)
  // On Netlify, if Pipedrive is not configured, we can't save quotes permanently
  // But we should still try to retrieve from file system in case it was saved during build
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
      if (isServerless) {
        console.error(`❌ On Netlify: Quote ${quoteId} not found. This means Pipedrive is not configured or quote was not saved.`);
      }
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
