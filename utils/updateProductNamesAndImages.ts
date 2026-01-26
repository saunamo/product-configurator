/**
 * Utility to update product names and main product images
 * Run this in the browser console or create an API route to execute it
 */

import { getAllProducts, getProductConfig, saveProductConfig } from "./productStorage";
import { ProductConfig } from "@/types/product";

// Mapping of product slugs/IDs to their correct names and images
const PRODUCT_UPDATES: Record<string, { name: string; imageUrl: string }> = {
  // Outdoor Saunas
  "cube-125": {
    name: "Outdoor Sauna Cube 125",
    imageUrl: "/outdoor-sauna-cube-125.webp",
  },
  "cube-220": {
    name: "Outdoor Sauna Cube 220",
    imageUrl: "/outdoor-sauna-cube-220.webp",
  },
  "cube-300": {
    name: "Outdoor Sauna Cube 300",
    imageUrl: "/outdoor-sauna-cube-300.webp",
  },
  "cubus": {
    name: "Outdoor Sauna Cube 300",
    imageUrl: "/outdoor-sauna-cube-300.webp",
  },
  "hiki-s": {
    name: "Outdoor Sauna Hiki S",
    imageUrl: "/outdoor-sauna-hiki-s.webp",
  },
  "hiki-l": {
    name: "Outdoor Sauna Hiki L",
    imageUrl: "/outdoor-sauna-hiki-l.webp",
  },
  "barrel-220": {
    name: "Outdoor Sauna Barrel 220",
    imageUrl: "/outdoor-sauna-barrel-220.webp",
  },
  "barrel-280": {
    name: "Outdoor Sauna Barrel 280 Deluxe",
    imageUrl: "/outdoor-sauna-barrel-280-deluxe.webp",
  },
  // Indoor Saunas
  "aisti-150": {
    name: "Indoor Sauna Aisti 150",
    imageUrl: "/indoor-sauna-aisti-150.webp",
  },
  "aisti-220": {
    name: "Indoor Sauna Thermo Black 220",
    imageUrl: "/indoor-sauna-thermo-black-220.webp", // Note: file may need to be added
  },
  "thermo-black-220": {
    name: "Indoor Sauna Thermo Black 220",
    imageUrl: "/indoor-sauna-thermo-black-220.webp",
  },
};

/**
 * Update all product configs with correct names and images
 */
export async function updateAllProductNamesAndImages(): Promise<{
  updated: number;
  errors: Array<{ productId: string; error: string }>;
  results: Array<{ productId: string; name: string; imageUrl: string; updated: boolean }>;
}> {
  const products = getAllProducts();
  const results: Array<{ productId: string; name: string; imageUrl: string; updated: boolean }> = [];
  const errors: Array<{ productId: string; error: string }> = [];

  for (const product of products) {
    // Try to match by slug first, then by name
    const update = PRODUCT_UPDATES[product.slug] || 
                  PRODUCT_UPDATES[product.id] ||
                  Object.values(PRODUCT_UPDATES).find(u => 
                    product.name.toLowerCase().includes(u.name.toLowerCase().split(' ').pop() || '')
                  );

    if (!update) {
      console.log(`⚠️ No update found for product: ${product.name} (slug: ${product.slug}, id: ${product.id})`);
      continue;
    }

    try {
      const config = await getProductConfig(product.id);
      
      if (!config) {
        console.log(`⚠️ No config found for product: ${product.name} (${product.id})`);
        continue;
      }

      const needsUpdate = 
        config.productName !== update.name ||
        config.mainProductImageUrl !== update.imageUrl;

      if (needsUpdate) {
        const updatedConfig: ProductConfig = {
          ...config,
          productName: update.name,
          mainProductImageUrl: update.imageUrl,
        };

        saveProductConfig(updatedConfig);
        
        results.push({
          productId: product.id,
          name: update.name,
          imageUrl: update.imageUrl,
          updated: true,
        });

        console.log(`✅ Updated ${product.name} → ${update.name} with image ${update.imageUrl}`);
      } else {
        results.push({
          productId: product.id,
          name: update.name,
          imageUrl: update.imageUrl,
          updated: false,
        });
        console.log(`✓ ${product.name} already has correct name and image`);
      }
    } catch (error: any) {
      errors.push({
        productId: product.id,
        error: error.message || "Failed to update",
      });
      console.error(`❌ Failed to update ${product.name}:`, error);
    }
  }

  return {
    updated: results.filter(r => r.updated).length,
    errors,
    results,
  };
}
