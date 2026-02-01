/**
 * Utility to apply global settings to product configs
 */

import { ProductConfig } from "@/types/product";
import { GlobalStepOptionConfig } from "@/types/admin";
import { loadConfigFromStorage } from "./configStorage";
import { STEPS } from "@/constants/steps";

/**
 * Apply global settings to a product config
 * Merges global images and Pipedrive product links into the product config
 */
export async function applyGlobalSettingsToProductConfig(
  productConfig: ProductConfig
): Promise<ProductConfig> {
  // Only run on client side
  if (typeof window === "undefined") {
    return productConfig;
  }
  
  const adminConfig = await loadConfigFromStorage();
  const globalSettings = adminConfig?.globalSettings;
  
  console.log("🌍 ===== APPLYING GLOBAL SETTINGS =====");
  console.log("🌍 Product ID:", productConfig.productId);
  console.log("🌍 Has Admin Config:", !!adminConfig);
  console.log("🌍 Has Global Settings:", !!globalSettings);
  console.log("🌍 Has Step Names:", !!globalSettings?.stepNames);
  console.log("🌍 Step Names Count:", globalSettings?.stepNames ? Object.keys(globalSettings.stepNames).length : 0);
  console.log("🌍 Global Step Names:", globalSettings?.stepNames);
  console.log("🌍 Product Steps Count:", productConfig.steps?.length || 0);
  console.log("🌍 Product Step IDs:", productConfig.steps?.map(s => s.id) || []);
  console.log("🌍 Product Step Names (BEFORE):", productConfig.steps?.map(s => ({ id: s.id, name: s.name })) || []);
  
  if (!globalSettings) {
    console.log("🌍 ⚠ No global settings found, returning product config as-is");
    console.log("🌍 Admin config:", adminConfig);
    return productConfig;
  }
  
  if (!globalSettings.stepNames || Object.keys(globalSettings.stepNames).length === 0) {
    console.log("🌍 ⚠ Global settings exist but no step names found");
    console.log("🌍 Global settings keys:", Object.keys(globalSettings));
    // Still apply other global settings (images, etc.) even if no step names
  }

  // Create a new config with global settings applied
  const updatedStepData = { ...productConfig.stepData };
  let updatedSteps = [...productConfig.steps];
  
  // Ensure proper step order: delivery is second-to-last, quote is last
  // Step 1: Remove quote and hot-tubs temporarily to reorder everything
  const quoteIndex = updatedSteps.findIndex(s => s.id === "quote");
  const hotTubsIndex = updatedSteps.findIndex(s => s.id === "hot-tubs");
  const deliveryIndex = updatedSteps.findIndex(s => s.id === "delivery");
  
  const quoteStep = quoteIndex >= 0 ? updatedSteps[quoteIndex] : null;
  const hotTubsStep = hotTubsIndex >= 0 ? updatedSteps[hotTubsIndex] : null;
  
  // Remove quote and hot-tubs from their current positions
  if (quoteIndex >= 0) {
    updatedSteps.splice(quoteIndex, 1);
  }
  if (hotTubsIndex >= 0) {
    // Adjust index if quote was removed before hot-tubs
    const adjustedHotTubsIndex = quoteIndex >= 0 && quoteIndex < hotTubsIndex 
      ? hotTubsIndex - 1 
      : hotTubsIndex;
    updatedSteps.splice(adjustedHotTubsIndex, 1);
  }
  
  // Step 2: Find delivery index again (after removals)
  const newDeliveryIndex = updatedSteps.findIndex(s => s.id === "delivery");
  
  // Step 3: Insert hot-tubs before delivery (if it exists)
  if (hotTubsStep && newDeliveryIndex >= 0) {
    updatedSteps.splice(newDeliveryIndex, 0, hotTubsStep);
    console.log("✅ Placed hot-tubs step before delivery");
  } else if (hotTubsStep) {
    // If no delivery, add hot-tubs at the end (before we add delivery and quote)
    updatedSteps.push(hotTubsStep);
    console.log("✅ Added hot-tubs step (delivery not found yet)");
  }
  
  // Step 4: Ensure delivery exists and add quote after it
  const finalDeliveryIndex = updatedSteps.findIndex(s => s.id === "delivery");
  
  if (finalDeliveryIndex >= 0) {
    // Delivery exists - add quote right after it
    if (quoteStep) {
      updatedSteps.splice(finalDeliveryIndex + 1, 0, quoteStep);
      console.log("✅ Placed Quote step right after delivery (delivery is second-to-last, quote is last)");
    } else {
      // Quote doesn't exist - create it
      const newQuoteStep = {
        id: "quote",
        name: "Quote",
        route: `/products/${productConfig.productId}/configurator/quote`,
      };
      updatedSteps.splice(finalDeliveryIndex + 1, 0, newQuoteStep);
      updatedStepData["quote"] = {
        stepId: "quote",
        title: "Quote",
        description: "Review your selections and generate a quote",
        selectionType: "single" as const,
        required: false,
        options: [],
      };
      console.log("✅ Created and placed Quote step right after delivery (delivery is second-to-last, quote is last)");
    }
  } else {
    // Delivery doesn't exist - this shouldn't happen, but add quote at the end
    if (quoteStep) {
      updatedSteps.push(quoteStep);
      console.log("✅ Added Quote step at the end (delivery step not found)");
    } else {
      const newQuoteStep = {
        id: "quote",
        name: "Quote",
        route: `/products/${productConfig.productId}/configurator/quote`,
      };
      updatedSteps.push(newQuoteStep);
      updatedStepData["quote"] = {
        stepId: "quote",
        title: "Quote",
        description: "Review your selections and generate a quote",
        selectionType: "single" as const,
        required: false,
        options: [],
      };
      console.log("✅ Created and added Quote step at the end (delivery step not found)");
    }
  }
  
  // Ensure quote stepData exists
  if (!updatedStepData["quote"]) {
    updatedStepData["quote"] = {
      stepId: "quote",
      title: "Quote",
      description: "Review your selections and generate a quote",
      selectionType: "single" as const,
      required: false,
      options: [],
    };
  }
  
  // Remove "stones" step - it's now integrated into the heater step
  updatedSteps = updatedSteps.filter(step => step.id !== "stones");
  if (updatedStepData["stones"]) {
    delete updatedStepData["stones"];
    console.log("🚫 Removed 'stones' step (now integrated into heater step)");
  }
  
  // Filter out rear-glass-wall step for Hiki and Aisti models
  const productId = productConfig.productId || "";
  const productName = (productConfig as any).productName || "";
  const isHikiOrAisti = productId.toLowerCase().includes("hiki") || 
                        productId.toLowerCase().includes("aisti") ||
                        productName.toLowerCase().includes("hiki") ||
                        productName.toLowerCase().includes("aisti");
  
  if (isHikiOrAisti) {
    updatedSteps = updatedSteps.filter(step => step.id !== "rear-glass-wall");
    if (updatedStepData["rear-glass-wall"]) {
      delete updatedStepData["rear-glass-wall"];
    }
    console.log("🚫 Filtered out rear-glass-wall step for Hiki/Aisti model");
  }
  
  // Update half-moon option images based on product type
  if (updatedStepData["rear-glass-wall"]) {
    const rearGlassStep = updatedStepData["rear-glass-wall"];
    const idLower = productId.toLowerCase();
    const nameLower = productName.toLowerCase();
    const isCube = idLower.includes("cube") || nameLower.includes("cube");
    const isBarrel = idLower.includes("barrel") || nameLower.includes("barrel");
    
    console.log(`🖼️ applyGlobalSettings: Checking product type:`, {
      productId,
      productName,
      isCube,
      isBarrel,
      hasRearGlassStep: !!rearGlassStep,
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
        console.log(`🖼️ applyGlobalSettings: Filtered options for cube - removed full glass backwall. Remaining: ${filteredOptions.length} options`);
      } else if (isBarrel) {
        // Barrel models: Show all rear glass wall options (no filtering)
        // All options are available for barrel models
        filteredOptions = rearGlassStep.options;
        console.log(`🖼️ applyGlobalSettings: Barrel model - showing all ${filteredOptions.length} rear glass wall options`);
      }
      
      const updatedOptions = filteredOptions.map((option: any) => {
        const optionTitleLower = (option.title || "").toLowerCase();
        const optionIdLower = (option.id || "").toLowerCase();
        
        // Apply custom title from global settings if available
        let customTitle = option.title;
        if (globalSettings.optionTitles) {
          // First check for product-specific title (cube_ or barrel_)
          const productSpecificKey = isCube ? `cube_${option.id}` : isBarrel ? `barrel_${option.id}` : null;
          if (productSpecificKey && globalSettings.optionTitles[productSpecificKey]) {
            customTitle = globalSettings.optionTitles[productSpecificKey];
            console.log(`📝 applyGlobalSettings: ✅ Using product-specific custom title for ${option.id}: "${customTitle}"`);
          } else if (globalSettings.optionTitles[option.id]) {
            // Fall back to general option title (for non-cube/barrel products or general settings)
            customTitle = globalSettings.optionTitles[option.id];
            console.log(`📝 applyGlobalSettings: ✅ Using general custom title for ${option.id}: "${customTitle}"`);
          }
        }
        
        // Handle half-moon option
        const isHalfMoon = option.id === "glass-half-moon" || 
                          optionIdLower.includes("half-moon") ||
                          optionIdLower.includes("halfmoon") ||
                          optionTitleLower.includes("half moon") ||
                          optionTitleLower.includes("half-moon");
        
        if (isHalfMoon) {
          if (isCube) {
            // Check admin config for cube half-moon image first
            const adminCubeHalfMoonImage = globalSettings.optionImages?.["cube_glass-half-moon"];
            const cubeHalfMoonImage = adminCubeHalfMoonImage || "/cube-back-moon.jpg";
            console.log(`🖼️ applyGlobalSettings: ✅ Setting cube half-moon image: ${cubeHalfMoonImage} (admin: ${adminCubeHalfMoonImage || 'none'})`);
            return { ...option, title: customTitle, imageUrl: cubeHalfMoonImage };
          } else if (isBarrel) {
            // Check admin config for barrel half-moon image first
            const adminBarrelHalfMoonImage = globalSettings.optionImages?.["barrel_glass-half-moon"];
            const barrelHalfMoonImage = adminBarrelHalfMoonImage || "/barrel-half-moon.png";
            console.log(`🖼️ applyGlobalSettings: ✅ Setting barrel half-moon image: ${barrelHalfMoonImage} (admin: ${adminBarrelHalfMoonImage || 'none'})`);
            return { ...option, title: customTitle, imageUrl: barrelHalfMoonImage };
          }
        }
        
        // Handle wooden backwall option by ID or title
        const isWoodenBackwall = option.id === "wooden-backwall" ||
                                 (optionTitleLower.includes("wooden") && 
                                  (optionTitleLower.includes("backwall") || optionTitleLower.includes("back wall")));
        
        if (isWoodenBackwall) {
          if (isCube) {
            // Check admin config for cube wooden backwall image first
            const adminCubeWoodenImage = globalSettings.optionImages?.["cube_wooden-backwall"];
            const cubeWoodenImage = adminCubeWoodenImage || "/cube-full-back-wall.jpg";
            console.log(`🖼️ applyGlobalSettings: ✅ Setting cube wooden backwall image: ${cubeWoodenImage} (admin: ${adminCubeWoodenImage || 'none'})`);
            return { ...option, title: customTitle, imageUrl: cubeWoodenImage };
          } else if (isBarrel) {
            // Check admin config for barrel wooden backwall image first
            const adminBarrelWoodenImage = globalSettings.optionImages?.["barrel_wooden-backwall"];
            const barrelWoodenImage = adminBarrelWoodenImage || "/barrel-full-back-wall.png";
            console.log(`🖼️ applyGlobalSettings: ✅ Setting barrel wooden backwall image: ${barrelWoodenImage} (admin: ${adminBarrelWoodenImage || 'none'})`);
            return { ...option, title: customTitle, imageUrl: barrelWoodenImage };
          }
        }
        
        // Handle full glass backwall option by ID or title
        const isFullGlassBackwall = option.id === "full-glass-backwall" ||
                                    ((optionTitleLower.includes("full glass") || optionTitleLower.includes("fullglass")) && 
                                     (optionTitleLower.includes("backwall") || optionTitleLower.includes("back wall")));
        
        if (isFullGlassBackwall && isBarrel) {
          // Check admin config for barrel full glass backwall image first
          const adminBarrelFullGlassImage = globalSettings.optionImages?.["barrel_full-glass-backwall"];
          const barrelFullGlassImage = adminBarrelFullGlassImage || "/barrel-full-glass-wall.png";
          console.log(`🖼️ applyGlobalSettings: ✅ Setting barrel full glass backwall image: ${barrelFullGlassImage} (admin: ${adminBarrelFullGlassImage || 'none'})`);
          return { ...option, title: customTitle, imageUrl: barrelFullGlassImage };
        }
        
        // Handle standard glass wall for barrel
        if (option.id === "glass-standard" && isBarrel) {
          // Check admin config for barrel full glass backwall image first
          const adminBarrelFullGlassImage = globalSettings.optionImages?.["barrel_full-glass-backwall"];
          const barrelFullGlassImage = adminBarrelFullGlassImage || "/barrel-full-glass-wall.png";
          console.log(`🖼️ applyGlobalSettings: ✅ Setting barrel standard glass image: ${barrelFullGlassImage} (admin: ${adminBarrelFullGlassImage || 'none'})`);
          return { ...option, title: customTitle, imageUrl: barrelFullGlassImage };
        }
        
        return { ...option, title: customTitle };
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
      
      updatedStepData["rear-glass-wall"] = {
        ...rearGlassStep,
        options: sortedOptions,
      };
      
      console.log(`🖼️ applyGlobalSettings: Updated options:`, updatedStepData["rear-glass-wall"].options.map((o: any) => ({ id: o.id, title: o.title, imageUrl: o.imageUrl })));
    }
  }

  // Apply global option titles to ALL steps (not just rear-glass-wall)
  // Titles are always applied globally (no priority rules needed)
  if (globalSettings.optionTitles) {
    console.log("🌍 ===== APPLYING GLOBAL OPTION TITLES TO ALL STEPS =====");
    Object.keys(updatedStepData).forEach((stepId) => {
      const stepData = updatedStepData[stepId];
      if (stepData && stepData.options) {
        const updatedOptions = stepData.options.map((option: any) => {
          // Apply custom title from global settings if available
          // Check for general option title (for all products)
          if (globalSettings.optionTitles![option.id]) {
            const newTitle = globalSettings.optionTitles![option.id];
            console.log(`📝 applyGlobalSettings: ✅ Applied general custom title for ${stepId}:${option.id}: "${option.title}" → "${newTitle}"`);
            return { ...option, title: newTitle };
          }
          return option;
        });
        
        updatedStepData[stepId] = {
          ...stepData,
          options: updatedOptions,
        };
      }
    });
    console.log("🌍 ===== GLOBAL OPTION TITLES APPLICATION COMPLETE =====");
  }

  // Apply global step names
  // IMPORTANT: Global step names ALWAYS override product-specific step names
  // This ensures that global settings take precedence over any product-specific settings
  if (globalSettings.stepNames && Object.keys(globalSettings.stepNames).length > 0) {
    console.log("🌍 ===== APPLYING GLOBAL STEP NAMES =====");
    console.log("🌍 Global Step Names Available:", globalSettings.stepNames);
    console.log("🌍 Product Step IDs:", updatedSteps.map(s => s.id));
    console.log("🌍 Product Step Names (BEFORE):", updatedSteps.map(s => ({ id: s.id, name: s.name })));
    
    let appliedCount = 0;
    updatedSteps.forEach((step, index) => {
      // Try exact match first
      let globalStepName = globalSettings.stepNames?.[step.id];
      
        // If no exact match, try case-insensitive match
        if (!globalStepName && globalSettings.stepNames) {
          const stepIdLower = step.id.toLowerCase();
          const matchingKey = Object.keys(globalSettings.stepNames).find(
            key => key.toLowerCase() === stepIdLower
          );
          if (matchingKey) {
            globalStepName = globalSettings.stepNames[matchingKey];
            console.log(`🌍 Found case-insensitive match: ${step.id} → ${matchingKey}`);
          }
        }
      
      if (globalStepName && globalStepName.trim()) {
        const oldName = step.name;
        const newName = globalStepName.trim();
        // CRITICAL: Always apply global step name if it exists, overriding product-specific name
        updatedSteps[index] = {
          ...step,
          name: newName,
        };
        if (oldName !== newName) {
          console.log(`🌍 ✓ OVERRIDING product name with global name for ${step.id}: "${oldName}" → "${newName}"`);
          appliedCount++;
        } else {
          console.log(`🌍 → Step ${step.id} already has global name: "${newName}"`);
        }
      } else {
        console.log(`🌍 ⚠ No global step name found for step ID: "${step.id}" (keeping product name: "${step.name}")`);
        console.log(`🌍 Available global step IDs:`, Object.keys(globalSettings.stepNames || {}));
      }
    });
    
    console.log("🌍 ===== GLOBAL STEP NAMES APPLICATION COMPLETE =====");
    console.log("🌍 Total Steps:", updatedSteps.length);
    console.log("🌍 Applied/Overridden Count:", appliedCount);
    console.log("🌍 Final Step Names (AFTER - should show global names):", updatedSteps.map(s => ({ id: s.id, name: s.name })));
    console.log("🌍 =================================================");
  } else {
    console.log("🌍 ⚠ No global step names to apply (empty or undefined)");
    console.log("🌍 Global settings object:", globalSettings);
    console.log("🌍 Global settings keys:", Object.keys(globalSettings || {}));
  }

  // Apply global step images
  // PRIORITY: Product-specific step images ALWAYS override global ones
  // If product-specific step image is set, it becomes the default for that product
  // If product-specific step image is NOT set, use global image as fallback
  // EXCEPTION: Aura products should NOT have global step images applied - they use their main product image
  const idLowerForStepImages = productId.toLowerCase();
  const nameLowerForStepImages = productName.toLowerCase();
  const isAuraProduct = idLowerForStepImages.includes("aura") || nameLowerForStepImages.includes("aura");
  
  if (globalSettings.stepImages && !isAuraProduct) {
    console.log("🖼️ ===== APPLYING GLOBAL STEP IMAGES =====");
    Object.keys(updatedStepData).forEach((stepId) => {
      const stepData = updatedStepData[stepId];
      const globalStepImage = globalSettings.stepImages?.[stepId];
      const hasProductSpecificImage = !!stepData.imageUrl;
      
      if (globalStepImage) {
        if (hasProductSpecificImage) {
          // Product-specific step image exists - it takes priority, ignore global
          console.log(`🖼️ Step ${stepId}: Using PRODUCT-SPECIFIC step image "${stepData.imageUrl}" (global image "${globalStepImage}" ignored)`);
        } else {
          // No product-specific step image - use global as fallback
          updatedStepData[stepId] = {
            ...stepData,
            imageUrl: globalStepImage,
          };
          console.log(`🖼️ Step ${stepId}: No product-specific step image, using GLOBAL step image "${globalStepImage}"`);
        }
      } else if (hasProductSpecificImage) {
        console.log(`🖼️ Step ${stepId}: Using PRODUCT-SPECIFIC step image "${stepData.imageUrl}" (no global step image set)`);
      }
    });
    console.log("🖼️ ===== GLOBAL STEP IMAGES APPLICATION COMPLETE =====");
  } else if (isAuraProduct) {
    console.log("🖼️ ===== SKIPPING GLOBAL STEP IMAGES FOR AURA PRODUCT =====");
    console.log("🖼️ Aura products use their main product image instead of step images");
  }

  // Apply global option images and Pipedrive products
  // PRIORITY: Product-specific images/links ALWAYS override global ones
  // If product-specific image is set, it becomes the default for that product
  // If product-specific image is NOT set, use global image as fallback
  // For rear glass wall, use cube/barrel specific settings
  if (globalSettings.optionImages || globalSettings.optionPipedriveProducts) {
    console.log("🖼️ ===== APPLYING GLOBAL OPTION IMAGES =====");
    Object.keys(updatedStepData).forEach((stepId) => {
      const stepData = updatedStepData[stepId];
      const isRearGlassWall = stepId === "rear-glass-wall";
      const idLower = productId.toLowerCase();
      const nameLower = productName.toLowerCase();
      const isCube = idLower.includes("cube") || nameLower.includes("cube");
      const isBarrel = idLower.includes("barrel") || nameLower.includes("barrel");
      
      const updatedOptions = stepData.options.map((option) => {
        let updatedOption = { ...option };
        const hasProductSpecificImage = !!option.imageUrl;

        // For rear glass wall, check for cube/barrel specific settings
        let globalOptionImage: string | undefined;
        let globalPipedriveProduct: number | undefined;
        
        if (isRearGlassWall && (isCube || isBarrel)) {
          const productPrefix = isCube ? "cube_" : "barrel_";
          globalOptionImage = globalSettings.optionImages?.[`${productPrefix}${option.id}`];
          globalPipedriveProduct = globalSettings.optionPipedriveProducts?.[`${productPrefix}${option.id}`];
        } else {
          // For other steps, use standard global settings
          globalOptionImage = globalSettings.optionImages?.[option.id];
          globalPipedriveProduct = globalSettings.optionPipedriveProducts?.[option.id];
        }

        // PRIORITY RULE: Product-specific images ALWAYS override global images
        // If product has its own image, use that (don't apply global)
        // If product doesn't have an image, use global as fallback
        if (globalOptionImage) {
          if (hasProductSpecificImage) {
            // Product-specific image exists - it takes priority, ignore global
            console.log(`🖼️ Option ${option.id}: Using PRODUCT-SPECIFIC image "${option.imageUrl}" (global image "${globalOptionImage}" ignored)`);
          } else {
            // No product-specific image - use global as fallback
            updatedOption = {
              ...updatedOption,
              imageUrl: globalOptionImage,
            };
            console.log(`🖼️ Option ${option.id}: No product-specific image, using GLOBAL image "${globalOptionImage}"`);
          }
        } else if (hasProductSpecificImage) {
          console.log(`🖼️ Option ${option.id}: Using PRODUCT-SPECIFIC image "${option.imageUrl}" (no global image set)`);
        }

        // PRIORITY RULE: Product-specific Pipedrive links ALWAYS override global links
        // If product has its own link, use that (don't apply global)
        // If product doesn't have a link, use global as fallback
        if (globalPipedriveProduct) {
          if (option.pipedriveProductId) {
            // Product-specific link exists - it takes priority, ignore global
            console.log(`🔗 Option ${option.id}: Using PRODUCT-SPECIFIC Pipedrive link (global link ignored)`);
          } else {
            // No product-specific link - use global as fallback
            updatedOption = {
              ...updatedOption,
              pipedriveProductId: globalPipedriveProduct,
            };
            console.log(`🔗 Option ${option.id}: No product-specific Pipedrive link, using GLOBAL link`);
          }
        }

        return updatedOption;
      });

      updatedStepData[stepId] = {
        ...stepData,
        options: updatedOptions,
      };
    });
    console.log("🖼️ ===== GLOBAL OPTION IMAGES APPLICATION COMPLETE =====");
  }

  // Filter out express and white glove delivery options - only keep standard delivery
  if (updatedStepData["delivery"]) {
    const deliveryStep = updatedStepData["delivery"];
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
      console.log(`🚫 applyGlobalSettings: Filtered out express/white glove delivery options. Remaining: ${filteredDeliveryOptions.length} option(s)`);
      updatedStepData["delivery"] = {
        ...deliveryStep,
        options: filteredDeliveryOptions,
      };
    }
  }

  return {
    ...productConfig,
    steps: updatedSteps,
    stepData: updatedStepData,
    // Preserve mainProductImageUrl - global settings don't override it
    mainProductImageUrl: productConfig.mainProductImageUrl,
  };
}


