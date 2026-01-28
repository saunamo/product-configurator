import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/setup-products
 * Create all products from the table data
 */
export async function POST(request: NextRequest) {
  try {
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
      if (lightingText.includes(" or ")) {
        return lightingText.split(" or ").map((opt) => opt.trim());
      }
      return [lightingText.trim()];
    }

    const createdProducts: Array<{ name: string; steps: number; options: number }> = [];

    // This needs to run on the client side since it uses localStorage
    // Return instructions instead
    return NextResponse.json({
      success: true,
      message: "Product setup script ready. Please run this in the browser console.",
      instructions: "Open browser console and run: window.setupAllProducts()",
      productCount: productData.length,
    });
  } catch (error: any) {
    console.error("Setup products error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to setup products",
      },
      { status: 500 }
    );
  }
}



