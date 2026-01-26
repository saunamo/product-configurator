/**
 * Price Sync Utilities
 * Handles syncing prices from Shopify to configurator options
 */

import { Option } from "@/types/configurator";
import { getProductPrice, getProducts } from "./client";

export type PriceSyncResult = {
  optionId: string;
  shopifyProductId: string;
  oldPrice: number;
  newPrice: number | null;
  success: boolean;
  error?: string;
};

/**
 * Sync prices for options that have Shopify product IDs
 */
export async function syncOptionPrices(
  options: Option[]
): Promise<PriceSyncResult[]> {
  // Filter options that have Shopify product IDs
  const optionsWithShopify = options.filter(
    (opt) => opt.shopifyProductId
  );

  if (optionsWithShopify.length === 0) {
    return [];
  }

  // Get all unique Shopify product IDs
  const productIds = [
    ...new Set(
      optionsWithShopify
        .map((opt) => opt.shopifyProductId)
        .filter((id): id is string => !!id)
    ),
  ];

  // Fetch products from Shopify
  const products = await getProducts(productIds);

  // Create a map of product ID to price
  const productPriceMap: Record<string, number | null> = {};
  products.forEach((product) => {
    if (product && product.id) {
      productPriceMap[String(product.id)] = getProductPrice(product);
    }
  });

  // Map results
  const results: PriceSyncResult[] = optionsWithShopify.map((option) => {
    const shopifyProductId = option.shopifyProductId!;
    const newPrice = productPriceMap[shopifyProductId] ?? null;

    return {
      optionId: option.id,
      shopifyProductId,
      oldPrice: option.price,
      newPrice,
      success: newPrice !== null,
      error: newPrice === null ? "Product not found or has no price" : undefined,
    };
  });

  return results;
}

/**
 * Update options with synced prices
 */
export function applyPriceSync(
  options: Option[],
  syncResults: PriceSyncResult[]
): Option[] {
  const priceMap: Record<string, number> = {};
  
  syncResults.forEach((result) => {
    if (result.success && result.newPrice !== null) {
      priceMap[result.optionId] = result.newPrice;
    }
  });

  return options.map((option) => {
    if (priceMap[option.id]) {
      return { ...option, price: priceMap[option.id] };
    }
    return option;
  });
}



