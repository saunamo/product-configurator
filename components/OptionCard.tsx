"use client";

import { Option } from "@/types/configurator";
import { useAdminConfig } from "@/contexts/AdminConfigContext";
import { capitalize } from "@/utils/capitalize";
import { useState, useEffect } from "react";

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
    // Also try to normalize common variations
    const normalizedId = baseOptionId
      .replace(/half-moon-glass-backwall/gi, 'glass-half-moon')
      .replace(/half-moon/gi, 'glass-half-moon')
      .replace(/glass-half-moon-glass-backwall/gi, 'glass-half-moon');
    
    // Try multiple key formats
    const key1 = `${productType}_${normalizedId}`; // Normalized ID
    const key2 = `${productType}_${baseOptionId}`; // ID without step prefix
    const key3 = `${productType}_${option.id}`; // Full ID with step prefix
    const key4 = `${productType}_glass-half-moon`; // Direct match for half-moon
    const key5 = `${productType}_wooden-backwall`; // Direct match for wooden
    
    // Try all key formats
    const includedValue = config?.globalSettings?.optionIncluded?.[key1] ?? 
                         config?.globalSettings?.optionIncluded?.[key2] ??
                         config?.globalSettings?.optionIncluded?.[key3] ??
                         config?.globalSettings?.optionIncluded?.[key4] ??
                         config?.globalSettings?.optionIncluded?.[key5];
    // Explicitly check for true - if undefined or false, treat as not included
    isIncluded = includedValue === true;
    pipedriveProductId = config?.globalSettings?.optionPipedriveProducts?.[key1] ??
                        config?.globalSettings?.optionPipedriveProducts?.[key2] ??
                        config?.globalSettings?.optionPipedriveProducts?.[key3] ??
                        config?.globalSettings?.optionPipedriveProducts?.[key4] ??
                        config?.globalSettings?.optionPipedriveProducts?.[key5];
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      // Also try alternative keys in case option ID format is different
      const altKey1 = `${productType}_${option.id.replace('rear-glass-wall-', '')}`;
      const altKey2 = option.id.replace('rear-glass-wall-', '');
      const altIncluded1 = config?.globalSettings?.optionIncluded?.[altKey1];
      const altPipedrive1 = config?.globalSettings?.optionPipedriveProducts?.[altKey1];
      
      console.log(`[OptionCard] Rear Glass Wall - ${productType} - ${option.id}:`, {
        optionId: option.id,
        baseOptionId,
        normalizedId,
        keysTried: [key1, key2, key3, key4, key5],
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
      className={`flex items-start gap-4 w-full text-left cursor-pointer p-4 rounded-lg border-2 transition-all hover:border-[#303337] ${!hasValidImage ? 'items-center' : ''}`}
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
      {hasValidImage && (
        <div className="flex-shrink-0">
          <div className="relative w-24 h-24 bg-gray-100 rounded overflow-hidden border border-gray-200">
            <img
              src={option.imageUrl}
              alt={option.title}
              className="w-full h-full object-cover"
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
    </label>
  );
}

