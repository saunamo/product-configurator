"use client";

import { Option } from "@/types/configurator";
import { useAdminConfig } from "@/contexts/AdminConfigContext";
import { capitalize } from "@/utils/capitalize";
import { useState, useEffect } from "react";

// Extended descriptions for cold plunge and hot tub products
const EXTENDED_DESCRIPTIONS: Record<string, string> = {
  // Cold Plunge
  "cold-plunge-ice-bath-ergo": `<p>The Ergo Ice Bath is designed for effective cold-water immersion, offering a reliable solution for recovery and contrast therapy. With an external cooling system, it maintains stable water temperatures year-round, making it the ideal cold plunge alongside sauna sessions or on its own.</p><p>Finished in thermally modified pine with a watertight fiberglass interior, Ergo ice bath combines durability with comfort. An integrated seat, insulated cover, and easy access step complete a compact and efficient cold plunge suited for athletes and everyday wellness routines.</p>`,
  "cold-plunge-ice-bath-cube": `<p>The Cube Ice Bath is a minimalist cold plunge for contrast therapy and cold immersion, designed to integrate seamlessly into homes, spas, and training spaces. An external cooling system in a Thermowood box maintains stable water temperature year-round, while the insulated cover improves efficiency.</p><p>Finished in Thermowood with a durable fiberglass interior, it offers a reliable solution for recovery and daily wellness.</p>`,
  "cold-plunge-ice-bath-ofuro": `<p>The Ofuro Ice Bath is a two-person cold plunge designed for shared recovery and contrast therapy, allowing simultaneous use while maintaining a stable water temperature. With an 800-liter capacity and a high-performance external chiller, it supports year-round cold immersion.</p><p>The smooth fiberglass interior ensures comfort and easy maintenance, while its clean, modern design integrates seamlessly into gardens, terraces, gyms, and spa environments.</p>`,
  
  // Hot Tubs
  "hot-tubs-hot-tub-vellamo-l": `<p>The Vellamo L outdoor hot tub is a premium Finnish-made whirlpool designed for up to 6 people. Featuring a minimalist Nordic design, scratch-resistant white acrylic, and high-performance insulation, it delivers year-round comfort with low energy consumption.</p><p>Equipped with 28 Balboa hydrotherapy jets, ambient LED lighting, and a Balboa 2 kW heater, the Vellamo L ensures a refined hydrotherapy experience. The Balboa control system with app-based remote control allows easy management of temperature and functions, while the insulated EPS cover enhances efficiency and heat retention.</p>`,
  "hot-tubs-hot-tub-vellamo-m": `<p>The Vellamo M is a Finnish-made outdoor hot tub designed for up to 5 people, combining minimalist design with durable, high-quality materials. Built with scratch-resistant white acrylic, fiberglass reinforcement, and PIR thermal insulation, it delivers year-round comfort with low energy consumption.</p><p>Fully equipped as standard, it features 29 Balboa hydromassage jets, a 2 HP dual-speed pump, ambient LED lighting, a 2 kW Balboa heater, and an integrated UV-Sanitation system for continuous water hygiene. An insulated EPS cover ensures efficient heat retention and everyday ease of use.</p>`,
  "hot-tubs-hot-tub-vellamo-s": `<p>The Vellamo S outdoor hot tub is a compact, high-performance whirlpool manufactured in Finland, designed to meet the highest European quality standards. Created for up to 3 people, it combines a minimalist Nordic aesthetic with advanced engineering, making it ideal for balconies, patios, terraces, and gardens.</p><p>The interior is made from scratch-resistant white acrylic, reinforced with fiberglass and supported by a thermoformed ABS base, ensuring durability and long-term structural stability. Thanks to its 30 mm PIR thermal insulation on the sides and base, the Vellamo S maintains stable water temperatures throughout the year while keeping energy consumption low.</p><p>This hot tub is fully equipped as standard, featuring 25 Balboa Venice 2″ directional hydrotherapy jets, a 2 HP dual-speed massage pump, ambient LED lighting along the waterline, and an integrated UV-Sanitation system that keeps the water continuously clean and hygienic. A Balboa 2 kW heater and Balboa BP200 control system with TP500 panel ensure precise temperature regulation, while the insulated EPS cover further enhances heat retention and efficiency.</p>`,
  "hot-tubs-hot-tub-cube-200": `<p>The Cube 200 outdoor hot tub is a square-format hot tub designed to deliver a complete outdoor hydrotherapy experience with a clean, contemporary aesthetic. Its cubic design integrates seamlessly into modern gardens, terraces, and leisure spaces, combining comfort, efficiency, and sustainability in a refined, architectural form.</p><p>The hot tub includes an integrated hydrotherapy bubble system, ambient LED lighting, and a complete water filtration system, ensuring comfort, hygiene, and ease of use from the very first session.</p><p>The Cube 200 is equipped as standard with a wood-fired stainless steel heater (AISI 304-CE certified) and a 2-meter chimney with protective guard, providing fast, safe, and reliable heating. For added flexibility, the hot tub is also available with an optional electric heater, allowing it to adapt to different installation requirements. Built with a robust thermopine structure and a durable fiberglass tub, it offers long-lasting performance and a smooth, comfortable bathing surface.</p>`,
  "hot-tubs-hot-tub-therma-200": `<p>The Saunamo Therma 200 outdoor hot tub, with a 200 cm diameter and capacity for up to 4 people, is crafted from durable Thermowood to deliver an authentic hot bathing experience in outdoor environments. Designed for relaxation and longevity, it includes an integrated hydrotherapy bubble system, ambient LED lighting, and a complete water treatment solution with sand filtration and UV disinfection, ensuring comfort, hygiene, and ease of use from the very first soak.</p><p>The Therma 200 is equipped as standard with an efficient wood-fired heater, providing natural and even heating in an eco-conscious way. For added flexibility, the hot tub is also available with an optional 3 kW electric heater, allowing it to adapt to different installation requirements and usage preferences.</p>`,
  "hot-tubs-hot-tub-therma-220": `<p>The Saunamo Therma 220 outdoor hot tub is crafted from durable Thermowood to deliver a spacious and refined hot bathing experience in outdoor environments. Designed for relaxation and longevity, it includes an integrated hydrotherapy bubble system, ambient LED lighting, and a complete water treatment solution with sand filtration and UV disinfection, ensuring comfort, hygiene, and ease of use from the very first soak.</p><p>The Therma 220 is equipped as standard with an efficient wood-fired heater, providing natural, even heating in an eco-conscious way. For added flexibility, the hot tub is also available with an optional 3 kW electric heater, making it suitable for a wider range of installation requirements and usage preferences. Integrated rectangular steps ensure safe and comfortable access, while the larger internal diameter allows for up to 6 people to bathe at the same time.</p>`,
  
  // Wood Treatment
  "electrical-assembly-wood-treament-exterior": `<p>This is a protective treatment for the exterior wood, designed to extend its lifespan and maintain its appearance over time. With this treatment, we apply Tikkurila primer oil and Valtti Color Plus wood varnish to protect the wood against moisture, UV exposure, insects, mold, rot, and general weathering.</p><p>For long-term durability and resistance to the elements, annual reapplication of Valtti Color Plus is recommended. This treatment is essential for preserving the wood's structure and finish in outdoor conditions.</p>`,
  "electrical-assembly-interior": `<p>This is a protective treatment for the interior wooden surfaces of the sauna. With this treatment, we apply Tikkurila Sauna Wax and Sauna Floor Oil to improve resistance to dirt and mold.</p><p>While optional, this treatment is highly recommended to preserve the natural beauty of the wood and maintain a clean, protected finish inside the sauna.</p>`,
};

interface OptionCardProps {
  option: Option;
  isSelected: boolean;
  selectionType: "single" | "multi";
  onToggle: () => void;
  stepId?: string; // Step ID for product-specific included flags (cube_/barrel_)
  productType?: "cube" | "barrel"; // Product type for rear-glass-wall options
  calculatedPrice?: number; // Override price for dynamic calculations (e.g., heater stones)
  calculatedQuantity?: number; // Quantity for dynamic calculations (e.g., number of packages for heater stones)
  lightingMultiplier?: number | null; // Multiplier for lighting options (e.g., 2 for "2x 2.5m LED")
  baseLightingOptionId?: string; // Base option ID for lighting price calculation
}

export default function OptionCard({
  option,
  isSelected,
  selectionType,
  onToggle,
  stepId,
  productType,
  calculatedPrice,
  calculatedQuantity,
  lightingMultiplier,
  baseLightingOptionId,
}: OptionCardProps) {
  const { config } = useAdminConfig();
  const design = config?.design;
  const inputType = selectionType === "single" ? "radio" : "checkbox";
  
  // Check if option is included - check product-specific first (cube_/barrel_), then general
  let isIncluded = false;
  let pipedriveProductId: number | undefined;
  
  if (stepId === "rear-glass-wall" && productType) {
    // For rear-glass-wall, check product-specific included flag
    // Try multiple key formats to handle different option ID formats
    // Option IDs might be: "glass-half-moon", "rear-glass-wall-glass-half-moon", "rear-glass-wall-half-moon-glass-backwall", etc.
    const baseOptionId = option.id.replace(/^rear-glass-wall-/, ''); // Remove step prefix if present
    const titleLower = option.title.toLowerCase();
    const idLower = option.id.toLowerCase();
    
    // Determine what type of option this is
    const isHalfMoon = idLower.includes('half-moon') || titleLower.includes('half moon') || titleLower.includes('half-moon');
    const isWoodenBackwall = idLower.includes('wooden') || titleLower.includes('wooden');
    const isFullGlass = idLower.includes('full-glass') || idLower.includes('full glass') || titleLower.includes('full glass');
    
    // Also try to normalize common variations
    const normalizedId = baseOptionId
      .replace(/half-moon-glass-backwall/gi, 'glass-half-moon')
      .replace(/half-moon/gi, 'glass-half-moon')
      .replace(/glass-half-moon-glass-backwall/gi, 'glass-half-moon');
    
    // Try multiple key formats - but ONLY use specific fallbacks for matching option types
    const key1 = `${productType}_${normalizedId}`; // Normalized ID
    const key2 = `${productType}_${baseOptionId}`; // ID without step prefix
    const key3 = `${productType}_${option.id}`; // Full ID with step prefix
    // Only use specific fallback keys for matching option types to prevent cross-contamination
    const key4 = isHalfMoon ? `${productType}_glass-half-moon` : null; // Only for half-moon options
    const key5 = isWoodenBackwall ? `${productType}_wooden-backwall` : null; // Only for wooden options
    const key6 = isFullGlass ? `${productType}_full-glass-backwall` : null; // Only for full glass options
    
    // Try all key formats - but only defined keys
    let includedValue = config?.globalSettings?.optionIncluded?.[key1] ?? 
                       config?.globalSettings?.optionIncluded?.[key2] ??
                       config?.globalSettings?.optionIncluded?.[key3];
    if (includedValue === undefined && key4) {
      includedValue = config?.globalSettings?.optionIncluded?.[key4];
    }
    if (includedValue === undefined && key5) {
      includedValue = config?.globalSettings?.optionIncluded?.[key5];
    }
    if (includedValue === undefined && key6) {
      includedValue = config?.globalSettings?.optionIncluded?.[key6];
    }
    // Explicitly check for true - if undefined or false, treat as not included
    isIncluded = includedValue === true;
    
    pipedriveProductId = config?.globalSettings?.optionPipedriveProducts?.[key1] ??
                        config?.globalSettings?.optionPipedriveProducts?.[key2] ??
                        config?.globalSettings?.optionPipedriveProducts?.[key3];
    if (pipedriveProductId === undefined && key4) {
      pipedriveProductId = config?.globalSettings?.optionPipedriveProducts?.[key4];
    }
    if (pipedriveProductId === undefined && key5) {
      pipedriveProductId = config?.globalSettings?.optionPipedriveProducts?.[key5];
    }
    if (pipedriveProductId === undefined && key6) {
      pipedriveProductId = config?.globalSettings?.optionPipedriveProducts?.[key6];
    }
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[OptionCard] Rear Glass Wall - ${productType} - ${option.id}:`, {
        optionId: option.id,
        baseOptionId,
        normalizedId,
        optionType: { isHalfMoon, isWoodenBackwall, isFullGlass },
        keysTried: [key1, key2, key3, key4, key5, key6].filter(k => k !== null),
        includedValue,
        isIncluded,
        pipedriveProductId,
        hasConfig: !!config,
        // Show all keys in optionIncluded to help debug
        allOptionIncludedKeys: config?.globalSettings?.optionIncluded ? Object.keys(config.globalSettings.optionIncluded).filter(k => k.includes(productType)) : [],
        allPipedriveKeys: config?.globalSettings?.optionPipedriveProducts ? Object.keys(config.globalSettings.optionPipedriveProducts).filter(k => k.includes(productType)) : [],
      });
    }
  } else {
    // For other steps, use general option ID
    const includedValue = config?.globalSettings?.optionIncluded?.[option.id];
    // Explicitly check for true - if undefined or false, treat as not included
    isIncluded = includedValue === true;
    pipedriveProductId = config?.globalSettings?.optionPipedriveProducts?.[option.id];
  }
  
  // Debug logging for calculated price (after isIncluded is declared)
  if (calculatedPrice !== undefined && process.env.NODE_ENV === 'development') {
    console.log(`[OptionCard] calculatedPrice for "${option.title}":`, {
      optionId: option.id,
      calculatedPrice,
      optionPrice: option.price,
      isIncluded,
    });
  }
  
  // Fetch Pipedrive price if not included and has Pipedrive product ID
  const [pipedrivePrice, setPipedrivePrice] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [lightingCalculatedPrice, setLightingCalculatedPrice] = useState<number | null>(null);
  
  // Expandable description state
  const [isExpanded, setIsExpanded] = useState(false);
  const extendedDescription = EXTENDED_DESCRIPTIONS[option.id] || option.extendedDescription;
  
  // Calculate lighting price based on multiplier
  useEffect(() => {
    if (lightingMultiplier && baseLightingOptionId && !isIncluded) {
      const basePipedriveProductId = config?.globalSettings?.optionPipedriveProducts?.[baseLightingOptionId];
      
      if (basePipedriveProductId) {
        setIsLoadingPrice(true);
        fetch(`/api/pipedrive/products/${basePipedriveProductId}`)
          .then(res => {
            if (!res.ok) {
              throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
          })
          .then(data => {
            if (data.success && data.product?.prices?.[0]?.price) {
              // Get price in GBP, multiply by 1.2 for VAT included, then by multiplier
              const priceGBP = data.product.prices[0].currency === "GBP" 
                ? data.product.prices[0].price 
                : data.product.prices.find((p: any) => p.currency === "GBP")?.price || data.product.prices[0].price;
              const vatIncludedPrice = priceGBP * 1.2;
              const multipliedPrice = vatIncludedPrice * lightingMultiplier;
              setLightingCalculatedPrice(multipliedPrice);
              if (process.env.NODE_ENV === 'development') {
                console.log(`[OptionCard] Lighting calculated price: base £${vatIncludedPrice.toFixed(2)} × ${lightingMultiplier} = £${multipliedPrice.toFixed(2)}`);
              }
            }
            setIsLoadingPrice(false);
          })
          .catch(err => {
            console.error(`[OptionCard] Failed to fetch base lighting price:`, err);
            setIsLoadingPrice(false);
          });
      } else {
        setLightingCalculatedPrice(null);
      }
    } else {
      setLightingCalculatedPrice(null);
    }
  }, [lightingMultiplier, baseLightingOptionId, isIncluded, config]);
  
  useEffect(() => {
    // Reset price when included status or product ID changes
    setPipedrivePrice(null);
    setIsLoadingPrice(false);
    
    if (!isIncluded && pipedriveProductId && !lightingMultiplier) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[OptionCard] Fetching price for product ${pipedriveProductId}, option: ${option.id}, isIncluded: ${isIncluded}`);
      }
      setIsLoadingPrice(true);
      fetch(`/api/pipedrive/products/${pipedriveProductId}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[OptionCard] Price fetch response for ${pipedriveProductId}:`, data);
          }
          if (data.success && data.product?.prices?.[0]?.price) {
            // Get price in GBP, multiply by 1.2 for VAT included
            const priceGBP = data.product.prices[0].currency === "GBP" 
              ? data.product.prices[0].price 
              : data.product.prices.find((p: any) => p.currency === "GBP")?.price || data.product.prices[0].price;
            const vatIncludedPrice = priceGBP * 1.2;
            if (process.env.NODE_ENV === 'development') {
              console.log(`[OptionCard] Calculated VAT-included price: £${vatIncludedPrice.toFixed(2)}`);
            }
            setPipedrivePrice(vatIncludedPrice);
          } else {
            console.warn(`[OptionCard] No price found for Pipedrive product ${pipedriveProductId}. Response:`, data);
          }
          setIsLoadingPrice(false);
        })
        .catch(err => {
          console.error(`[OptionCard] Failed to fetch Pipedrive price for product ${pipedriveProductId}:`, err);
          setIsLoadingPrice(false);
        });
    } else if (!isIncluded && !pipedriveProductId) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[OptionCard] No Pipedrive product ID for option ${option.id}, isIncluded: ${isIncluded}`);
      }
    }
  }, [isIncluded, pipedriveProductId, option.id]);

  // Check if option has a valid image URL
  const hasValidImage = option.imageUrl && 
    option.imageUrl.trim() && 
    !option.imageUrl.includes("via.placeholder.com/80") &&
    option.imageUrl !== "https://via.placeholder.com/80";

  const handleLabelClick = (e: React.MouseEvent<HTMLLabelElement>) => {
    // If clicking directly on the input, let it handle via onChange
    if ((e.target as HTMLElement).tagName === 'INPUT') {
      return;
    }
    
    // For radio buttons, clicking an already-selected option doesn't trigger onChange
    // So we need to manually handle unchecking
    if (selectionType === "single" && isSelected) {
      // Prevent the default label behavior (which would do nothing for already-selected radio)
      e.preventDefault();
      // Manually trigger toggle to uncheck
      onToggle();
    }
    // For unselected radio buttons or checkboxes, let the label's natural behavior work
    // The browser will check the input and trigger onChange, which calls onToggle()
  };

  return (
    <label
      className={`flex flex-col w-full text-left cursor-pointer p-4 rounded-lg border-2 transition-all hover:border-[#303337]`}
      style={{
        backgroundColor: design?.cardBackgroundColor || "#ffffff",
        borderColor: isSelected 
          ? (design?.accentColor || "#303337")
          : (design?.borderColor || "#E2DEDA"),
        borderRadius: design?.borderRadius || "0.5rem",
        boxShadow: isSelected ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)" : "none",
      }}
      onClick={handleLabelClick}
    >
      {/* Main row: Image + Content */}
      <div className={`flex items-start gap-4 ${!hasValidImage ? 'items-center' : ''}`}>
        {hasValidImage && (
          <div className="flex-shrink-0">
            <div className="relative w-24 h-24 bg-gray-100 rounded overflow-hidden border border-gray-200">
              <img
                src={option.imageUrl ? `${option.imageUrl}${option.imageUrl.includes('?') ? '&' : '?'}t=${Date.now()}` : undefined}
                alt={option.title}
                className="w-full h-full object-cover"
                key={option.imageUrl} // Force re-render when image URL changes
                onError={(e) => {
                  console.error(`❌ Image failed to load for option ${option.id}:`, option.imageUrl);
                  // Hide image on error instead of showing placeholder
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-1 text-base">
            {capitalize(option.title)}
          </h3>
          {option.description && (
            <p className="text-sm text-gray-600 mb-2">
              {option.description}
            </p>
          )}
          
          {/* Read more button - stays in content column */}
          {extendedDescription && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="text-sm font-medium hover:underline transition-colors inline-flex items-center gap-1 mb-2"
              style={{ color: design?.accentColor || "#303337" }}
            >
              {isExpanded ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Show less
                </>
              ) : (
                <>
                  Read more
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>
          )}
        {isIncluded && calculatedPrice === undefined ? (
          <p className="text-sm font-medium text-gray-500">Included</p>
        ) : calculatedPrice !== undefined ? (
          <div>
            {calculatedQuantity !== undefined && calculatedQuantity > 0 && (
              <p className="text-xs text-gray-600 mb-1">
                {calculatedQuantity} {calculatedQuantity === 1 ? 'package' : 'packages'} (20kg each)
              </p>
            )}
            <p 
              className="text-sm font-medium"
              style={{ color: design?.accentColor || "#303337" }}
            >
              £{calculatedPrice.toFixed(2)}
            </p>
          </div>
        ) : lightingCalculatedPrice !== null ? (
          <p 
            className="text-sm font-medium"
            style={{ color: design?.accentColor || "#303337" }}
          >
            {isLoadingPrice ? "Loading..." : `£${lightingCalculatedPrice.toFixed(2)}`}
          </p>
        ) : pipedrivePrice !== null ? (
          <p 
            className="text-sm font-medium"
            style={{ color: design?.accentColor || "#303337" }}
          >
            {isLoadingPrice ? "Loading..." : `£${pipedrivePrice.toFixed(2)}`}
          </p>
        ) : pipedriveProductId ? (
          <p 
            className="text-sm font-medium"
            style={{ color: design?.accentColor || "#303337" }}
          >
            {isLoadingPrice ? "Loading..." : "Price unavailable"}
          </p>
        ) : option.price > 0 ? (
          <p 
            className="text-sm font-medium"
            style={{ color: design?.accentColor || "#303337" }}
          >
            +${option.price.toLocaleString()}
          </p>
        ) : (
          <p 
            className="text-sm font-medium"
            style={{ color: design?.accentColor || "#303337" }}
          >
            Price unavailable
          </p>
        )}
        </div>
        <div className="flex-shrink-0 pt-1">
          <input
            type={inputType}
            name={selectionType === "single" ? `option-${stepId || "step"}` : undefined}
            checked={isSelected}
            onChange={(e) => {
              // Call onToggle when input changes
              // This will be triggered when label is clicked (natural label behavior)
              onToggle();
            }}
            className="w-5 h-5 text-[#303337] border-[#E2DEDA] focus:ring-[#303337] focus:ring-2 cursor-pointer appearance-none rounded border-2"
            style={{
              backgroundColor: isSelected ? '#303337' : 'white',
              borderColor: isSelected ? '#303337' : '#E2DEDA',
              backgroundImage: isSelected 
                ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='white' d='M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z'/%3E%3C/svg%3E")`
                : 'none',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
          />
        </div>
      </div>
      
      {/* Expanded Description - Full width below the main row */}
      {extendedDescription && isExpanded && (
        <div 
          className="text-sm text-gray-700 mt-4 space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200"
          dangerouslySetInnerHTML={{ __html: extendedDescription }}
          style={{ 
            lineHeight: '1.7',
          }}
        />
      )}
    </label>
  );
}

