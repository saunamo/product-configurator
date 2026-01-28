/**
 * Script to create products, steps, and options from the Google Sheets table
 * Run this script to populate all products with their configurations
 */

import { Product, ProductConfig } from "@/types/product";
import { Step, StepData, Option } from "@/types/configurator";
import { saveProduct, saveProductConfig, getAllProducts } from "@/utils/productStorage";
import { defaultDesignConfig } from "@/constants/defaultDesign";
import { defaultQuoteSettings } from "@/constants/defaultQuoteSettings";

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

// Step name mapping to route-friendly IDs
const stepNameToId: Record<string, string> = {
  "Wall modifications": "wall-modifications",
  "Electric heaters": "electric-heaters",
  "Stones": "stones",
  "Woodburning heaters": "woodburning-heaters",
  "Lighting": "lighting",
  "Accessories": "accessories",
  "Installation": "installation",
  "Icebaths": "icebaths",
  "Hot tubs": "hot-tubs",
  "Transportation": "transportation",
};

// Step name mapping to display names
const stepDisplayNames: Record<string, string> = {
  "Wall modifications": "Wall Modifications",
  "Electric heaters": "Electric Heaters",
  "Stones": "Stones",
  "Woodburning heaters": "Woodburning Heaters",
  "Lighting": "Lighting",
  "Accessories": "Accessories",
  "Installation": "Installation",
  "Icebaths": "Ice Baths",
  "Hot tubs": "Hot Tubs",
  "Transportation": "Transportation",
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
  // Lighting uses "OR" - split by "or" and create separate options
  if (lightingText.includes(" or ")) {
    return lightingText.split(" or ").map((opt) => opt.trim());
  }
  return [lightingText.trim()];
}

function createProductFromData(data: typeof productData[0]): { product: Product; config: ProductConfig } {
  const productId = createSlug(data.model);
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

  Object.entries(data.steps).forEach(([stepName, options], index) => {
    // Skip steps with no options
    if (!options || options.length === 0) {
      return;
    }

    const stepId = stepNameToId[stepName];
    if (!stepId) {
      console.warn(`Unknown step name: ${stepName}`);
      return;
    }

    // Create step
    const step: Step = {
      id: stepId,
      name: stepDisplayNames[stepName] || stepName,
      route: stepId,
    };
    steps.push(step);

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
    const optionObjects: Option[] = parsedOptions.map((optionTitle, optIndex) => ({
      id: createOptionId(stepId, optionTitle),
      title: optionTitle,
      description: "",
      imageUrl: "",
      price: 0, // Prices will need to be set manually or from Pipedrive
    }));

    // Determine selection type
    // Lighting is single-select (OR), others are typically multi-select
    const selectionType = stepName === "Lighting" ? "single" : "multi";

    // Create stepData
    stepData[stepId] = {
      stepId,
      title: stepDisplayNames[stepName] || stepName,
      description: "",
      options: optionObjects,
      selectionType,
      required: false,
    };
  });

  const config: ProductConfig = {
    productId,
    productName: data.model,
    steps,
    stepData,
    design: defaultDesignConfig,
    priceSource: "pipedrive",
    quoteSettings: defaultQuoteSettings,
  };

  return { product, config };
}

// Export function to run in browser console or as a script
export function setupAllProducts() {
  if (typeof window === "undefined") {
    console.error("This script must be run in the browser");
    return;
  }

  console.log("Setting up products from table...");

  productData.forEach((data) => {
    const { product, config } = createProductFromData(data);
    
    // Save product
    saveProduct(product);
    
    // Save product config
    saveProductConfig(config);
    
    console.log(`✅ Created product: ${product.name} with ${config.steps.length} steps`);
  });

  console.log(`\n✅ All products created! Total: ${productData.length}`);
  console.log("You can now view them at /admin/products");
}

// Make it available globally for browser console
if (typeof window !== "undefined") {
  (window as any).setupAllProducts = setupAllProducts;
}



