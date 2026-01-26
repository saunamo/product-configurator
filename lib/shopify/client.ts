/**
 * Shopify API Client
 * Handles authentication and API requests to Shopify
 */

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || "2024-01";

// For OAuth flow, token might come from cookies
export function getAccessToken(): string | null {
  // First try environment variable (for private apps or direct token)
  if (SHOPIFY_ACCESS_TOKEN) {
    return SHOPIFY_ACCESS_TOKEN;
  }
  
  // For OAuth, token would be in cookies or session
  // This will be handled by the API routes that have access to cookies
  return null;
}

if (!SHOPIFY_STORE_URL) {
  console.warn("SHOPIFY_STORE_URL not configured. Price sync will be disabled.");
}

/**
 * Get the base URL for Shopify API requests
 */
export function getShopifyApiUrl(endpoint: string = ""): string {
  if (!SHOPIFY_STORE_URL) {
    throw new Error("SHOPIFY_STORE_URL is not configured");
  }
  
  const storeUrl = SHOPIFY_STORE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${storeUrl}/admin/api/${SHOPIFY_API_VERSION}${endpoint}`;
}

/**
 * Make an authenticated request to Shopify API
 */
export async function shopifyRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string
): Promise<T> {
  const token = accessToken || SHOPIFY_ACCESS_TOKEN;
  
  if (!token) {
    throw new Error("SHOPIFY_ACCESS_TOKEN is not configured. Please install the app first.");
  }

  const url = getShopifyApiUrl(endpoint);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Shopify API error (${response.status}): ${errorText}`
    );
  }

  return response.json();
}

/**
 * Get a product by ID
 */
export async function getProduct(productId: string, accessToken?: string) {
  return shopifyRequest<{ product: any }>(`/products/${productId}.json`, {}, accessToken);
}

/**
 * Get a product by handle (slug)
 */
export async function getProductByHandle(handle: string, accessToken?: string) {
  return shopifyRequest<{ product: any }>(`/products.json?handle=${handle}`, {}, accessToken);
}

/**
 * Get multiple products by IDs
 */
export async function getProducts(productIds: string[], accessToken?: string) {
  // Shopify doesn't have a bulk endpoint, so we fetch individually
  // In production, you might want to batch these or use GraphQL
  const products = await Promise.all(
    productIds.map(async (id) => {
      try {
        const data = await getProduct(id, accessToken);
        return data.product;
      } catch (error) {
        console.error(`Failed to fetch product ${id}:`, error);
        return null;
      }
    })
  );
  
  return products.filter(Boolean);
}

/**
 * Get product price (from variants)
 */
export function getProductPrice(product: any): number | null {
  if (!product || !product.variants || product.variants.length === 0) {
    return null;
  }
  
  // Return the first variant's price (or you could implement logic for specific variants)
  const price = parseFloat(product.variants[0].price);
  return isNaN(price) ? null : price;
}

/**
 * Search products by query
 */
export async function searchProducts(query: string, limit: number = 50, accessToken?: string) {
  return shopifyRequest<{ products: any[] }>(
    `/products.json?title=${encodeURIComponent(query)}&limit=${limit}`,
    {},
    accessToken
  );
}

