/**
 * Client-side API for product storage
 * Uses server-side API instead of localStorage
 */

import { Product, ProductConfig } from "@/types/product";

const API_BASE = "/api/products";

/**
 * Get all products from server
 */
export async function getAllProducts(): Promise<Product[]> {
  try {
    const response = await fetch(API_BASE);
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }
    const data = await response.json();
    return data.products || [];
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

/**
 * Save all products to server
 */
export async function saveAllProducts(products: Product[]): Promise<void> {
  try {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(products),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save products: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error saving products:", error);
    throw error;
  }
}

/**
 * Get a product by ID
 */
export async function getProduct(productId: string): Promise<Product | null> {
  try {
    const response = await fetch(`${API_BASE}/${productId}`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch product: ${response.statusText}`);
    }
    const data = await response.json();
    return data.product || null;
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
}

/**
 * Save a product
 */
export async function saveProduct(product: Product): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save product: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error saving product:", error);
    throw error;
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(productId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/${productId}`, {
      method: "DELETE",
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete product: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
}

/**
 * Get product config from server
 */
export async function getProductConfig(productId: string): Promise<ProductConfig | null> {
  try {
    const response = await fetch(`${API_BASE}/${productId}/config`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch product config: ${response.statusText}`);
    }
    const data = await response.json();
    return data.config || null;
  } catch (error) {
    console.error("Error fetching product config:", error);
    return null;
  }
}

/**
 * Save product config to server
 */
export async function saveProductConfig(config: ProductConfig): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/${config.productId}/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save product config: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error saving product config:", error);
    throw error;
  }
}

/**
 * Delete product config
 */
export async function deleteProductConfig(productId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/${productId}/config`, {
      method: "DELETE",
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete product config: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error deleting product config:", error);
    throw error;
  }
}


