/**
 * Server-side product storage
 * This replaces localStorage for production deployment
 * 
 * For now, uses a JSON file. Can be upgraded to a database later.
 */

import { Product, ProductConfig } from "@/types/product";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data-store");
const PRODUCTS_FILE = join(DATA_DIR, "products.json");
const PRODUCT_CONFIGS_DIR = join(DATA_DIR, "product-configs");

/**
 * Ensure data directory exists
 */
async function ensureDataDir() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await mkdir(PRODUCT_CONFIGS_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, that's fine
  }
}

/**
 * Get all products from server storage
 */
export async function getAllProducts(): Promise<Product[]> {
  await ensureDataDir();
  
  try {
    const data = await readFile(PRODUCTS_FILE, "utf-8");
    const products = JSON.parse(data) as Product[];
    return products.map((p) => ({
      ...p,
      createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
      updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
    }));
  } catch (error) {
    // File doesn't exist yet, return empty array
    return [];
  }
}

/**
 * Save all products to server storage
 */
export async function saveAllProducts(products: Product[]): Promise<void> {
  await ensureDataDir();
  
  const data = products.map((p) => ({
    ...p,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : new Date().toISOString(),
  }));
  
  await writeFile(PRODUCTS_FILE, JSON.stringify(data, null, 2), "utf-8");
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
  
  // Also delete the product config file
  try {
    const configFile = join(PRODUCT_CONFIGS_DIR, `${productId}.json`);
    await writeFile(configFile, "", "utf-8").catch(() => {}); // Try to delete, ignore if doesn't exist
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Get product config from server storage
 */
export async function getProductConfig(productId: string): Promise<ProductConfig | null> {
  await ensureDataDir();
  
  try {
    const configFile = join(PRODUCT_CONFIGS_DIR, `${productId}.json`);
    const data = await readFile(configFile, "utf-8");
    if (!data || data.trim() === "") {
      return null;
    }
    return JSON.parse(data) as ProductConfig;
  } catch (error) {
    // File doesn't exist
    return null;
  }
}

/**
 * Save product config to server storage
 */
export async function saveProductConfig(config: ProductConfig): Promise<void> {
  await ensureDataDir();
  
  const configFile = join(PRODUCT_CONFIGS_DIR, `${config.productId}.json`);
  const configJson = JSON.stringify(config, null, 2);
  
  // Write the file
  await writeFile(configFile, configJson, "utf-8");
  
  // Verify the write by reading it back
  try {
    const writtenData = await readFile(configFile, "utf-8");
    const writtenConfig = JSON.parse(writtenData) as ProductConfig;
    
    // Log for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`💾 Saved config for ${config.productId}:`, {
        mainProductImageUrl: writtenConfig.mainProductImageUrl,
        fileSize: writtenData.length,
      });
    }
    
    // Verify critical fields were written correctly
    if (config.mainProductImageUrl && writtenConfig.mainProductImageUrl !== config.mainProductImageUrl) {
      console.error(`❌ Verification failed: mainProductImageUrl mismatch for ${config.productId}`);
      console.error(`Expected: ${config.mainProductImageUrl}, Got: ${writtenConfig.mainProductImageUrl}`);
    }
  } catch (error) {
    console.error(`❌ Failed to verify write for ${config.productId}:`, error);
  }
}

/**
 * Delete product config
 */
export async function deleteProductConfig(productId: string): Promise<void> {
  await ensureDataDir();
  
  try {
    const configFile = join(PRODUCT_CONFIGS_DIR, `${productId}.json`);
    await writeFile(configFile, "", "utf-8").catch(() => {});
  } catch (error) {
    // Ignore errors
  }
}


