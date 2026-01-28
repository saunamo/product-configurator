/**
 * Server-side quote storage
 * For Netlify: Uses Netlify Blobs (primary) or Pipedrive (fallback)
 * For local/dev: Falls back to file system
 */

import { Quote } from "@/types/quote";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getDeal, pipedriveRequest, createNote, getDealNotes } from "@/lib/pipedrive/client";

const DATA_DIR = join(process.cwd(), "data-store");
const QUOTES_DIR = join(DATA_DIR, "quotes");

// More robust serverless detection
// Check multiple indicators since NETLIFY env var might not be set at runtime
function isServerlessEnvironment(): boolean {
  // Check environment variables
  if (process.env.NETLIFY === "true" || process.env.NETLIFY) return true;
  if (process.env.VERCEL === "1" || process.env.VERCEL) return true;
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return true;
  if (process.env.CONTEXT) return true; // Netlify sets this
  
  // Check if we're in the Lambda task directory
  if (process.cwd().startsWith("/var/task")) return true;
  
  // Check if data directory is read-only (as a last resort)
  // This is a heuristic - if we can't write, assume serverless
  return false;
}

const isServerless = isServerlessEnvironment();

console.log(`[Quote Storage] Environment detection: isServerless=${isServerless}`);
console.log(`[Quote Storage] Env vars: NETLIFY=${process.env.NETLIFY}, VERCEL=${process.env.VERCEL}, CONTEXT=${process.env.CONTEXT}, AWS_LAMBDA=${process.env.AWS_LAMBDA_FUNCTION_NAME}`);
console.log(`[Quote Storage] CWD: ${process.cwd()}`);

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
 * Save quote using Netlify Blobs
 */
async function saveQuoteToNetlifyBlobs(quote: Quote): Promise<boolean> {
  try {
    // Dynamic import to avoid issues in non-Netlify environments
    const { getStore } = await import("@netlify/blobs");
    
    const store = getStore({
      name: "quotes",
      consistency: "strong", // Ensure immediate consistency
    });
    
    const quoteData = {
      ...quote,
      createdAt: quote.createdAt instanceof Date ? quote.createdAt.toISOString() : quote.createdAt,
      expiresAt: quote.expiresAt instanceof Date ? quote.expiresAt.toISOString() : quote.expiresAt,
    };
    
    console.log(`[Netlify Blobs] Saving quote ${quote.id} with ${quoteData.items?.length || 0} items...`);
    
    await store.setJSON(quote.id, quoteData);
    
    console.log(`✅ [Netlify Blobs] Quote ${quote.id} saved successfully!`);
    
    // Verify by reading back
    const verifyData = await store.get(quote.id, { type: "json" });
    if (verifyData) {
      console.log(`✅ [Netlify Blobs] Verified: Quote ${quote.id} can be retrieved`);
      return true;
    } else {
      console.error(`❌ [Netlify Blobs] Verification failed: Quote ${quote.id} not found after save`);
      return false;
    }
  } catch (error: any) {
    console.error(`❌ [Netlify Blobs] Error saving quote:`, error?.message || error);
    return false;
  }
}

/**
 * Get quote from Netlify Blobs
 */
async function getQuoteFromNetlifyBlobs(quoteId: string): Promise<Quote | null> {
  try {
    const { getStore } = await import("@netlify/blobs");
    
    const store = getStore({
      name: "quotes",
      consistency: "strong",
    });
    
    console.log(`[Netlify Blobs] Looking for quote ${quoteId}...`);
    
    const quoteData = await store.get(quoteId, { type: "json" });
    
    if (quoteData) {
      console.log(`✅ [Netlify Blobs] Found quote ${quoteId} with ${quoteData.items?.length || 0} items`);
      return {
        ...quoteData,
        createdAt: quoteData.createdAt ? new Date(quoteData.createdAt) : new Date(),
        expiresAt: quoteData.expiresAt ? new Date(quoteData.expiresAt) : undefined,
        items: quoteData.items || [],
      } as Quote;
    }
    
    console.log(`[Netlify Blobs] Quote ${quoteId} not found`);
    return null;
  } catch (error: any) {
    console.error(`❌ [Netlify Blobs] Error getting quote:`, error?.message || error);
    return null;
  }
}

/**
 * Save quote to Pipedrive deal (fallback for Netlify if Blobs fail)
 */
async function saveQuoteToPipedrive(quote: Quote, dealId: number): Promise<boolean> {
  console.log(`[Pipedrive] Saving quote ${quote.id} to deal ${dealId}...`);
  
  try {
    const quoteData = {
      ...quote,
      createdAt: quote.createdAt instanceof Date ? quote.createdAt.toISOString() : quote.createdAt,
      expiresAt: quote.expiresAt instanceof Date ? quote.expiresAt.toISOString() : quote.expiresAt,
    };
    
    const noteContent = `QUOTE_DATA_JSON:\n${JSON.stringify(quoteData)}`;
    console.log(`[Pipedrive] Note content length: ${noteContent.length} chars`);
    
    const noteResponse = await createNote({
      content: noteContent,
      deal_id: dealId,
      pinned_to_deal_flag: 1,
    });
    
    if (noteResponse?.data?.id) {
      console.log(`✅ [Pipedrive] Note created with ID ${noteResponse.data.id}`);
      return true;
    }
    
    console.error(`❌ [Pipedrive] Note creation returned no ID`);
    return false;
  } catch (error: any) {
    console.error(`❌ [Pipedrive] Error saving quote:`, error?.message || error);
    return false;
  }
}

/**
 * Get quote from Pipedrive deal
 */
async function getQuoteFromPipedrive(quoteId: string): Promise<Quote | null> {
  if (!process.env.PIPEDRIVE_API_TOKEN) {
    console.log(`[Pipedrive] No API token configured`);
    return null;
  }
  
  try {
    const dealId = parseInt(quoteId, 10);
    if (isNaN(dealId)) {
      console.log(`[Pipedrive] Quote ID ${quoteId} is not a valid deal ID`);
      return null;
    }
    
    console.log(`[Pipedrive] Looking for quote in deal ${dealId}...`);
    
    // Get notes from deal
    const notesResponse = await getDealNotes(dealId);
    const notes = notesResponse?.data || [];
    
    // Find the quote note
    const quoteNote = notes.find((note: any) => 
      note.content?.startsWith('QUOTE_DATA_JSON:')
    );
    
    if (quoteNote) {
      const jsonContent = quoteNote.content.replace('QUOTE_DATA_JSON:\n', '').replace('QUOTE_DATA_JSON:', '');
      const quoteData = JSON.parse(jsonContent);
      
      console.log(`✅ [Pipedrive] Found quote in deal ${dealId} with ${quoteData.items?.length || 0} items`);
      
      return {
        ...quoteData,
        createdAt: quoteData.createdAt ? new Date(quoteData.createdAt) : new Date(),
        expiresAt: quoteData.expiresAt ? new Date(quoteData.expiresAt) : undefined,
        items: quoteData.items || [],
      } as Quote;
    }
    
    console.log(`[Pipedrive] No quote note found in deal ${dealId}`);
    return null;
  } catch (error: any) {
    console.error(`❌ [Pipedrive] Error getting quote:`, error?.message || error);
    return null;
  }
}

/**
 * Save a quote to server storage
 * Priority on Netlify: 1. Netlify Blobs, 2. Pipedrive notes
 * On local: File system
 */
export async function saveQuote(quote: Quote, pipedriveDealId?: number): Promise<void> {
  console.log(`\n========================================`);
  console.log(`[saveQuote] Saving quote ${quote.id}`);
  console.log(`[saveQuote] Items: ${quote.items?.length || 0}`);
  console.log(`[saveQuote] isServerless: ${isServerless}`);
  console.log(`[saveQuote] pipedriveDealId: ${pipedriveDealId}`);
  console.log(`========================================\n`);
  
  // On serverless (Netlify), try Netlify Blobs first
  if (isServerless) {
    console.log(`[saveQuote] Serverless environment detected, using Netlify Blobs...`);
    
    // Try Netlify Blobs (primary storage)
    const blobsSaved = await saveQuoteToNetlifyBlobs(quote);
    
    if (blobsSaved) {
      console.log(`✅ Quote ${quote.id} saved to Netlify Blobs`);
      
      // Also save to Pipedrive as backup (non-blocking)
      if (pipedriveDealId && process.env.PIPEDRIVE_API_TOKEN) {
        saveQuoteToPipedrive(quote, pipedriveDealId).catch(err => {
          console.warn(`[saveQuote] Pipedrive backup save failed (non-critical):`, err?.message);
        });
      }
      
      return;
    }
    
    console.warn(`⚠️ Netlify Blobs save failed, trying Pipedrive as fallback...`);
    
    // Fallback to Pipedrive
    if (pipedriveDealId && process.env.PIPEDRIVE_API_TOKEN) {
      const pipedriveSaved = await saveQuoteToPipedrive(quote, pipedriveDealId);
      if (pipedriveSaved) {
        console.log(`✅ Quote ${quote.id} saved to Pipedrive (fallback)`);
        return;
      }
    }
    
    // Both failed
    console.error(`❌ CRITICAL: Failed to save quote ${quote.id} to any storage!`);
    throw new Error(`Failed to save quote: All storage methods failed`);
  }
  
  // On local development, use file system
  console.log(`[saveQuote] Local environment, saving to file system...`);
  await ensureQuotesDir();
  
  const quoteFile = join(QUOTES_DIR, `${quote.id}.json`);
  const quoteToSave = {
    ...quote,
    createdAt: quote.createdAt instanceof Date ? quote.createdAt.toISOString() : quote.createdAt,
    expiresAt: quote.expiresAt instanceof Date ? quote.expiresAt.toISOString() : quote.expiresAt,
  };
  
  try {
    await writeFile(quoteFile, JSON.stringify(quoteToSave, null, 2), "utf-8");
    console.log(`✅ Quote saved to file: ${quoteFile}`);
  } catch (error: any) {
    console.error(`❌ Failed to save quote to file system:`, error?.message);
    throw error;
  }
}

/**
 * Get a quote by ID
 * Priority on Netlify: 1. Netlify Blobs, 2. Pipedrive
 * On local: File system
 */
export async function getQuoteById(quoteId: string): Promise<Quote | null> {
  console.log(`\n========================================`);
  console.log(`[getQuoteById] Looking for quote ${quoteId}`);
  console.log(`[getQuoteById] isServerless: ${isServerless}`);
  console.log(`========================================\n`);
  
  // On serverless (Netlify), try Netlify Blobs first
  if (isServerless) {
    console.log(`[getQuoteById] Serverless environment, checking Netlify Blobs...`);
    
    // Try Netlify Blobs (primary storage)
    const blobsQuote = await getQuoteFromNetlifyBlobs(quoteId);
    if (blobsQuote) {
      return blobsQuote;
    }
    
    console.log(`[getQuoteById] Not in Blobs, checking Pipedrive...`);
    
    // Fallback to Pipedrive
    const pipedriveQuote = await getQuoteFromPipedrive(quoteId);
    if (pipedriveQuote) {
      return pipedriveQuote;
    }
    
    console.log(`❌ Quote ${quoteId} not found in any storage`);
    return null;
  }
  
  // On local development, use file system
  console.log(`[getQuoteById] Local environment, checking file system...`);
  
  try {
    await ensureQuotesDir();
    const quoteFile = join(QUOTES_DIR, `${quoteId}.json`);
    const data = await readFile(quoteFile, "utf-8");
    const quote = JSON.parse(data);
    
    console.log(`✅ Found quote ${quoteId} in file system`);
    
    return {
      ...quote,
      createdAt: quote.createdAt ? new Date(quote.createdAt) : new Date(),
      expiresAt: quote.expiresAt ? new Date(quote.expiresAt) : undefined,
      items: quote.items || [],
    } as Quote;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log(`❌ Quote file not found: ${quoteId}.json`);
    } else {
      console.error(`❌ Error reading quote file:`, error?.message);
    }
    return null;
  }
}

/**
 * Get all quotes (for admin/management)
 */
export async function getAllQuotes(): Promise<Quote[]> {
  // Not implemented - return empty for now
  return [];
}
