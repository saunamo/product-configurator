/**
 * Script to update all product names and images
 * Run this in the browser console or execute via a page
 */

// Product name and image mappings
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
    imageUrl: "/indoor-sauna-thermo-black-220.webp",
  },
  "thermo-black-220": {
    name: "Indoor Sauna Thermo Black 220",
    imageUrl: "/indoor-sauna-thermo-black-220.webp",
  },
};

// This will be executed client-side
export const updateScript = `
(async function() {
  const { getAllProducts, getProductConfig, saveProductConfig } = await import('/utils/productStorage');
  const { STEPS } = await import('/constants/steps');
  const { stepDataMap } = await import('/data');
  const { defaultDesignConfig } = await import('/constants/defaultDesign');
  const { defaultQuoteSettings } = await import('/constants/defaultQuoteSettings');

  const PRODUCT_UPDATES = ${JSON.stringify(PRODUCT_UPDATES, null, 2)};

  const products = getAllProducts();
  const results = [];
  const errors = [];

  for (const product of products) {
    const update = PRODUCT_UPDATES[product.slug] || 
                  PRODUCT_UPDATES[product.id] ||
                  Object.entries(PRODUCT_UPDATES).find(([key, value]) => 
                    product.name.toLowerCase().includes(key.toLowerCase()) ||
                    product.name.toLowerCase().includes(value.name.toLowerCase().split(' ').pop()?.toLowerCase() || '')
                  )?.[1];

    if (!update) {
      console.log('⚠️ No update found for:', product.name, product.slug, product.id);
      continue;
    }

    try {
      let config = await getProductConfig(product.id);
      
      if (!config) {
        config = {
          productId: product.id,
          productName: update.name,
          mainProductImageUrl: update.imageUrl,
          steps: STEPS,
          stepData: stepDataMap,
          design: defaultDesignConfig,
          priceSource: "pipedrive",
          quoteSettings: defaultQuoteSettings,
        };
        saveProductConfig(config);
        results.push({ product: product.name, name: update.name, image: update.imageUrl, action: 'created' });
      } else {
        const needsUpdate = config.productName !== update.name || config.mainProductImageUrl !== update.imageUrl;
        if (needsUpdate) {
          config.productName = update.name;
          config.mainProductImageUrl = update.imageUrl;
          saveProductConfig(config);
          results.push({ product: product.name, name: update.name, image: update.imageUrl, action: 'updated' });
        } else {
          results.push({ product: product.name, name: update.name, image: update.imageUrl, action: 'already correct' });
        }
      }
    } catch (error) {
      errors.push({ product: product.name, error: error.message });
    }
  }

  console.log('✅ Update complete:', results);
  if (errors.length > 0) console.error('❌ Errors:', errors);
  return { results, errors };
})();
`;
