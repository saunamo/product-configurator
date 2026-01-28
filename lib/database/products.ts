/**
 * Server-side product storage
 * For Netlify: Uses Netlify Blobs
 * For local/dev: Falls back to file system
 */

import { Product, ProductConfig } from "@/types/product";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data-store");
const PRODUCTS_FILE = join(DATA_DIR, "products.json");
const PRODUCT_CONFIGS_DIR = join(DATA_DIR, "product-configs");

// More robust serverless detection
function isServerlessEnvironment(): boolean {
  if (process.env.NETLIFY === "true" || process.env.NETLIFY) return true;
  if (process.env.VERCEL === "1" || process.env.VERCEL) return true;
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return true;
  if (process.env.CONTEXT) return true; // Netlify sets this
  if (process.cwd().startsWith("/var/task")) return true;
  return false;
}

const isServerless = isServerlessEnvironment();

console.log(`[Product Storage] Environment: isServerless=${isServerless}`);

/**
 * Ensure data directory exists
 */
async function ensureDataDir() {
  if (isServerless) return; // Skip in serverless environments
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await mkdir(PRODUCT_CONFIGS_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, that's fine
  }
}

// ============================================
// NETLIFY BLOBS STORAGE
// ============================================

async function saveProductConfigToBlobs(config: ProductConfig): Promise<boolean> {
  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore({ name: "product-configs", consistency: "strong" });
    
    console.log(`[Netlify Blobs] Saving product config: ${config.productId}`);
    await store.setJSON(`config-${config.productId}`, config);
    
    // Verify
    const verify = await store.get(`config-${config.productId}`, { type: "json" });
    if (verify) {
      console.log(`✅ [Netlify Blobs] Product config saved: ${config.productId}`);
      return true;
    }
    return false;
  } catch (error: any) {
    console.error(`❌ [Netlify Blobs] Error saving product config:`, error?.message);
    return false;
  }
}

async function getProductConfigFromBlobs(productId: string): Promise<ProductConfig | null> {
  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore({ name: "product-configs", consistency: "strong" });
    
    const config = await store.get(`config-${productId}`, { type: "json" });
    if (config) {
      console.log(`✅ [Netlify Blobs] Found product config: ${productId}`);
      return config as ProductConfig;
    }
    return null;
  } catch (error: any) {
    console.error(`❌ [Netlify Blobs] Error getting product config:`, error?.message);
    return null;
  }
}

async function saveAllProductsToBlobs(products: Product[]): Promise<boolean> {
  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore({ name: "products", consistency: "strong" });
    
    const data = products.map((p) => ({
      ...p,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
      updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : new Date().toISOString(),
    }));
    
    console.log(`[Netlify Blobs] Saving ${products.length} products`);
    await store.setJSON("all-products", data);
    
    console.log(`✅ [Netlify Blobs] Products saved`);
    return true;
  } catch (error: any) {
    console.error(`❌ [Netlify Blobs] Error saving products:`, error?.message);
    return false;
  }
}

async function getAllProductsFromBlobs(): Promise<Product[]> {
  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore({ name: "products", consistency: "strong" });
    
    const data = await store.get("all-products", { type: "json" });
    if (data && Array.isArray(data)) {
      console.log(`✅ [Netlify Blobs] Found ${data.length} products`);
      return data.map((p: any) => ({
        ...p,
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      }));
    }
    return [];
  } catch (error: any) {
    console.error(`❌ [Netlify Blobs] Error getting products:`, error?.message);
    return [];
  }
}

// ============================================
// FILE SYSTEM STORAGE (for local dev)
// ============================================

async function saveProductConfigToFile(config: ProductConfig): Promise<void> {
  await ensureDataDir();
  const configFile = join(PRODUCT_CONFIGS_DIR, `${config.productId}.json`);
  await writeFile(configFile, JSON.stringify(config, null, 2), "utf-8");
  console.log(`✅ [File] Saved product config: ${config.productId}`);
}

async function getProductConfigFromFile(productId: string): Promise<ProductConfig | null> {
  try {
    await ensureDataDir();
    const configFile = join(PRODUCT_CONFIGS_DIR, `${productId}.json`);
    const data = await readFile(configFile, "utf-8");
    if (!data || data.trim() === "") return null;
    return JSON.parse(data) as ProductConfig;
  } catch (error) {
    return null;
  }
}

async function saveAllProductsToFile(products: Product[]): Promise<void> {
  await ensureDataDir();
  const data = products.map((p) => ({
    ...p,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : new Date().toISOString(),
  }));
  await writeFile(PRODUCTS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

async function getAllProductsFromFile(): Promise<Product[]> {
  try {
    await ensureDataDir();
    const data = await readFile(PRODUCTS_FILE, "utf-8");
    const products = JSON.parse(data) as Product[];
    return products.map((p) => ({
      ...p,
      createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
      updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
    }));
  } catch (error) {
    return [];
  }
}

// ============================================
// PUBLIC API (auto-selects storage)
// ============================================

/**
 * Get all products from server storage
 */
export async function getAllProducts(): Promise<Product[]> {
  if (isServerless) {
    // Try Blobs first, fall back to file (for build-time data)
    const blobProducts = await getAllProductsFromBlobs();
    if (blobProducts.length > 0) return blobProducts;
    
    // Fall back to file system for build-time data
    return getAllProductsFromFile();
  }
  return getAllProductsFromFile();
}

/**
 * Save all products to server storage
 */
export async function saveAllProducts(products: Product[]): Promise<void> {
  if (isServerless) {
    const saved = await saveAllProductsToBlobs(products);
    if (!saved) {
      console.error(`❌ Failed to save products to Netlify Blobs`);
    }
    return;
  }
  await saveAllProductsToFile(products);
}

/**
 * Get a single product by ID
 */
export async function getProduct(productId: string): Promise<Product | null> {
  const products = await getAllProducts();
  return products.find((p) => p.id === productId) || null;
}

/**
 * Save a single product
 */
export async function saveProduct(product: Product): Promise<void> {
  const products = await getAllProducts();
  const existingIndex = products.findIndex((p) => p.id === product.id);
  
  const productToSave = {
    ...product,
    createdAt: product.createdAt instanceof Date ? product.createdAt.toISOString() : product.createdAt,
    updatedAt: new Date().toISOString(),
  };
  
  if (existingIndex >= 0) {
    products[existingIndex] = productToSave;
  } else {
    products.push({
      ...productToSave,
      createdAt: product.createdAt instanceof Date ? product.createdAt.toISOString() : new Date().toISOString(),
    });
  }
  
  await saveAllProducts(products);
}

/**
 * Delete a product
 */
export async function deleteProduct(productId: string): Promise<void> {
  const products = await getAllProducts();
  const filtered = products.filter((p) => p.id !== productId);
  await saveAllProducts(filtered);
  
  // Also delete the product config
  if (isServerless) {
    try {
      const { getStore } = await import("@netlify/blobs");
      const store = getStore({ name: "product-configs", consistency: "strong" });
      await store.delete(`config-${productId}`);
    } catch (error) {
      // Ignore
    }
  }
}

/**
 * Get product config from server storage
 */
export async function getProductConfig(productId: string): Promise<ProductConfig | null> {
  console.log(`[Product Storage] Getting config for ${productId}, isServerless=${isServerless}`);
  
  if (isServerless) {
    // Try Blobs first
    const blobConfig = await getProductConfigFromBlobs(productId);
    if (blobConfig) return blobConfig;
    
    // Fall back to file system (for build-time data)
    return getProductConfigFromFile(productId);
  }
  return getProductConfigFromFile(productId);
}

/**
 * Save product config to server storage
 */
export async function saveProductConfig(config: ProductConfig): Promise<void> {
  console.log(`[Product Storage] Saving config for ${config.productId}, isServerless=${isServerless}`);
  
  if (isServerless) {
    const saved = await saveProductConfigToBlobs(config);
    if (!saved) {
      console.error(`❌ Failed to save product config to Netlify Blobs`);
      throw new Error("Failed to save product config");
    }
    return;
  }
  await saveProductConfigToFile(config);
}

/**
 * Delete product config
 */
export async function deleteProductConfig(productId: string): Promise<void> {
  if (isServerless) {
    try {
      const { getStore } = await import("@netlify/blobs");
      const store = getStore({ name: "product-configs", consistency: "strong" });
      await store.delete(`config-${productId}`);
      console.log(`✅ [Netlify Blobs] Deleted product config: ${productId}`);
    } catch (error: any) {
      console.error(`❌ [Netlify Blobs] Error deleting product config:`, error?.message);
    }
    return;
  }
  
  try {
    const configFile = join(PRODUCT_CONFIGS_DIR, `${productId}.json`);
    await writeFile(configFile, "", "utf-8");
  } catch (error) {
    // Ignore
  }
}
