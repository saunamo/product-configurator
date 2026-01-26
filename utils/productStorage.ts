import { Product, ProductConfig } from "@/types/product";
import { Quote } from "@/types/quote";

const PRODUCTS_STORAGE_KEY = "saunamo-products";
const PRODUCT_CONFIG_PREFIX = "saunamo-product-config-";

// Use API storage in production, localStorage in development
// Set NEXT_PUBLIC_USE_API_STORAGE=true to force API storage
const USE_API_STORAGE = 
  process.env.NEXT_PUBLIC_USE_API_STORAGE === "true" ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1");

// Dynamically import API storage when needed
let apiStorage: typeof import("./productStorageApi") | null = null;
if (USE_API_STORAGE && typeof window !== "undefined") {
  import("./productStorageApi").then((module) => {
    apiStorage = module;
  });
}

/**
 * Get all products
 */
export function getAllProducts(): Product[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log("📦 Parsed products from localStorage:", {
          count: parsed.length,
          productIds: parsed.map((p: any) => p.id),
        });
        // Convert date strings back to Date objects
        return parsed.map((p: any) => ({
          ...p,
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        }));
      } catch (e) {
        console.error("❌ Failed to parse stored products:", e);
        console.error("Raw data:", stored.substring(0, 200));
        return [];
      }
    } else {
      console.log("📦 No products found in localStorage (key:", PRODUCTS_STORAGE_KEY + ")");
      // Check if localStorage is accessible
      try {
        localStorage.setItem("__test__", "test");
        localStorage.removeItem("__test__");
        console.log("✅ localStorage is accessible");
      } catch (e: any) {
        console.error("❌ localStorage is not accessible:", e);
        if (e.name === 'QuotaExceededError') {
          console.error("💡 localStorage quota exceeded! This might be why products disappeared.");
        }
      }
    }
  } catch (e) {
    console.error("❌ Error accessing localStorage:", e);
  }
  return [];
}

/**
 * Save all products
 */
export function saveAllProducts(products: Product[]): void {
  if (typeof window !== "undefined") {
    try {
      const json = JSON.stringify(products);
      console.log("💾 Saving products to localStorage:", {
        count: products.length,
        productIds: products.map(p => p.id),
        size: (json.length / 1024).toFixed(2) + " KB",
        key: PRODUCTS_STORAGE_KEY,
      });
      localStorage.setItem(PRODUCTS_STORAGE_KEY, json);
      console.log("✅ Products saved successfully");
      
      // Dispatch custom event for same-tab updates
      window.dispatchEvent(new Event("productsUpdated"));
    } catch (e: any) {
      console.error("❌ Failed to save products:", e);
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.error("💡 localStorage quota exceeded!");
        alert("Cannot save products: localStorage is full. Please clear some data or use a smaller image.");
      } else {
        alert("Failed to save products. Please try again.");
      }
    }
  }
}

/**
 * Get a product by ID
 */
export function getProduct(productId: string): Product | null {
  const products = getAllProducts();
  return products.find((p) => p.id === productId) || null;
}

/**
 * Save a product
 */
export function saveProduct(product: Product): void {
  const products = getAllProducts();
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
  
  saveAllProducts(products);
}

/**
 * Delete a product
 */
export function deleteProduct(productId: string): void {
  const products = getAllProducts().filter((p) => p.id !== productId);
  saveAllProducts(products);
  
  // Also delete the product's config
  if (typeof window !== "undefined") {
    localStorage.removeItem(`${PRODUCT_CONFIG_PREFIX}${productId}`);
  }
}

/**
 * Get product config
 * Loads from server (primary) or localStorage (fallback)
 */
export async function getProductConfig(productId: string): Promise<ProductConfig | null> {
  if (typeof window === "undefined") return null;
  
  // Try to load from server first (primary storage)
  // Add cache-busting parameter to ensure we get the latest config
  try {
    const response = await fetch(`/api/products/${productId}/config?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (response.ok) {
      const data = await response.json();
      if (data.config) {
        console.log("📥 Loaded product config from server:", {
          productId: data.config.productId,
          hasMainImage: !!data.config.mainProductImageUrl,
          mainImageUrl: data.config.mainProductImageUrl || "Not set",
        });
        
        // Also sync to localStorage as backup
        try {
          localStorage.setItem(
            `${PRODUCT_CONFIG_PREFIX}${productId}`,
            JSON.stringify(data.config)
          );
        } catch (e) {
          console.warn("⚠️ Could not sync server config to localStorage:", e);
        }
        
      // Process the config (reorder steps, filter, etc.)
      return await processProductConfig(data.config, productId);
      }
    }
  } catch (error) {
    console.warn("⚠️ Server load failed, trying localStorage:", error);
  }
  
  // Fallback to localStorage
  const stored = localStorage.getItem(`${PRODUCT_CONFIG_PREFIX}${productId}`);
  if (stored) {
    try {
      const config = JSON.parse(stored) as ProductConfig;
      console.log("📥 Loaded product config from localStorage (fallback):", {
        productId: config.productId,
        hasMainImage: !!config.mainProductImageUrl,
      });
      
      // Process the config (reorder steps, filter, etc.)
      return await processProductConfig(config, productId);
    } catch (e) {
      console.error("❌ Failed to parse stored product config:", e);
      return null;
    }
  }
  console.log("📥 No stored config found for productId:", productId);
  return null;
}

/**
 * Process product config: reorder steps, filter, apply images, etc.
 * EXPORTED for backup/restore functionality
 * 
 * @param config - The product config to process
 * @param productId - The product ID
 * @param productInfo - Optional product info (slug, name) for server-side processing
 */
export async function processProductConfig(
  config: ProductConfig, 
  productId: string,
  productInfo?: { slug?: string; name?: string }
): Promise<ProductConfig> {
  try {
    // Ensure all steps from STEPS constant are included, in the correct order
      const { STEPS } = require("@/constants/steps");
      const { stepDataMap } = require("@/data");
      const stepOrder = STEPS.map((s: { id: string }) => s.id);
      
      // Build steps array: include all steps from STEPS constant, preserving existing step data
      const reorderedSteps = stepOrder
        .map((stepId: string) => {
          // First, try to find existing step in config
          const existingStep = config.steps?.find((s: { id: string }) => s.id === stepId);
          if (existingStep) {
            return existingStep;
          }
          // If step doesn't exist, create it from STEPS constant
          const stepFromConstant = STEPS.find((s: { id: string }) => s.id === stepId);
          if (stepFromConstant) {
            console.log(`➕ Adding missing step "${stepId}" to product config`);
            return {
              id: stepFromConstant.id,
              name: stepFromConstant.name,
              route: stepFromConstant.route,
            };
          }
          return null;
        })
        .filter((step): step is NonNullable<typeof step> => step !== null)
        // Add any extra steps that aren't in STEPS constant (for backward compatibility)
        .concat(config.steps?.filter((s: { id: string }) => !stepOrder.includes(s.id)) || []);
      
      // Ensure stepData exists for all steps (add default stepData if missing)
      const updatedStepData = { ...config.stepData };
      for (const step of reorderedSteps) {
        if (!updatedStepData[step.id] && stepDataMap[step.id]) {
          console.log(`➕ Adding missing stepData for "${step.id}" to product config`);
          updatedStepData[step.id] = stepDataMap[step.id];
        }
      }
      config.stepData = updatedStepData;
      
      // Filter out rear-glass-wall step for Hiki and Aisti models only (Cube 125 should have it)
      // Get product info to check model type
      // Use provided productInfo if available (for server-side), otherwise try to get from client
      let productSlug: string = productInfo?.slug || productId || "";
      let productName: string = productInfo?.name || config.productName || "";
      
      // Try to get from client-side if productInfo not provided
      if (typeof window !== "undefined" && !productInfo) {
        try {
          const { getAllProducts } = require("./productStorage");
          const products = getAllProducts();
          const product = products.find((p: any) => p.id === productId);
          productSlug = product?.slug || productSlug;
          productName = product?.name || productName;
        } catch (e) {
          // Ignore if can't get products
        }
      }
      // More robust detection - check for "aisti" or "hiki" in various forms
      const slugLower = productSlug.toLowerCase();
      const nameLower = productName.toLowerCase();
      const idLower = productId.toLowerCase();
      const isHikiOrAisti = slugLower.includes("hiki") || 
                            slugLower.includes("aisti") ||
                            nameLower.includes("hiki") ||
                            nameLower.includes("aisti") ||
                            idLower.includes("hiki") ||
                            idLower.includes("aisti");
      
      console.log(`🔍 Checking if Hiki/Aisti:`, {
        productSlug,
        productName,
        productId,
        slugLower,
        nameLower,
        idLower,
        isHikiOrAisti,
      });
      
      let filteredSteps = reorderedSteps.length > 0 ? reorderedSteps : config.steps;
      
      // Remove "stones" step - it's now integrated into the heater step
      filteredSteps = filteredSteps.filter((s: { id: string }) => s.id !== "stones");
      if (config.stepData && config.stepData["stones"]) {
        const updatedStepData = { ...config.stepData };
        delete updatedStepData["stones"];
        config.stepData = updatedStepData;
        console.log(`🚫 Removed "stones" step (now integrated into heater step)`);
      }
      
      if (isHikiOrAisti) {
        filteredSteps = filteredSteps.filter((s: { id: string }) => s.id !== "rear-glass-wall");
        // Also remove from stepData
        if (config.stepData && config.stepData["rear-glass-wall"]) {
          const updatedStepData = { ...config.stepData };
          delete updatedStepData["rear-glass-wall"];
          config.stepData = updatedStepData;
        }
        console.log(`🚫 Removed rear-glass-wall step for ${productName} (Hiki/Aisti model)`);
      }
      
      // Update half-moon option images based on product type (before applying global settings)
      if (config.stepData && config.stepData["rear-glass-wall"]) {
        const rearGlassStep = config.stepData["rear-glass-wall"];
        const slugLower = productSlug.toLowerCase();
        const nameLower = productName.toLowerCase();
        const idLower = productId.toLowerCase();
        const isCube = slugLower.includes("cube") || nameLower.includes("cube") || idLower.includes("cube");
        const isBarrel = slugLower.includes("barrel") || nameLower.includes("barrel") || idLower.includes("barrel");
        
        console.log(`🖼️ Checking product type for half-moon image:`, {
          productSlug,
          productName,
          productId,
          isCube,
          isBarrel,
          hasRearGlassStep: !!rearGlassStep,
          options: rearGlassStep.options.map((o: any) => ({ id: o.id, imageUrl: o.imageUrl })),
        });
        
        if (isCube || isBarrel) {
          // First, filter options based on product type
          let filteredOptions = rearGlassStep.options;
          
          if (isCube) {
            // Cube models: Only show wooden backwall and half moon (exclude full glass backwall)
            filteredOptions = rearGlassStep.options.filter((option: any) => {
              const optionId = option.id || "";
              const optionTitleLower = (option.title || "").toLowerCase();
              const isFullGlassBackwall = optionId === "full-glass-backwall" ||
                                        ((optionTitleLower.includes("full glass") || optionTitleLower.includes("fullglass")) && 
                                         (optionTitleLower.includes("backwall") || optionTitleLower.includes("back wall")));
              return !isFullGlassBackwall; // Exclude full glass backwall for cubes
            });
            console.log(`🖼️ ✅ Filtered options for cube ${productName} - removed full glass backwall. Remaining: ${filteredOptions.length} options`);
          } else if (isBarrel) {
            // Barrel models: Show all rear glass wall options (no filtering)
            // All options are available for barrel models
            filteredOptions = rearGlassStep.options;
            console.log(`🖼️ ✅ Barrel model ${productName} - showing all ${filteredOptions.length} rear glass wall options`);
          }
          
          const updatedOptions = filteredOptions.map((option: any) => {
            const optionTitleLower = (option.title || "").toLowerCase();
            const optionIdLower = (option.id || "").toLowerCase();
            
            // Handle half-moon
            const isHalfMoon = option.id === "glass-half-moon" || 
                              optionIdLower.includes("half-moon") ||
                              optionTitleLower.includes("half moon");
            
            if (isHalfMoon) {
              if (isCube) {
                console.log(`🖼️ ✅ Setting cube half-moon image for ${productName}: /cube-back-moon.jpg`);
                return { ...option, imageUrl: "/cube-back-moon.jpg" };
              } else if (isBarrel) {
                console.log(`🖼️ ✅ Setting barrel half-moon image for ${productName}: /barrel-half-moon.png`);
                return { ...option, imageUrl: "/barrel-half-moon.png" };
              }
            }
            
            // Handle wooden backwall by ID or title
            const isWoodenBackwall = option.id === "wooden-backwall" ||
                                     (optionTitleLower.includes("wooden") && 
                                      (optionTitleLower.includes("backwall") || optionTitleLower.includes("back wall")));
            
            if (isWoodenBackwall) {
              if (isCube) {
                console.log(`🖼️ ✅ Setting cube wooden backwall image for ${productName}: /cube-full-back-wall.jpg`);
                return { ...option, imageUrl: "/cube-full-back-wall.jpg" };
              } else if (isBarrel) {
                console.log(`🖼️ ✅ Setting barrel wooden backwall image for ${productName}: /barrel-full-back-wall.png`);
                return { ...option, imageUrl: "/barrel-full-back-wall.png" };
              }
            }
            
            // Handle full glass backwall by ID or title
            const isFullGlassBackwall = option.id === "full-glass-backwall" ||
                                        ((optionTitleLower.includes("full glass") || optionTitleLower.includes("fullglass")) && 
                                         (optionTitleLower.includes("backwall") || optionTitleLower.includes("back wall")));
            
            if (isFullGlassBackwall && isBarrel) {
              console.log(`🖼️ ✅ Setting barrel full glass backwall image for ${productName}: /barrel-full-glass-wall.png`);
              return { ...option, imageUrl: "/barrel-full-glass-wall.png" };
            }
            
            // Handle standard glass wall for barrel
            if (option.id === "glass-standard" && isBarrel) {
              console.log(`🖼️ ✅ Setting barrel standard glass image for ${productName}: /barrel-full-glass-wall.png`);
              return { ...option, imageUrl: "/barrel-full-glass-wall.png" };
            }
            
            return option;
          });
          
          // Sort options: wooden backwall first, then others
          const sortedOptions = [...updatedOptions].sort((a: any, b: any) => {
            const aTitleLower = (a.title || "").toLowerCase();
            const bTitleLower = (b.title || "").toLowerCase();
            const aIsWooden = aTitleLower.includes("wooden") && (aTitleLower.includes("backwall") || aTitleLower.includes("back wall"));
            const bIsWooden = bTitleLower.includes("wooden") && (bTitleLower.includes("backwall") || bTitleLower.includes("back wall"));
            
            if (aIsWooden && !bIsWooden) return -1; // a comes first
            if (!aIsWooden && bIsWooden) return 1;  // b comes first
            return 0; // keep original order for others
          });
          
          config.stepData["rear-glass-wall"] = {
            ...rearGlassStep,
            options: sortedOptions,
          };
          
          console.log(`🖼️ Updated rear glass step options:`, config.stepData["rear-glass-wall"].options.map((o: any) => ({ id: o.id, imageUrl: o.imageUrl })));
        }
      }
      
      // Filter out express and white glove delivery options - only keep standard delivery
      if (config.stepData && config.stepData["delivery"]) {
        const deliveryStep = config.stepData["delivery"];
        const filteredDeliveryOptions = deliveryStep.options.filter((option: any) => {
          const optionId = option.id || "";
          const optionTitleLower = (option.title || "").toLowerCase();
          // Keep only standard delivery, remove express and white glove
          const isExpress = optionId.includes("express") || optionTitleLower.includes("express");
          const isWhiteGlove = optionId.includes("white-glove") || 
                               optionId.includes("whiteglove") ||
                               optionTitleLower.includes("white glove") ||
                               optionTitleLower.includes("whiteglove");
          return !isExpress && !isWhiteGlove;
        });
        
        // If we filtered out options, update the stepData
        if (filteredDeliveryOptions.length !== deliveryStep.options.length) {
          console.log(`🚫 Filtered out express/white glove delivery options. Remaining: ${filteredDeliveryOptions.length} option(s)`);
          config.stepData["delivery"] = {
            ...deliveryStep,
            options: filteredDeliveryOptions,
          };
        }
      }
      
      const configWithReorderedSteps = {
        ...config,
        steps: filteredSteps,
      };
      
      // Apply global settings to the product config
      const { applyGlobalSettingsToProductConfig } = require("./applyGlobalSettings");
      console.log("📥 Before applying global settings - steps:", configWithReorderedSteps.steps?.map(s => ({ id: s.id, name: s.name })));
      const finalConfig = await applyGlobalSettingsToProductConfig(configWithReorderedSteps);
      console.log("📥 After applying global settings:", {
        hasMainImage: !!finalConfig.mainProductImageUrl,
        mainImageLength: finalConfig.mainProductImageUrl?.length || 0,
        mainImagePreview: finalConfig.mainProductImageUrl?.substring(0, 100),
        mainImageValue: finalConfig.mainProductImageUrl || "undefined/null/empty",
        preserved: finalConfig.mainProductImageUrl === config.mainProductImageUrl,
        stepsBefore: config.steps?.map(s => ({ id: s.id, name: s.name })),
        stepsAfter: finalConfig.steps?.map(s => ({ id: s.id, name: s.name })),
      });
      return finalConfig;
  } catch (e) {
    console.error("Failed to process product config:", e);
    return config; // Return original config if processing fails
  }
}

/**
 * Save product config
 * Saves to server (primary) and localStorage (backup)
 * NOTE: Step names are NOT saved - they are always taken from global settings
 * This ensures global step names always override product-specific names
 */
export async function saveProductConfig(config: ProductConfig): Promise<void> {
  if (typeof window === "undefined") return;

  // IMPORTANT: Don't save step names - they should always come from global settings
  // Reset step names to defaults before saving to ensure global settings always apply
  const { STEPS } = require("@/constants/steps");
  const configToSave: ProductConfig = {
    ...config,
    steps: config.steps.map((step, index) => {
      // Use default step name from STEPS constant (global settings will override on load)
      const defaultStep = STEPS.find((s: { id: string }) => s.id === step.id) || STEPS[index];
      const resetName = defaultStep?.name || step.name;
      if (step.name !== resetName) {
        console.log(`💾 Resetting step name for ${step.id} before save: "${step.name}" → "${resetName}" (global settings will apply on load)`);
      }
      return {
        ...step,
        name: resetName, // Reset to default, global settings will override on load
      };
    }),
  };
  
  console.log("💾 Saving product config with step names reset to defaults (global settings will apply on load)");
  const configJson = JSON.stringify(configToSave);
  const configSize = configJson.length;
  
  // Save to server first (primary storage)
  try {
    const response = await fetch(`/api/products/${config.productId}/config`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(configToSave),
    });

    if (response.ok) {
      console.log("✅ Config saved to server");
    } else {
      console.warn("⚠️ Failed to save config to server, using localStorage backup");
    }
  } catch (error) {
    console.warn("⚠️ Server save failed, using localStorage backup:", error);
  }

  // Always save to localStorage as backup
  try {
    localStorage.setItem(
      `${PRODUCT_CONFIG_PREFIX}${config.productId}`,
      configJson
    );
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event("productConfigUpdated"));
    console.log("✅ Config saved to localStorage (backup)");
  } catch (e: any) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      console.error("❌ localStorage quota exceeded! Config size:", (configSize / 1024 / 1024).toFixed(2), "MB");
      console.error("💡 Image data URL is too large. Consider using a URL instead of uploading from computer.");
      alert("Image is too large to save! Please use an image URL instead of uploading from your computer, or use a smaller image.");
    } else {
      console.error("❌ Failed to save to localStorage:", e);
      // Don't alert here since server save might have succeeded
    }
  }
}

/**
 * Delete product config
 */
export function deleteProductConfig(productId: string): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(`${PRODUCT_CONFIG_PREFIX}${productId}`);
  }
}

/**
 * Quote storage
 */
const QUOTES_STORAGE_KEY = "saunamo-quotes";

export function saveQuote(quote: Quote): void {
  if (typeof window === "undefined") return;
  
  const quotes = getAllQuotes();
  const existingIndex = quotes.findIndex((q) => q.id === quote.id);
  
  const quoteToSave = {
    ...quote,
    createdAt: quote.createdAt instanceof Date ? quote.createdAt.toISOString() : quote.createdAt,
    expiresAt: quote.expiresAt instanceof Date ? quote.expiresAt.toISOString() : quote.expiresAt,
  };
  
  if (existingIndex >= 0) {
    quotes[existingIndex] = quoteToSave;
  } else {
    quotes.push(quoteToSave);
  }
  
  localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(quotes));
}

export function getAllQuotes(): Quote[] {
  if (typeof window === "undefined") return [];
  
  const stored = localStorage.getItem(QUOTES_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.map((q: any) => ({
        ...q,
        createdAt: q.createdAt ? new Date(q.createdAt) : new Date(),
        expiresAt: q.expiresAt ? new Date(q.expiresAt) : undefined,
      }));
    } catch (e) {
      console.error("Failed to parse stored quotes:", e);
      return [];
    }
  }
  return [];
}

export function getQuote(quoteId: string): Quote | null {
  const quotes = getAllQuotes();
  const quote = quotes.find((q) => q.id === quoteId);
  return quote || null;
}

export function deleteQuote(quoteId: string): void {
  if (typeof window === "undefined") return;
  
  const quotes = getAllQuotes().filter((q) => q.id !== quoteId);
  localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(quotes));
}

