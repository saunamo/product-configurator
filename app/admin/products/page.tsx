"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAllProducts, deleteProduct, saveProduct, saveProductConfig, getProductConfig } from "@/utils/productStorage";
import { Product, ProductConfig } from "@/types/product";
import { Step, StepData, Option } from "@/types/configurator";
import { defaultDesignConfig } from "@/constants/defaultDesign";
import { defaultQuoteSettings } from "@/constants/defaultQuoteSettings";
import { STEPS } from "@/constants/steps";
import { stepDataMap } from "@/data";

export default function ProductsManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Load products from server API (automatically loads on startup)
    const loadProducts = async () => {
      try {
        const loaded = await getAllProducts();
        console.log("📦 Loaded products:", {
          count: loaded.length,
          productIds: loaded.map(p => p.id),
          source: "server API (with localStorage fallback)",
        });
        
        setProducts(loaded);
      } catch (error) {
        console.error("❌ Error loading products:", error);
        setProducts([]);
      }
    };
    
    // Load products immediately on mount
    loadProducts();
    
    // Listen for storage events (cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "saunamo-products" || e.key === null) {
        console.log("🔄 Storage event detected, reloading products...");
        loadProducts();
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    
    // Listen for custom events (same-tab updates)
    const handleProductUpdate = () => {
      console.log("🔄 Product update event detected, reloading products...");
      loadProducts();
    };
    
    window.addEventListener("productsUpdated", handleProductUpdate);
    window.addEventListener("productConfigUpdated", handleProductUpdate);
    
    // Auto-update product names and images on load
    const autoUpdate = async () => {
      const products = await getAllProducts();
      if (products.length === 0) return;

      const PRODUCT_UPDATES: Record<string, { name: string; imageUrl: string }> = {
        "cube-125": { name: "Outdoor Sauna Cube 125", imageUrl: "/outdoor-sauna-cube-125.webp" },
        "cube-220": { name: "Outdoor Sauna Cube 220", imageUrl: "/outdoor-sauna-cube-220.webp" },
        "cube-300": { name: "Outdoor Sauna Cube 300", imageUrl: "/outdoor-sauna-cube-300.webp" },
        "cubus": { name: "Outdoor Sauna Cube 300", imageUrl: "/outdoor-sauna-cube-300.webp" },
        "hiki-s": { name: "Outdoor Sauna Hiki S", imageUrl: "/outdoor-sauna-hiki-s.webp" },
        "hiki-l": { name: "Outdoor Sauna Hiki L", imageUrl: "/outdoor-sauna-hiki-l.webp" },
        "barrel-220": { name: "Outdoor Sauna Barrel 220", imageUrl: "/outdoor-sauna-barrel-220.webp" },
        "barrel-280": { name: "Outdoor Sauna Barrel 280 Deluxe", imageUrl: "/outdoor-sauna-barrel-280-deluxe.webp" },
        "aisti-150": { name: "Indoor Sauna Aisti 150", imageUrl: "/indoor-sauna-aisti-150.webp" },
        "aisti-220": { name: "Indoor Sauna Thermo Black 220", imageUrl: "/indoor-sauna-thermo-black-220-4432644.webp" },
        "thermo-black-220": { name: "Indoor Sauna Thermo Black 220", imageUrl: "/indoor-sauna-thermo-black-220-4432644.webp" },
      };

      let updatedCount = 0;
      for (const product of products) {
        const update = PRODUCT_UPDATES[product.slug] || PRODUCT_UPDATES[product.id];
        if (!update) continue;

        try {
          let config = await getProductConfig(product.id);
          if (!config) {
            // Only create NEW config with default image if config doesn't exist
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
            updatedCount++;
            console.log(`✅ Created config for ${product.name} → ${update.name}`);
          } else if (config.productName !== update.name) {
            // ONLY update product NAME, DO NOT overwrite custom images!
            config.productName = update.name;
            // Keep the existing mainProductImageUrl - don't overwrite it!
            saveProductConfig(config);
            updatedCount++;
            console.log(`✅ Updated product name: ${product.name} → ${update.name} (kept existing image)`);
          }
        } catch (error) {
          console.error(`❌ Failed to update ${product.name}:`, error);
        }
      }

      if (updatedCount > 0) {
        console.log(`✅ Auto-updated ${updatedCount} product(s) with new names and images`);
        loadProducts(); // Reload to show updated names
      }
    };

    // Run auto-update after a short delay to ensure everything is loaded
    setTimeout(autoUpdate, 500);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("productsUpdated", handleProductUpdate);
      window.removeEventListener("productConfigUpdated", handleProductUpdate);
    };
  }, []);

  const setupAllProducts = async () => {
    if (!confirm("This will create 9 products with all their steps and options. Continue?")) {
      return;
    }

    setIsSettingUp(true);

    // Product data from the table
    const productData = [
      {
        model: "Cube 125",
        slug: "cube-125",
        steps: {
          "Wall modifications": ["Half moon glass backwall", "wooden backwall"],
          "Electric heaters": ["Aava 4.7kW (20kg)", "Kajo 6.6kW (80kg)"],
          "Stones": ["According to selected heater"],
          "Woodburning heaters": [],
          "Lighting": ["1x or 2x 2.5m LED"],
          "Accessories": ["accessory set", "sauna scent set", "sauna hats"],
          "Installation": ["Wood treament exterior", "interior", "assembly", "electrical work"],
          "Icebaths": ["Ice bath Ergo", "Ice bath Cube", "Ice bath Ofuro"],
          "Hot tubs": ["Hot tub Cube 200", "Hot tub Therma 200", "Hot tub Therma 220", "Hot tub Vellamo S", "Hot tub Vellamo M", "Hot tub Vellamo L"],
          "Transportation": [],
        },
      },
      {
        model: "Cube 220",
        slug: "cube-220",
        steps: {
          "Wall modifications": ["Half moon glass backwall", "wooden backwall", "full glass backwall"],
          "Electric heaters": ["Aava 9.4kW (20kg)", "Kajo 9kW (100kg)", "Kajo 10.5kW (100kg)", "Taika 9kW (130kg)", "Taika 10.5kW (200kg)"],
          "Stones": ["According to selected heater"],
          "Woodburning heaters": ["Pyros 20 (160kg)"],
          "Lighting": ["2x or 4x 2.5m LED"],
          "Accessories": ["accessory set", "sauna scent set", "sauna hats"],
          "Installation": ["Wood treament exterior", "interior", "assembly", "electrical work"],
          "Icebaths": ["Ice bath Ergo", "Ice bath Cube", "Ice bath Ofuro"],
          "Hot tubs": ["Hot tub Cube 200", "Hot tub Therma 200", "Hot tub Therma 220", "Hot tub Vellamo S", "Hot tub Vellamo M", "Hot tub Vellamo L"],
          "Transportation": [],
        },
      },
      {
        model: "Cube 300",
        slug: "cube-300",
        steps: {
          "Wall modifications": ["Half moon glass backwall", "wooden backwall", "full glass backwall"],
          "Electric heaters": ["Kajo 10.5kW (100kg)", "Taika 10.5kW (200kg)"],
          "Stones": ["According to selected heater"],
          "Woodburning heaters": ["Pyros 16 (190kg)", "Pyros 20 (160kg)"],
          "Lighting": ["2x or 4x 2.5m LED"],
          "Accessories": ["accessory set", "sauna scent set", "sauna hats"],
          "Installation": ["Wood treament exterior", "interior", "assembly", "electrical work"],
          "Icebaths": ["Ice bath Ergo", "Ice bath Cube", "Ice bath Ofuro"],
          "Hot tubs": ["Hot tub Cube 200", "Hot tub Therma 200", "Hot tub Therma 220", "Hot tub Vellamo S", "Hot tub Vellamo M", "Hot tub Vellamo L"],
          "Transportation": [],
        },
      },
      {
        model: "Hiki S",
        slug: "hiki-s",
        steps: {
          "Wall modifications": [],
          "Electric heaters": ["Aava 4.7kW (20kg)", "Kajo 6.6kW (80kg)"],
          "Stones": ["According to selected heater"],
          "Woodburning heaters": ["Noki 12 (20kg)"],
          "Lighting": ["1x or 2x 2.5m LED"],
          "Accessories": ["accessory set", "sauna scent set", "sauna hats"],
          "Installation": ["Wood treament exterior", "interior", "assembly", "electrical work"],
          "Icebaths": ["Ice bath Ergo", "Ice bath Cube", "Ice bath Ofuro"],
          "Hot tubs": ["Hot tub Cube 200", "Hot tub Therma 200", "Hot tub Therma 220", "Hot tub Vellamo S", "Hot tub Vellamo M", "Hot tub Vellamo L"],
          "Transportation": [],
        },
      },
      {
        model: "Hiki L",
        slug: "hiki-l",
        steps: {
          "Wall modifications": [],
          "Electric heaters": ["Aava 9.4kW (20kg)", "Kajo 9kW (100kg)", "Kajo 10.5kW (100kg)", "Taika 9kW (130kg)", "Taika 10.5kW (200kg)"],
          "Stones": ["According to selected heater"],
          "Woodburning heaters": ["Pyros 16 (190kg)", "Pyros 20 (160kg)"],
          "Lighting": ["2x or 4x 2.5m LED"],
          "Accessories": ["accessory set", "sauna scent set", "sauna hats"],
          "Installation": ["Wood treament exterior", "interior", "assembly", "electrical work"],
          "Icebaths": ["Ice bath Ergo", "Ice bath Cube", "Ice bath Ofuro"],
          "Hot tubs": ["Hot tub Cube 200", "Hot tub Therma 200", "Hot tub Therma 220", "Hot tub Vellamo S", "Hot tub Vellamo M", "Hot tub Vellamo L"],
          "Transportation": [],
        },
      },
      {
        model: "Barrel 220",
        slug: "barrel-220",
        steps: {
          "Wall modifications": ["Half moon glass backwall", "wooden backwall", "full glass backwall"],
          "Electric heaters": ["Aava 9.4kW (20kg)", "Kajo 9kW (100kg)", "Taika 9kW (130kg)"],
          "Stones": ["According to selected heater"],
          "Woodburning heaters": ["Noki12 (20kg)"],
          "Lighting": ["2x or 4x 2.5m LED"],
          "Accessories": ["accessory set", "sauna scent set", "sauna hats"],
          "Installation": ["Wood treament exterior", "interior", "assembly", "electrical work"],
          "Icebaths": ["Ice bath Ergo", "Ice bath Cube", "Ice bath Ofuro"],
          "Hot tubs": ["Hot tub Cube 200", "Hot tub Therma 200", "Hot tub Therma 220", "Hot tub Vellamo S", "Hot tub Vellamo M", "Hot tub Vellamo L"],
          "Transportation": [],
        },
      },
      {
        model: "Barrel 280",
        slug: "barrel-280",
        steps: {
          "Wall modifications": ["Half moon glass backwall", "wooden backwall", "full glass backwall"],
          "Electric heaters": ["Aava 9.4kW (20kg)", "Kajo 9kW (100kg)", "Kajo 10.5kW (100kg)", "Taika 9kW (130kg)", "Taika 10.5kW (200kg)"],
          "Stones": ["According to selected heater"],
          "Woodburning heaters": ["Pyros 16 (190kg)", "Pyros 20 (160kg)"],
          "Lighting": ["2x or 4x 2.5m LED"],
          "Accessories": ["accessory set", "sauna scent set", "sauna hats"],
          "Installation": ["Wood treament exterior", "interior", "assembly", "electrical work"],
          "Icebaths": ["Ice bath Ergo", "Ice bath Cube", "Ice bath Ofuro"],
          "Hot tubs": ["Hot tub Cube 200", "Hot tub Therma 200", "Hot tub Therma 220", "Hot tub Vellamo S", "Hot tub Vellamo M", "Hot tub Vellamo L"],
          "Transportation": [],
        },
      },
      {
        model: "Aisti 150",
        slug: "aisti-150",
        steps: {
          "Wall modifications": [],
          "Electric heaters": ["Aava 4.7kW (20kg)"],
          "Stones": ["According to selected heater"],
          "Woodburning heaters": [],
          "Lighting": ["1x or 2x 2.5m LED"],
          "Accessories": ["accessory set", "sauna scent set", "sauna hats"],
          "Installation": ["Wood treament interior", "assembly", "electrical work"],
          "Icebaths": ["Ice bath Ergo", "Ice bath Cube", "Ice bath Ofuro"],
          "Hot tubs": ["Hot tub Cube 200", "Hot tub Therma 200", "Hot tub Therma 220", "Hot tub Vellamo S", "Hot tub Vellamo M", "Hot tub Vellamo L"],
          "Transportation": [],
        },
      },
      {
        model: "Aisti 220",
        slug: "aisti-220",
        steps: {
          "Wall modifications": [],
          "Electric heaters": ["Aava 4.7kW (20kg)", "Kajo 6.6kW (80kg)"],
          "Stones": ["According to selected heater"],
          "Woodburning heaters": [],
          "Lighting": ["1x or 2x 2.5m LED"],
          "Accessories": ["accessory set", "sauna scent set", "sauna hats"],
          "Installation": ["Wood treament interior", "assembly", "electrical work"],
          "Icebaths": ["Ice bath Ergo", "Ice bath Cube", "Ice bath Ofuro"],
          "Hot tubs": ["Hot tub Cube 200", "Hot tub Therma 200", "Hot tub Therma 220", "Hot tub Vellamo S", "Hot tub Vellamo M", "Hot tub Vellamo L"],
          "Transportation": [],
        },
      },
    ];

    // Step name mapping
    // Note: "Electric heaters", "Stones", and "Woodburning heaters" all go under "heater" step
    const stepNameToId: Record<string, string> = {
      "Wall modifications": "rear-glass-wall",
      "Electric heaters": "heater", // Combined into heater step
      "Stones": "heater", // Combined into heater step
      "Woodburning heaters": "heater", // Combined into heater step
      "Lighting": "lighting",
      "Accessories": "aromas-accessories",
      "Installation": "electrical-assembly",
      "Icebaths": "cold-plunge",
      "Hot tubs": "hot-tubs",
      "Transportation": "delivery",
    };

    const stepDisplayNames: Record<string, string> = {
      "Wall modifications": "Rear Glass Wall",
      "Electric heaters": "Heater",
      "Stones": "Heater",
      "Woodburning heaters": "Heater",
      "Lighting": "Lighting",
      "Accessories": "Aromas & Sauna Accessories",
      "Installation": "Electrical Installation & Sauna Assembly",
      "Icebaths": "Cold Plunge",
      "Hot tubs": "Hot Tubs",
      "Transportation": "Delivery",
    };

    function createSlug(name: string): string {
      return name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    }

    function createOptionId(stepId: string, optionTitle: string): string {
      return `${stepId}-${createSlug(optionTitle)}`;
    }

    function parseLightingOptions(lightingText: string): string[] {
      if (lightingText.includes(" or ")) {
        return lightingText.split(" or ").map((opt) => opt.trim());
      }
      return [lightingText.trim()];
    }

    try {
      for (const data of productData) {
        const productId = createSlug(data.model);
        
        // Check if product already exists - if so, we'll update it
        const allProducts = await getAllProducts();
        const existing = allProducts.find((p) => p.id === productId);
        if (existing) {
          console.log(`Updating existing product: ${data.model}`);
        }

        const product: Product = {
          id: productId,
          name: data.model,
          slug: data.slug,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Create steps and stepData
        const steps: Step[] = [];
        const stepData: Record<string, StepData> = {};

        // Group heater-related steps together
        const heaterOptions: string[] = [];
        const heaterStepNames = ["Electric heaters", "Stones", "Woodburning heaters"];
        
        Object.entries(data.steps).forEach(([stepName, options]) => {
          const stepId = stepNameToId[stepName];
          if (!stepId) {
            console.warn(`Unknown step name: ${stepName}`);
            return;
          }

          // Skip steps with no options (unless it's a heater step that we're combining)
          if ((!options || options.length === 0) && !heaterStepNames.includes(stepName)) {
            return;
          }

          // If this is a heater-related step, collect options instead of creating a step
          if (heaterStepNames.includes(stepName)) {
            if (options && options.length > 0) {
              // Parse options for heater steps
              options.forEach((opt) => {
                const split = opt.split(",").map((o) => o.trim()).filter(Boolean);
                heaterOptions.push(...split);
              });
            }
            return; // Don't create a step for this, we'll create one combined step
          }

          // Create step with capitalized name (for non-heater steps)
          const displayName = stepDisplayNames[stepName] || stepName;
          const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
          
          // Check if step already exists (avoid duplicates)
          if (!steps.find(s => s.id === stepId)) {
            const step: Step = {
              id: stepId,
              name: capitalizedName,
              route: stepId,
            };
            steps.push(step);
          }

          // Parse options
          let parsedOptions: string[] = [];
          if (stepName === "Lighting") {
            // Lighting uses "OR" - create separate options
            options.forEach((opt) => {
              parsedOptions.push(...parseLightingOptions(opt));
            });
          } else {
            // Other steps use comma-separated values
            options.forEach((opt) => {
              // Split by comma and clean up
              const split = opt.split(",").map((o) => o.trim()).filter(Boolean);
              parsedOptions.push(...split);
            });
          }

          // Create option objects
          const optionObjects: Option[] = parsedOptions.map((optionTitle) => ({
            id: createOptionId(stepId, optionTitle),
            title: optionTitle,
            description: "",
            imageUrl: "",
            price: 0,
          }));

          // Determine selection type
          // Lighting is single-select (OR), others are typically multi-select
          const selectionType = stepName === "Lighting" ? "single" : "multi";

          // Merge options if step already exists (for heater step)
          if (stepData[stepId]) {
            // Merge options, avoiding duplicates
            const existingOptionIds = new Set(stepData[stepId].options.map(o => o.id));
            const newOptions = optionObjects.filter(o => !existingOptionIds.has(o.id));
            stepData[stepId].options = [...stepData[stepId].options, ...newOptions];
          } else {
            // Create stepData with capitalized title
            const stepTitle = stepDisplayNames[stepName] || stepName;
            const capitalizedTitle = stepTitle.charAt(0).toUpperCase() + stepTitle.slice(1);
            stepData[stepId] = {
              stepId,
              title: capitalizedTitle,
              description: "",
              options: optionObjects,
              selectionType,
              required: false, // Allow navigation without selection for optional steps
            };
          }
        });

        // Create combined heater step if there are any heater options
        if (heaterOptions.length > 0) {
          const heaterStepId = "heater";
          
          // Add heater step if it doesn't exist
          if (!steps.find(s => s.id === heaterStepId)) {
            steps.push({
              id: heaterStepId,
              name: "Heater",
              route: heaterStepId,
            });
          }

          // Create option objects for heater
          const heaterOptionObjects: Option[] = heaterOptions.map((optionTitle) => ({
            id: createOptionId(heaterStepId, optionTitle),
            title: optionTitle,
            description: "",
            imageUrl: "",
            price: 0,
          }));

          // Merge with existing heater options if any
          if (stepData[heaterStepId]) {
            const existingOptionIds = new Set(stepData[heaterStepId].options.map(o => o.id));
            const newOptions = heaterOptionObjects.filter(o => !existingOptionIds.has(o.id));
            stepData[heaterStepId].options = [...stepData[heaterStepId].options, ...newOptions];
          } else {
            stepData[heaterStepId] = {
              stepId: heaterStepId,
              title: "Heater",
              description: "",
              options: heaterOptionObjects,
              selectionType: "multi",
              required: false,
            };
          }
        }

        const config: ProductConfig = {
          productId,
          productName: data.model,
          steps,
          stepData,
          design: defaultDesignConfig,
          priceSource: "pipedrive",
          quoteSettings: defaultQuoteSettings,
        };

        // Save product (will update if exists) - async
        await saveProduct(product);
        
        // Save product config (will update if exists) - async
        await saveProductConfig(config);
        
        console.log(`✅ ${existing ? 'Updated' : 'Created'} product: ${data.model} with ${steps.length} steps and ${Object.values(stepData).reduce((sum, sd) => sum + sd.options.length, 0)} total options`);
      }

      // Refresh the products list
      const refreshedProducts = await getAllProducts();
      setProducts(refreshedProducts);
      alert(`✅ Successfully created ${productData.length} products!`);
    } catch (error: any) {
      console.error("Error setting up products:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSettingUp(false);
    }
  };
  
  if (!isClient) {
    return (
      <div className="min-h-screen bg-[#faf9f7] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const updateAllProductNamesAndImages = async () => {
    if (!confirm("This will update all product names and main images to match the new sauna names. Continue?")) {
      return;
    }

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
        imageUrl: "/indoor-sauna-thermo-black-220-4432644.webp",
      },
      "thermo-black-220": {
        name: "Indoor Sauna Thermo Black 220",
        imageUrl: "/indoor-sauna-thermo-black-220-4432644.webp",
      },
    };

    const results: Array<{ productId: string; name: string; imageUrl: string; updated: boolean }> = [];
    const errors: Array<{ productId: string; error: string }> = [];

    for (const product of products) {
      // Try to match by slug first, then by id, then by name
      const update = PRODUCT_UPDATES[product.slug] || 
                    PRODUCT_UPDATES[product.id] ||
                    Object.entries(PRODUCT_UPDATES).find(([key, value]) => 
                      product.name.toLowerCase().includes(key.toLowerCase()) ||
                      product.name.toLowerCase().includes(value.name.toLowerCase().split(' ').pop()?.toLowerCase() || '')
                    )?.[1];

      if (!update) {
        console.log(`⚠️ No update found for product: ${product.name} (slug: ${product.slug}, id: ${product.id})`);
        continue;
      }

      try {
        const config = await getProductConfig(product.id);
        
        if (!config) {
          // Create default config if it doesn't exist
          const defaultConfig: ProductConfig = {
            productId: product.id,
            productName: update.name,
            mainProductImageUrl: update.imageUrl,
            steps: STEPS,
            stepData: stepDataMap,
            design: defaultDesignConfig,
            priceSource: "pipedrive",
            quoteSettings: defaultQuoteSettings,
          };
          saveProductConfig(defaultConfig);
          results.push({
            productId: product.id,
            name: update.name,
            imageUrl: update.imageUrl,
            updated: true,
          });
          console.log(`✅ Created config for ${product.name} → ${update.name} with image ${update.imageUrl}`);
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

    const updatedCount = results.filter(r => r.updated).length;
    const message = `Updated ${updatedCount} product(s).\n\n${results.map(r => 
      `${r.updated ? '✅' : '✓'} ${r.name} - ${r.imageUrl}`
    ).join('\n')}${errors.length > 0 ? `\n\nErrors:\n${errors.map(e => `❌ ${e.productId}: ${e.error}`).join('\n')}` : ''}`;
    
    alert(message);
    
    // Reload products to show updated names
    window.dispatchEvent(new Event("productsUpdated"));
  };

  const handleDelete = async (productId: string) => {
    if (confirm("Are you sure you want to delete this product? This will also delete all its configuration.")) {
      await deleteProduct(productId);
      const refreshedProducts = await getAllProducts();
      setProducts(refreshedProducts);
    }
  };

  const handleExportProducts = async () => {
    try {
      const allProducts = await getAllProducts();
      const allConfigs: Record<string, ProductConfig> = {};
      
      // Get all product configs (async)
      for (const product of allProducts) {
        const config = await getProductConfig(product.id);
        if (config) {
          allConfigs[product.id] = config;
        }
      }
      
      const exportData = {
        products: allProducts,
        configs: allConfigs,
        exportedAt: new Date().toISOString(),
      };
      
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `saunamo-products-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert(`✅ Exported ${allProducts.length} products successfully!`);
    } catch (error: any) {
      console.error("Export error:", error);
      alert(`❌ Failed to export: ${error.message}`);
    }
  };

  const handleImportProducts = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = event.target?.result as string;
          const importData = JSON.parse(json);
          
          if (!importData.products || !Array.isArray(importData.products)) {
            throw new Error("Invalid export file format");
          }
          
          if (!confirm(`This will import ${importData.products.length} products. Existing products with the same ID will be overwritten. Continue?`)) {
            return;
          }
          
          // Import products (async)
          for (const product of importData.products) {
            await saveProduct(product);
          }
          
          // Import configs if available (async)
          if (importData.configs) {
            for (const [productId, config] of Object.entries(importData.configs)) {
              await saveProductConfig(config as ProductConfig);
            }
          }
          
          // Refresh the list
          const refreshedProducts = await getAllProducts();
          setProducts(refreshedProducts);
          alert(`✅ Successfully imported ${importData.products.length} products!`);
        } catch (error: any) {
          console.error("Import error:", error);
          alert(`❌ Failed to import: ${error.message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-[#faf9f7] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-600 mt-2">Manage your product configurators</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={setupAllProducts}
              disabled={isSettingUp}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSettingUp ? "Setting up..." : "Setup All Products from Table"}
            </button>
            <Link
              href="/admin/products/new"
              className="px-6 py-3 bg-green-800 text-white rounded-lg hover:bg-green-900 font-medium"
            >
              + Create New Product
            </Link>
            <button
              onClick={handleExportProducts}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              📥 Export Products
            </button>
            <button
              onClick={handleImportProducts}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
            >
              📤 Import Products
            </button>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="max-w-2xl mx-auto">
              <p className="text-gray-600 mb-4">No products found.</p>
              <p className="text-sm text-gray-500 mb-6">
                Products are stored in browser localStorage. If you created products in another browser or tab,
                they won't appear here. You can either:
              </p>
              <div className="flex flex-col gap-3 items-center">
                <button
                  onClick={setupAllProducts}
                  disabled={isSettingUp}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSettingUp ? "Setting up..." : "Setup All Products from Table"}
                </button>
                <button
                  onClick={updateAllProductNamesAndImages}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                >
                  🖼️ Update Product Names & Images
                </button>
                <button
                  onClick={handleImportProducts}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  📤 Import Products from File
                </button>
                <Link
                  href="/admin/products/new"
                  className="px-6 py-3 bg-green-800 text-white rounded-lg hover:bg-green-900 font-medium"
                >
                  + Create New Product
                </Link>
              </div>
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
                <p className="text-sm font-medium text-yellow-800 mb-2">💡 Troubleshooting:</p>
                <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                  <li>Check browser console (F12) for localStorage errors</li>
                  <li>Make sure you're not in incognito/private mode</li>
                  <li>Check if localStorage quota is exceeded (look for quota errors in console)</li>
                  <li>If you exported products before, use "Import Products" to restore them</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-sm text-gray-500 mb-4">ID: {product.id}</p>
                <div className="flex gap-2">
                  <Link
                    href={`/products/${product.slug}`}
                    className="flex-1 px-4 py-2 bg-green-800 text-white rounded hover:bg-green-900 text-center text-sm font-medium"
                  >
                    View Configurator
                  </Link>
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-center text-sm font-medium"
                  >
                    Configure
                  </Link>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

