"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import ConfiguratorLayout from "@/components/ConfiguratorLayout";
import OptionSection from "@/components/OptionSection";
import OptionCard from "@/components/OptionCard";
import { getStepData } from "@/data";
import { useConfigurator } from "@/contexts/ConfiguratorContext";
import { useAdminConfig } from "@/contexts/AdminConfigContext";
import { StepId, StepData } from "@/types/configurator";
import { DEFAULT_STEP } from "@/constants/steps";
import { getProductConfig } from "@/utils/productStorage";
import { ProductConfig } from "@/types/product";
import { capitalize } from "@/utils/capitalize";
import NavigationButtons from "@/components/NavigationButtons";

export default function ProductConfiguratorStepPage() {
  const params = useParams();
  const router = useRouter();
  const productSlug = params.slug as string;
  // Use state to track current step - this allows instant transitions
  const [currentStep, setCurrentStep] = useState<string>(params.step as string);
  
  // Listen for custom stepchange events (from our instant navigation)
  useEffect(() => {
    const handleStepChange = (e: CustomEvent<{ route: string }>) => {
      const route = e.detail.route;
      const pathParts = route.split('/');
      const stepFromRoute = pathParts[pathParts.length - 1];
      if (stepFromRoute && stepFromRoute !== currentStep) {
        setCurrentStep(stepFromRoute);
      }
    };
    
    window.addEventListener('stepchange', handleStepChange as EventListener);
    return () => window.removeEventListener('stepchange', handleStepChange as EventListener);
  }, [currentStep]);
  
  // Sync with URL params on mount (for initial load and direct URL access)
  useEffect(() => {
    const stepFromUrl = params.step as string;
    if (stepFromUrl !== currentStep) {
      setCurrentStep(stepFromUrl);
    }
  }, [params.step]);
  
  // Listen for popstate events (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const pathParts = window.location.pathname.split('/');
      const stepFromUrl = pathParts[pathParts.length - 1];
      if (stepFromUrl && stepFromUrl !== currentStep && stepFromUrl !== 'quote') {
        setCurrentStep(stepFromUrl);
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentStep]);
  
  // Use currentStep instead of step from params for rendering
  // This allows instant transitions without waiting for Next.js router
  const step = currentStep;
  
  // Load product config
  const [config, setConfig] = useState<ProductConfig | null>(null);
  const [selectedOptionImageUrl, setSelectedOptionImageUrl] = useState<string | undefined>(undefined);
  // Pre-fetched prices from Pipedrive (keyed by product ID)
  const [pipedrivePrices, setPipedrivePrices] = useState<Record<number, { price: number; currency: string; vatRate?: number }>>({});
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  
  // Quote form state
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  
  // Ice Bath expandable section state
  const [iceBathExpanded, setIceBathExpanded] = useState(false);
  
  // Hot Tubs expandable section state
  const [hotTubsExpanded, setHotTubsExpanded] = useState(false);
  
  // Delivery location state (for "Delivery Outside UK" option)
  const [deliveryLocation, setDeliveryLocation] = useState<string>("");
  
  // Load config function
  const loadConfig = async () => {
    try {
      // Fetch products from API instead of localStorage
      const productsResponse = await fetch("/api/products");
      if (!productsResponse.ok) {
        console.error("❌ Failed to load products:", productsResponse.status);
        return;
      }
      const productsData = await productsResponse.json();
      const products = productsData.products || [];
      const product = products.find((p: any) => p.slug === productSlug);
      
      if (product) {
        // Force reload by adding cache-busting parameter
        const productConfig = await getProductConfig(product.id);
        console.log("📦 ===== LOADED CONFIG FOR PRODUCT =====");
        console.log("📦 Product ID:", product.id);
        console.log("📦 Product Name:", product.name);
        console.log("📦 Main Product Image:", productConfig?.mainProductImageUrl || "Not set");
        console.log("📦 Steps Count:", productConfig?.steps?.length);
        console.log("📦 Step Names (FINAL - should have global settings):", productConfig?.steps?.map((s: any) => ({ id: s.id, name: s.name })));
        console.log("📦 =====================================");
        setConfig(productConfig);
        // Force a small delay to ensure state update propagates
        setTimeout(() => {
          console.log("📦 Config state updated. New mainProductImageUrl:", productConfig?.mainProductImageUrl);
        }, 100);
      } else {
        console.error("❌ Product not found with slug:", productSlug);
      }
    } catch (error) {
      console.error("❌ Error loading product config:", error);
    }
  };

  useEffect(() => {
    // Initial load
    loadConfig();

    // Listen for storage changes (when admin panel saves)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && (e.key.startsWith("saunamo-product-config-") || e.key === "saunamo-admin-config")) {
        // Reload config when product config or admin config (global settings) changes
        console.log("🔄 Storage change detected, reloading config...", e.key);
        loadConfig();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Also listen for custom events (for same-tab updates)
    const handleProductConfigUpdate = () => {
      console.log("🔄 Product config update event received, reloading config...");
      console.log("🔄 Current config mainProductImageUrl:", config?.mainProductImageUrl);
      // Force a fresh reload with a small delay to ensure server has saved
      setTimeout(() => {
        loadConfig().then(() => {
          console.log("🔄 Config reloaded after productConfigUpdated event");
          // Force a state update to trigger re-render
          setConfig((prev) => prev ? { ...prev } : null);
        });
      }, 200);
    };
    const handleAdminConfigUpdate = () => {
      console.log("🔄 Admin config update event (global settings changed), reloading...");
      loadConfig();
      // Force re-render to pick up new adminConfig.mainProductImageUrl
      setConfig((prev) => prev ? { ...prev } : null);
    };
    
    window.addEventListener("productConfigUpdated", handleProductConfigUpdate);
    window.addEventListener("adminConfigUpdated", handleAdminConfigUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("productConfigUpdated", handleProductConfigUpdate);
      window.removeEventListener("adminConfigUpdated", handleAdminConfigUpdate);
    };
  }, [productSlug]);
  
  const { getSelection, updateSelection, isStepComplete, state, clearAllSelections } = useConfigurator();
  const { config: adminConfig } = useAdminConfig();
  
  // Clear selections when switching products to ensure main product image shows on first step
  // Also clear on initial load to ensure no stale selections from previous products
  const previousProductSlug = useRef<string | null>(null);
  const hasInitialized = useRef(false);
  useEffect(() => {
    // Clear on first load OR when product actually changes
    if (!hasInitialized.current || (previousProductSlug.current !== null && previousProductSlug.current !== productSlug)) {
      console.log(`🔄 Product ${!hasInitialized.current ? 'initial load' : 'changed'} (from ${previousProductSlug.current} to ${productSlug}), clearing selections and selected option image`);
      clearAllSelections();
      setSelectedOptionImageUrl(undefined); // Also clear selected option image
      hasInitialized.current = true;
    }
    previousProductSlug.current = productSlug;
  }, [productSlug, clearAllSelections]);
  
  // Get stepData with product-specific image updates - use useMemo to ensure React tracks changes
  const stepData = useMemo(() => {
    // Quote step doesn't have stepData - it has a custom form instead
    if (step === "quote") return null;
    
    // Use config stepData if it exists (product-specific), otherwise use default
    // Don't merge - use one or the other to avoid duplicates
    const configStepData = config?.stepData?.[step];
    const defaultStepData = getStepData(step);
    const adminStepData = adminConfig?.stepData?.[step];
    
    // Use config stepData if it exists, otherwise fall back to admin config stepData, then default
    // This prevents duplicate options
    let baseStepData = configStepData || adminStepData || defaultStepData;
    
    if (!baseStepData) return null;
    
    // Apply admin step title if it exists (admin title should override product-specific title)
    // This ensures changes in the admin panel's Steps tab are reflected
    if (adminStepData?.title && adminStepData.title !== baseStepData.title) {
      console.log(`📝 Applying admin step title for ${step}: "${adminStepData.title}" (was: "${baseStepData.title}")`);
      baseStepData = {
        ...baseStepData,
        title: adminStepData.title,
      };
    }
    
    // For Cube 125, ensure rear-glass-wall step is single select
    if (step === "rear-glass-wall" && config) {
      const productName = config.productName || "";
      const productId = config.productId || "";
      const slugLower = productSlug.toLowerCase();
      const nameLower = productName.toLowerCase();
      const idLower = productId.toLowerCase();
      const isCube125 = slugLower.includes("cube") && (slugLower.includes("125") || idLower.includes("125") || nameLower.includes("125"));
      
      if (isCube125 && baseStepData.selectionType !== "single") {
        console.log(`🔧 Forcing rear-glass-wall to single select for Cube 125`);
        baseStepData = {
          ...baseStepData,
          selectionType: "single",
        };
      }
    }
    
    // For heater step, ensure stone options from default are always included
    // This ensures "According to selected heater" option appears even with product-specific configs
    if (step === "heater") {
      // Helper to identify stone options
      const isStoneOption = (opt: any) => {
        const idLower = opt.id.toLowerCase();
        const titleLower = opt.title.toLowerCase();
        return idLower.includes("heater-stone") || 
               idLower.includes("stone") ||
               idLower.includes("heaterstone") ||
               titleLower.includes("according to") ||
               titleLower.includes("heater stone") ||
               titleLower.includes("heaterstone");
      };
      
      if (configStepData && defaultStepData) {
        const defaultStoneOptions = defaultStepData.options.filter(isStoneOption);
        
        // Check if any stone options are missing from product-specific config
        const existingStoneOptionIds = new Set(
          baseStepData.options
            .filter(isStoneOption)
            .map((opt: any) => opt.id)
        );
        
        // Add missing stone options from default
        const missingStoneOptions = defaultStoneOptions.filter(
          (opt: any) => !existingStoneOptionIds.has(opt.id)
        );
        
        if (missingStoneOptions.length > 0) {
          console.log(`✅ Adding ${missingStoneOptions.length} missing stone option(s) to heater step:`, missingStoneOptions.map((o: any) => o.id));
          
          // Apply global settings to the missing stone options
          const missingStoneOptionsWithGlobalSettings = missingStoneOptions.map((opt: any) => {
            let updatedOpt = { ...opt };
            
            // Apply global option title if available
            if (adminConfig?.globalSettings?.optionTitles?.[opt.id]) {
              updatedOpt.title = adminConfig.globalSettings.optionTitles[opt.id];
              console.log(`📝 Applied global title to stone option ${opt.id}: "${updatedOpt.title}"`);
            }
            
            // Apply global option image if available
            if (adminConfig?.globalSettings?.optionImages?.[opt.id]) {
              updatedOpt.imageUrl = adminConfig.globalSettings.optionImages[opt.id];
              console.log(`🖼️ Applied global image to stone option ${opt.id}: "${updatedOpt.imageUrl}"`);
            }
            
            // Apply global Pipedrive product if available
            if (adminConfig?.globalSettings?.optionPipedriveProducts?.[opt.id]) {
              updatedOpt.pipedriveProductId = adminConfig.globalSettings.optionPipedriveProducts[opt.id];
              console.log(`🔗 Applied global Pipedrive product to stone option ${opt.id}: ${updatedOpt.pipedriveProductId}`);
            }
            
            return updatedOpt;
          });
          
          baseStepData = {
            ...baseStepData,
            options: [...baseStepData.options, ...missingStoneOptionsWithGlobalSettings],
          };
        }
      }
      
      // Apply global settings to ALL existing stone options (to ensure they're always up to date)
      baseStepData = {
        ...baseStepData,
        options: baseStepData.options.map((opt: any) => {
          if (!isStoneOption(opt)) return opt;
          
          let updatedOpt = { ...opt };
          
          // Apply global option title if available (override existing)
          if (adminConfig?.globalSettings?.optionTitles?.[opt.id]) {
            updatedOpt.title = adminConfig.globalSettings.optionTitles[opt.id];
            console.log(`📝 Applied global title to existing stone option ${opt.id}: "${updatedOpt.title}"`);
          }
          
          // Apply global option image if available (override existing if global is set)
          if (adminConfig?.globalSettings?.optionImages?.[opt.id]) {
            updatedOpt.imageUrl = adminConfig.globalSettings.optionImages[opt.id];
            console.log(`🖼️ Applied global image to existing stone option ${opt.id}: "${updatedOpt.imageUrl}"`);
          }
          
          // Apply global Pipedrive product if available (only if not already set, or if global is set)
          if (adminConfig?.globalSettings?.optionPipedriveProducts?.[opt.id]) {
            // Global Pipedrive product takes precedence
            updatedOpt.pipedriveProductId = adminConfig.globalSettings.optionPipedriveProducts[opt.id];
            console.log(`🔗 Applied global Pipedrive product to existing stone option ${opt.id}: ${updatedOpt.pipedriveProductId}`);
          }
          
          return updatedOpt;
        }),
      };
    }
    
    // Apply step image with priority: product-specific > global settings (Global Settings tab) > admin stepData (Steps tab) > default (none)
    // Global Settings stepImages take precedence over stepData.imageUrl because they're more recent/updated
    const globalStepImage = adminConfig?.globalSettings?.stepImages?.[step];
    const adminStepDataForImage = adminConfig?.stepData?.[step];
    
    // Priority: product-specific > global settings > admin stepData
    if (!baseStepData.imageUrl) {
      if (globalStepImage) {
        // Global Settings tab image (highest priority for admin images)
        baseStepData = {
          ...baseStepData,
          imageUrl: globalStepImage,
        };
        console.log(`🖼️ useMemo: Applied global step image for ${step}: "${globalStepImage}"`);
      } else if (adminStepDataForImage?.imageUrl) {
        // Steps tab image (fallback)
        baseStepData = {
          ...baseStepData,
          imageUrl: adminStepDataForImage.imageUrl,
        };
        console.log(`🖼️ useMemo: Applied admin stepData image for ${step}: "${adminStepDataForImage.imageUrl}"`);
      }
    } else {
      // Product-specific image takes precedence, but log what we have
      console.log(`🖼️ useMemo: Step ${step} already has product-specific imageUrl: "${baseStepData.imageUrl}"`);
      // Still apply global step image if it exists (override product-specific if needed)
      if (globalStepImage) {
        baseStepData = {
          ...baseStepData,
          imageUrl: globalStepImage,
        };
        console.log(`🖼️ useMemo: Overriding with global step image for ${step}: "${globalStepImage}"`);
      }
    }
    
    console.log(`📋 useMemo: Using stepData source:`, {
      step,
      hasConfigStepData: !!configStepData,
      hasDefaultStepData: !!defaultStepData,
      configOptionsCount: configStepData?.options?.length || 0,
      defaultOptionsCount: defaultStepData?.options?.length || 0,
      finalOptionsCount: baseStepData.options.length,
      finalOptions: baseStepData.options.map(o => ({ id: o.id, title: o.title })),
    });
    
    // Update half-moon option images based on product type if this is the rear-glass-wall step
    if (step === "rear-glass-wall" && config) {
      const productName = config.productName || "";
      const productId = config.productId || "";
      const isCube = productSlug.toLowerCase().includes("cube") || 
                     productName.toLowerCase().includes("cube") ||
                     productId.toLowerCase().includes("cube");
      const isBarrel = productSlug.toLowerCase().includes("barrel") || 
                      productName.toLowerCase().includes("barrel") ||
                      productId.toLowerCase().includes("barrel");
      
      console.log(`🖼️ useMemo: Checking product type for half-moon image:`, {
        productSlug,
        productName,
        productId,
        isCube,
        isBarrel,
        baseStepDataOptionsCount: baseStepData.options.length,
        baseStepDataOptions: baseStepData.options.map(o => ({ id: o.id, title: o.title, imageUrl: o.imageUrl })),
      });
      
      if (isCube || isBarrel) {
        // First, filter options based on product type
        let filteredOptions = baseStepData.options;
        
        if (isCube) {
          // Cube models: Only show wooden backwall and half moon (exclude full glass backwall)
          filteredOptions = baseStepData.options.filter((option) => {
            const optionId = option.id || "";
            const optionTitleLower = (option.title || "").toLowerCase();
            const isFullGlassBackwall = optionId === "full-glass-backwall" ||
                                      ((optionTitleLower.includes("full glass") || optionTitleLower.includes("fullglass")) && 
                                       (optionTitleLower.includes("backwall") || optionTitleLower.includes("back wall")));
            return !isFullGlassBackwall; // Exclude full glass backwall for cubes
          });
          console.log(`🖼️ useMemo: Filtered options for cube - removed full glass backwall. Remaining: ${filteredOptions.length} options`);
        } else if (isBarrel) {
          // Barrel models: Show all rear glass wall options (no filtering)
          // All options are available for barrel models
          filteredOptions = baseStepData.options;
          console.log(`🖼️ useMemo: Barrel model - showing all ${filteredOptions.length} rear glass wall options`);
        }
        
        const updatedOptions = filteredOptions.map((option) => {
          const optionTitleLower = (option.title || "").toLowerCase();
          const optionIdLower = (option.id || "").toLowerCase();
          
          // Check for half-moon option by ID or title
          const isHalfMoon = option.id === "glass-half-moon" || 
                            optionIdLower.includes("half-moon") ||
                            optionIdLower.includes("halfmoon") ||
                            optionTitleLower.includes("half moon") ||
                            optionTitleLower.includes("half-moon");
          
          if (isHalfMoon) {
            if (isCube) {
              // Check admin config for cube half-moon image first
              const adminCubeHalfMoonImage = adminConfig?.globalSettings?.optionImages?.["cube_glass-half-moon"];
              const cubeHalfMoonImage = adminCubeHalfMoonImage || "/cube-back-moon.jpg";
              console.log(`🖼️ useMemo: ✅ Setting cube half-moon image for option "${option.title}": ${cubeHalfMoonImage} (admin: ${adminCubeHalfMoonImage || 'none'})`);
              return { ...option, imageUrl: cubeHalfMoonImage };
            } else if (isBarrel) {
              // Check admin config for barrel half-moon image first
              const adminBarrelHalfMoonImage = adminConfig?.globalSettings?.optionImages?.["barrel_glass-half-moon"];
              const barrelHalfMoonImage = adminBarrelHalfMoonImage || "/barrel-half-moon.webp";
              console.log(`🖼️ useMemo: ✅ Setting barrel half-moon image for option "${option.title}": ${barrelHalfMoonImage} (admin: ${adminBarrelHalfMoonImage || 'none'})`);
              return { ...option, imageUrl: barrelHalfMoonImage };
            }
          }
          
          // Check for wooden backwall option by ID or title (case-insensitive)
          const isWoodenBackwall = option.id === "wooden-backwall" ||
                                   (optionTitleLower.includes("wooden") && 
                                    (optionTitleLower.includes("backwall") || optionTitleLower.includes("back wall")));
          
          if (isWoodenBackwall) {
            if (isCube) {
              // Check admin config for cube wooden backwall image first
              const adminCubeWoodenImage = adminConfig?.globalSettings?.optionImages?.["cube_wooden-backwall"];
              const cubeWoodenImage = adminCubeWoodenImage || "/cube-full-back-wall.jpg";
              console.log(`🖼️ useMemo: ✅ Setting cube wooden backwall image: ${cubeWoodenImage} (admin: ${adminCubeWoodenImage || 'none'})`);
              return { ...option, imageUrl: cubeWoodenImage };
            } else if (isBarrel) {
              // Check admin config for barrel wooden backwall image first
              const adminBarrelWoodenImage = adminConfig?.globalSettings?.optionImages?.["barrel_wooden-backwall"];
              const barrelWoodenImage = adminBarrelWoodenImage || "/barrel-full-back-wall.webp";
              console.log(`🖼️ useMemo: ✅ Setting barrel wooden backwall image: ${barrelWoodenImage} (admin: ${adminBarrelWoodenImage || 'none'})`);
              return { ...option, imageUrl: barrelWoodenImage };
            }
          }
          
          // Check for full glass backwall option by ID or title (case-insensitive)
          const isFullGlassBackwall = option.id === "full-glass-backwall" ||
                                      ((optionTitleLower.includes("full glass") || optionTitleLower.includes("fullglass")) && 
                                       (optionTitleLower.includes("backwall") || optionTitleLower.includes("back wall")));
          
          if (isFullGlassBackwall && isBarrel) {
            // Check admin config for barrel full glass backwall image first
            const adminBarrelFullGlassImage = adminConfig?.globalSettings?.optionImages?.["barrel_full-glass-backwall"];
            const barrelFullGlassImage = adminBarrelFullGlassImage || "/barrel-full-glass-wall.webp";
            console.log(`🖼️ useMemo: ✅ Setting barrel full glass backwall image: ${barrelFullGlassImage} (admin: ${adminBarrelFullGlassImage || 'none'})`);
            return { ...option, imageUrl: barrelFullGlassImage };
          }
          
          // Also handle standard glass wall for barrel (might be used as full glass)
          if (option.id === "glass-standard" && isBarrel) {
            // Check admin config for barrel full glass backwall image first
            const adminBarrelFullGlassImage = adminConfig?.globalSettings?.optionImages?.["barrel_full-glass-backwall"];
            const barrelFullGlassImage = adminBarrelFullGlassImage || "/barrel-full-glass-wall.webp";
            console.log(`🖼️ useMemo: ✅ Setting barrel standard glass image: ${barrelFullGlassImage} (admin: ${adminBarrelFullGlassImage || 'none'})`);
            return { ...option, imageUrl: barrelFullGlassImage };
          }
          
          return option;
        });
        
        // Sort options: wooden backwall first, then others
        const sortedOptions = [...updatedOptions].sort((a, b) => {
          const aTitleLower = (a.title || "").toLowerCase();
          const bTitleLower = (b.title || "").toLowerCase();
          const aIsWooden = aTitleLower.includes("wooden") && (aTitleLower.includes("backwall") || aTitleLower.includes("back wall"));
          const bIsWooden = bTitleLower.includes("wooden") && (bTitleLower.includes("backwall") || bTitleLower.includes("back wall"));
          
          if (aIsWooden && !bIsWooden) return -1; // a comes first
          if (!aIsWooden && bIsWooden) return 1;  // b comes first
          return 0; // keep original order for others
        });
        
        // Apply global settings to rear-glass-wall options (after product-specific images)
        const optionsWithGlobalSettings = sortedOptions.map((opt: any) => {
          let updatedOpt = { ...opt };
          
          // Apply global option title if available
          if (adminConfig?.globalSettings?.optionTitles?.[opt.id]) {
            updatedOpt.title = adminConfig.globalSettings.optionTitles[opt.id];
          }
          
          // Apply global option image if available (but don't override product-specific images that were just set)
          // Only apply if the image wasn't set by product-specific logic above
          const hasProductSpecificImage = (isCube && (opt.id === "glass-half-moon" || opt.id === "wooden-backwall")) ||
                                        (isBarrel && (opt.id === "glass-half-moon" || opt.id === "wooden-backwall" || opt.id === "full-glass-backwall" || opt.id === "glass-standard"));
          if (!hasProductSpecificImage && adminConfig?.globalSettings?.optionImages?.[opt.id]) {
            updatedOpt.imageUrl = adminConfig.globalSettings.optionImages[opt.id];
            if (process.env.NODE_ENV === 'development') {
              console.log(`🖼️ Applied global image to rear-glass-wall option ${opt.id}: "${updatedOpt.imageUrl}"`);
            }
          }
          
          // Apply global Pipedrive product if available
          if (adminConfig?.globalSettings?.optionPipedriveProducts?.[opt.id]) {
            updatedOpt.pipedriveProductId = adminConfig.globalSettings.optionPipedriveProducts[opt.id];
          }
          
          return updatedOpt;
        });
        
        const updatedStepData = {
          ...baseStepData,
          options: optionsWithGlobalSettings,
        };
        
        console.log(`🖼️ useMemo: Final stepData options (${updatedStepData.options.length} total):`, updatedStepData.options.map(o => ({ id: o.id, title: o.title, imageUrl: o.imageUrl })));
        return updatedStepData;
      }
    }
    
    // Apply global settings (optionImages, optionTitles) to ALL options, not just heater stones
    // This ensures that when images are updated in the admin panel, they appear immediately
    const finalStepData = {
      ...baseStepData,
      options: baseStepData.options.map((opt: any) => {
        let updatedOpt = { ...opt };
        
        // Apply global option title if available
        if (adminConfig?.globalSettings?.optionTitles?.[opt.id]) {
          updatedOpt.title = adminConfig.globalSettings.optionTitles[opt.id];
        }
        
        // Apply global option image if available (override existing if global is set)
        if (adminConfig?.globalSettings?.optionImages?.[opt.id]) {
          updatedOpt.imageUrl = adminConfig.globalSettings.optionImages[opt.id];
          if (process.env.NODE_ENV === 'development') {
            console.log(`🖼️ Applied global image to option ${opt.id}: "${updatedOpt.imageUrl}"`);
          }
        }
        
        // Apply global Pipedrive product if available
        if (adminConfig?.globalSettings?.optionPipedriveProducts?.[opt.id]) {
          updatedOpt.pipedriveProductId = adminConfig.globalSettings.optionPipedriveProducts[opt.id];
        }
        
        return updatedOpt;
      }),
    };
    
    console.log(`🖼️ useMemo: Returning final stepData with ${finalStepData.options.length} options:`, finalStepData.options.map(o => ({ id: o.id, title: o.title, imageUrl: o.imageUrl })));
    console.log(`🖼️ useMemo: Step imageUrl:`, finalStepData.imageUrl);
    return finalStepData;
  }, [step, config, productSlug, adminConfig]);
  
  // Calculate if we can proceed - this will update when selections change
  const canProceed = stepData ? isStepComplete(stepData.stepId as StepId, stepData) : false;

  // Memoize product image URL to ensure it updates when config changes
  const productImageUrl = useMemo(() => {
    const url = config?.mainProductImageUrl || adminConfig?.mainProductImageUrl;
    console.log("🖼️ Product image URL calculated:", url);
    return url;
  }, [config?.mainProductImageUrl, adminConfig?.mainProductImageUrl]);

  // Debug: Log the image URL to help diagnose (must be before any conditional returns)
  useEffect(() => {
    if (config) {
      console.log("Product Config Image URL:", config.mainProductImageUrl);
      console.log("Product Config:", {
        productId: config.productId,
        productName: config.productName,
        hasMainImage: !!config.mainProductImageUrl,
        mainImageLength: config.mainProductImageUrl?.length || 0,
        mainImagePreview: config.mainProductImageUrl?.substring(0, 100),
      });
    }
  }, [config]);
  
  // Pre-fetch all Pipedrive prices for options in this step
  useEffect(() => {
    // Skip price fetching for quote step (it's a separate page)
    if (step === "quote") return;
    if (!stepData || !adminConfig || !stepData.options || stepData.options.length === 0) return;
    
    // Collect all Pipedrive product IDs from options
    const productIds: number[] = [];
    const globalSettings = adminConfig.globalSettings;
    
    stepData.options.forEach((option) => {
      // Check global settings first (preferred)
      const pipedriveProductId = globalSettings?.optionPipedriveProducts?.[option.id] || option.pipedriveProductId;
      if (pipedriveProductId && typeof pipedriveProductId === 'number') {
        productIds.push(pipedriveProductId);
      }
    });
    
    // Also check for lighting base option if multiplier is used
    stepData.options.forEach((option) => {
      if (step === "lighting") {
        const titleMatch = option.title.match(/(?:^|\()(\d+)x\s/i);
        if (titleMatch && parseInt(titleMatch[1], 10) > 1) {
          // Find base option (1x version)
          const baseOption = stepData.options.find(opt => {
            const baseTitle = opt.title.toLowerCase();
            const has1x = (baseTitle.startsWith("1 x") || baseTitle.startsWith("1x") || baseTitle.includes("(1x"));
            return has1x && baseTitle.includes("2.5m") && baseTitle.includes("led");
          });
          if (baseOption) {
            const basePipedriveProductId = globalSettings?.optionPipedriveProducts?.[baseOption.id] || baseOption.pipedriveProductId;
            if (basePipedriveProductId && typeof basePipedriveProductId === 'number' && !productIds.includes(basePipedriveProductId)) {
              productIds.push(basePipedriveProductId);
            }
          }
        }
      }
    });
    
    // Remove duplicates
    const uniqueProductIds = [...new Set(productIds)];
    
    if (uniqueProductIds.length === 0) {
      setPipedrivePrices({});
      return;
    }
    
    // Fetch prices in batch
    setIsLoadingPrices(true);
    fetch('/api/pipedrive/products/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: uniqueProductIds }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.products) {
          const priceMap: Record<number, { price: number; currency: string; vatRate?: number }> = {};
          
          Object.entries(data.products).forEach(([productIdStr, product]: [string, any]) => {
            const productId = parseInt(productIdStr, 10);
            if (product?.prices?.[0]) {
              const priceData = product.prices[0];
              const priceGBP = priceData.currency === "GBP" 
                ? priceData.price 
                : product.prices.find((p: any) => p.currency === "GBP")?.price || priceData.price;
              
              // Extract VAT rate
              let vatRate: number | undefined;
              if (product.tax !== undefined && product.tax !== null) {
                vatRate = typeof product.tax === 'number' ? product.tax / 100 : parseFloat(product.tax) / 100;
              }
              
              priceMap[productId] = {
                price: priceGBP,
                currency: priceData.currency || "GBP",
                vatRate,
              };
            }
          });
          
          setPipedrivePrices(priceMap);
        }
        setIsLoadingPrices(false);
      })
      .catch(err => {
        console.error('Failed to fetch prices in batch:', err);
        setIsLoadingPrices(false);
      });
  }, [stepData, adminConfig, step]);
  
  // Clear selected option image when step changes (so step image can show)
  useEffect(() => {
    setSelectedOptionImageUrl(undefined);
    setPipedrivePrices({}); // Clear prices when step changes
  }, [step]);
  
  // Update selected option image when selection changes
  // For Cube 125 rear-glass-wall step, only update image if user has interacted
  useEffect(() => {
    if (stepData) {
      const selectedIds = getSelection(stepData.stepId);
      
      // Special handling for Cube 125 rear-glass-wall: only show option image after user interaction
      if (step === "rear-glass-wall" && config) {
        const productName = config.productName || "";
        const productId = config.productId || "";
        const slugLower = productSlug.toLowerCase();
        const nameLower = productName.toLowerCase();
        const idLower = productId.toLowerCase();
        const isCube125 = (slugLower.includes("cube") && (slugLower.includes("125") || slugLower.includes("cube-125"))) ||
                          (idLower.includes("cube") && (idLower.includes("125") || idLower.includes("cube-125"))) ||
                          (nameLower.includes("cube") && (nameLower.includes("125") || nameLower.includes("cube 125")));
        
        if (isCube125) {
          // Only update image if user has interacted with the step
          if (!hasUserInteractedRef.current) {
            // Keep step image (don't set selectedOptionImageUrl)
            return;
          }
        }
      }
      
      if (selectedIds.length > 0) {
        // Get the first selected option's image (for single select, there's only one)
        // For multi-select, show the last selected option's image
        const lastSelectedId = selectedIds[selectedIds.length - 1];
        const selectedOption = stepData.options.find(opt => opt.id === lastSelectedId);
        if (selectedOption?.imageUrl) {
          setSelectedOptionImageUrl(selectedOption.imageUrl);
        } else {
          setSelectedOptionImageUrl(undefined);
        }
      } else {
        // For heater step on products that DON'T have rear-glass-wall (Hiki/Aisti),
        // show the main product image instead of auto-selecting first heater's image
        // This ensures the product image shows when the configurator first opens
        if (step === "heater" && config) {
          const productName = config.productName || "";
          const slugLower = productSlug.toLowerCase();
          const nameLower = productName.toLowerCase();
          const isHikiOrAisti = slugLower.includes("hiki") || 
                                slugLower.includes("aisti") ||
                                nameLower.includes("hiki") ||
                                nameLower.includes("aisti");
          
          if (isHikiOrAisti) {
            // For Hiki/Aisti, show main product image (don't auto-select heater image)
            setSelectedOptionImageUrl(undefined);
          } else {
            // For other products (Cube, Barrel), auto-select first heater image
            const heaterOptions = stepData.options.filter(opt => {
              const idLower = opt.id.toLowerCase();
              const titleLower = opt.title.toLowerCase();
              return !(idLower.includes("heater-stone") || 
                      idLower.includes("stone") ||
                      titleLower.includes("according to"));
            });
            if (heaterOptions.length > 0 && heaterOptions[0].imageUrl) {
              setSelectedOptionImageUrl(heaterOptions[0].imageUrl);
            } else {
              setSelectedOptionImageUrl(undefined);
            }
          }
        } else {
          setSelectedOptionImageUrl(undefined);
        }
      }
    }
  }, [stepData, getSelection, step, state.selections]);

  useEffect(() => {
    // Skip redirect logic for quote step (it's handled separately)
    if (step === "quote") return;
    
    // Check if this is rear-glass-wall step and should be blocked for Hiki/Aisti only (Cube 125 should have it)
    if (step === "rear-glass-wall" && config) {
      const productName = config.productName || "";
      const slugLower = productSlug.toLowerCase();
      const nameLower = productName.toLowerCase();
      const isHikiOrAisti = slugLower.includes("hiki") || 
                            slugLower.includes("aisti") ||
                            nameLower.includes("hiki") ||
                            nameLower.includes("aisti");
      
      if (isHikiOrAisti) {
        console.log(`🚫 Blocking rear-glass-wall step for ${productName} (Hiki/Aisti model)`);
        // Redirect to first available step (heater)
        router.push(`/products/${productSlug}/configurator/heater`);
        return;
      }
    }
    
    // Don't redirect for quote step - it intentionally has no stepData
    if (!stepData && config && step !== "quote") {
      // If stepData not found, redirect to first step of this product
      const firstStep = config.steps?.[0];
      if (firstStep) {
        router.push(`/products/${productSlug}/configurator/${firstStep.id}`);
      } else {
        // Fallback to default step
        router.push(`/products/${productSlug}/configurator/${DEFAULT_STEP.route.split('/').pop()}`);
      }
    }
  }, [stepData, router, productSlug, config, step]);

  // Preselect "wooden-backwall" for Cube 125 in rear-glass-wall step
  // Use a ref to track if we've already preselected to prevent blinking/re-renders
  const hasPreselectedRef = useRef<string | null>(null);
  // Track if user has manually interacted with the step (to know when to show option image)
  const hasUserInteractedRef = useRef<boolean>(false);
  
  useEffect(() => {
    // Reset the refs when step changes
    if (step !== "rear-glass-wall") {
      hasPreselectedRef.current = null;
      hasUserInteractedRef.current = false;
      return;
    }
    
    if (step === "rear-glass-wall" && config && stepData) {
      const productName = config.productName || "";
      const productId = config.productId || "";
      const slugLower = productSlug.toLowerCase();
      const nameLower = productName.toLowerCase();
      const idLower = productId.toLowerCase();
      
      // Check if this is Cube 125 - be more specific to avoid false matches
      const isCube125 = (slugLower.includes("cube") && (slugLower.includes("125") || slugLower.includes("cube-125"))) ||
                        (idLower.includes("cube") && (idLower.includes("125") || idLower.includes("cube-125"))) ||
                        (nameLower.includes("cube") && (nameLower.includes("125") || nameLower.includes("cube 125")));
      
      if (isCube125) {
        // Find wooden-backwall option - check both ID and title
        const woodenBackwallOption = stepData.options.find(opt => 
          opt.id === "wooden-backwall" || 
          opt.id.toLowerCase().includes("wooden-backwall") ||
          (opt.title.toLowerCase().includes("wooden") && opt.title.toLowerCase().includes("backwall"))
        );
        
        if (woodenBackwallOption) {
          const woodenBackwallId = woodenBackwallOption.id;
          const currentSelection = getSelection("rear-glass-wall");
          
          // Only preselect once per step load, and only if not already selected
          // Use the step + productId as a key to track if we've preselected for this specific load
          const preselectionKey = `${step}-${productId || productSlug}`;
          
          if (hasPreselectedRef.current !== preselectionKey) {
            if (currentSelection.length === 0 || !currentSelection.includes(woodenBackwallId)) {
              console.log(`✅ Preselecting "wooden-backwall" for Cube 125 (current selection: ${currentSelection.join(", ")})`);
              hasPreselectedRef.current = preselectionKey;
              
              // Set selection immediately, but DON'T set the image yet
              // Keep the step image until user manually interacts
              updateSelection("rear-glass-wall", [woodenBackwallId]);
              
              // Don't set the image here - keep step image until user clicks
            } else if (currentSelection.includes(woodenBackwallId)) {
              // Already selected, just mark as preselected
              hasPreselectedRef.current = preselectionKey;
              // Only set image if user has interacted
              if (hasUserInteractedRef.current && woodenBackwallOption.imageUrl) {
                setSelectedOptionImageUrl(woodenBackwallOption.imageUrl);
              }
            }
          }
        } else {
          console.warn(`⚠️ Cube 125: Could not find "wooden-backwall" option in rear-glass-wall step. Available options:`, stepData.options.map(o => o.id));
        }
      }
    }
  }, [step, config?.productId, productSlug, stepData, getSelection, updateSelection]);

  // Debug: Log steps to verify global settings are applied (must be before conditional returns)
  useEffect(() => {
    if (config?.steps) {
      console.log("🎯 ===== CONFIGURATOR USING STEPS =====");
      console.log("🎯 Steps being used in configurator:", config.steps.map(s => ({ id: s.id, name: s.name })));
      
      // Also check what global settings say
      if (typeof window !== "undefined") {
        const { loadConfigFromStorage } = require("@/utils/configStorage");
        const adminConfig = loadConfigFromStorage();
        const globalStepNames = adminConfig?.globalSettings?.stepNames || {};
        console.log("🎯 Global step names from admin config:", globalStepNames);
        console.log("🎯 Comparing step IDs:");
        config.steps.forEach(step => {
          const globalName = globalStepNames[step.id];
          console.log(`🎯   Step ${step.id}:`, {
            displayedName: step.name,
            globalName: globalName || "NOT SET",
            matches: globalName ? step.name === globalName : "N/A",
          });
        });
      }
      console.log("🎯 ====================================");
    }
  }, [config?.steps]);

  // Load delivery location from localStorage on mount
  useEffect(() => {
    if (step === "delivery" && typeof window !== "undefined") {
      const savedLocation = localStorage.getItem(`delivery-location-${productSlug}`);
      if (savedLocation) {
        setDeliveryLocation(savedLocation);
      }
    }
  }, [step, productSlug]);
  
  // Save delivery location to localStorage when it changes
  useEffect(() => {
    if (step === "delivery") {
      if (deliveryLocation && typeof window !== "undefined") {
        localStorage.setItem(`delivery-location-${productSlug}`, deliveryLocation);
      } else if (!deliveryLocation && typeof window !== "undefined") {
        localStorage.removeItem(`delivery-location-${productSlug}`);
      }
    }
  }, [deliveryLocation, step, productSlug]);
  
  // Preload images for the next step to reduce lag on navigation
  useEffect(() => {
    if (!config || !stepData) return;
    
    const currentIndex = config.steps.findIndex(s => s.id === step);
    const nextStep = currentIndex < config.steps.length - 1 ? config.steps[currentIndex + 1] : null;
    
    if (nextStep && nextStep.id !== "quote") {
      // Get next step's data
      const nextStepData = config.stepData?.[nextStep.id];
      if (nextStepData?.options) {
        // Preload option images for next step
        nextStepData.options.forEach((option: any) => {
          if (option.imageUrl) {
            const img = new window.Image();
            img.src = option.imageUrl;
          }
        });
        // Also preload step image if it exists
        if (nextStepData.imageUrl) {
          const img = new window.Image();
          img.src = nextStepData.imageUrl;
        }
      }
    }
  }, [config, step, stepData]);

  // For quote step, stepData is intentionally null (it doesn't have options)
  // So we skip the stepData check for quote step
  if (!stepData && step !== "quote") {
    // Don't return null - Next.js treats it as 404
    // Show loading state or redirect instead
    if (!config) {
      return (
        <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
          <div className="text-center">
            <img 
              src="/saunamo-logo.webp" 
              alt="Saunamo" 
              className="h-10 mx-auto mb-6 animate-pulse"
            />
            <p className="text-gray-500">Loading configurator...</p>
          </div>
        </div>
      );
    }
    // If config exists but stepData is null, it might be an invalid step
    // The redirect logic in useEffect will handle this
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="text-center">
          <img 
            src="/saunamo-logo.webp" 
            alt="Saunamo" 
            className="h-10 mx-auto mb-6 animate-pulse"
          />
          <p className="text-gray-500">Loading configurator...</p>
        </div>
      </div>
    );
  }

  // For quote step, selectedIds and other stepData-dependent vars are not needed
  // Guard against null stepData for quote step
  const selectedIds = stepData ? getSelection(stepData.stepId) : [];
  
  // Helper function to get pre-fetched price for an option
  const getPreFetchedPrice = (optionId: string) => {
    if (!stepData || !stepData.options) return undefined;
    const globalSettings = adminConfig?.globalSettings;
    const pipedriveProductId = globalSettings?.optionPipedriveProducts?.[optionId] || stepData.options.find(o => o.id === optionId)?.pipedriveProductId;
    if (pipedriveProductId && typeof pipedriveProductId === 'number') {
      return pipedrivePrices[pipedriveProductId];
    }
    return undefined;
  };
  
  // Get current heater selection to ensure price calculation updates reactively
  // Use state.selections directly to ensure reactivity
  const heaterSelection = step === "heater" ? (state?.selections?.["heater"] || []) : [];
  
  // Get the selected option title for the badge (preserves exact capitalization)
  // Guard against null stepData for quote step
  const selectedOptionTitle = (selectedIds.length > 0 && stepData)
    ? (() => {
        // For single selection, get the first selected option's title
        // For multi selection, get the last selected option's title (most recently selected)
        const selectedId = stepData.selectionType === "single" 
          ? selectedIds[0] 
          : selectedIds[selectedIds.length - 1];
        const selectedOption = stepData.options.find(opt => opt.id === selectedId);
        return selectedOption?.title;
      })()
    : undefined;

  // Calculate heater stones price and quantity based on selected heater (for heater step)
  // Use useMemo to recalculate when state.selections changes
  const heaterStonesCalculation = useMemo(() => {
    if (step !== "heater") return undefined;
    if (!state || !state.selections) return undefined;
    
    // Get heater selection directly from state to ensure reactivity
    const currentHeaterSelection = state.selections["heater"] || [];
    if (currentHeaterSelection.length === 0) {
      console.log("[Heater Stones Calculation] No heater selected");
      return undefined;
    }
    
    console.log("[Heater Stones Calculation] Recalculating with heater selection:", currentHeaterSelection);
    
    // Helper to check if option is a stone option
    const isStoneOption = (optId: string, optTitle: string) => {
      const idLower = optId.toLowerCase();
      const isStoneById = idLower.includes("heater-stone") || 
                         idLower.includes("stone") ||
                         idLower.includes("heaterstone");
      
      if (isStoneById) return true;
      
      const titleLower = optTitle.toLowerCase();
      return titleLower.includes("according to") ||
             titleLower.includes("heater stone") ||
             titleLower.includes("heaterstone");
    };
    
    // Find the selected heater option (not a stone option)
    const allStepData = config?.stepData;
    const heaterStepData = allStepData?.["heater"] || stepData;
    const heaterOptions = heaterStepData.options.filter(opt => 
      !isStoneOption(opt.id, opt.title)
    );
    
    const selectedHeaterId = currentHeaterSelection.find(id => 
      heaterOptions.some(opt => opt.id === id)
    );
    
    console.log("[Heater Stones Calculation] Selected heater ID:", selectedHeaterId);
    
    if (!selectedHeaterId) return undefined;
    
    const heaterOption = heaterOptions.find(opt => opt.id === selectedHeaterId);
    if (!heaterOption) return undefined;
    
    // Get original option data before global settings override to extract kg
    // Try to get from default step data first (original title)
    const { getStepData } = require("@/data");
    const defaultHeaterData = getStepData("heater");
    const originalHeaterOption = defaultHeaterData?.options.find((opt: any) => opt.id === selectedHeaterId);
    
    // Use original title if available, otherwise use current (might be overridden)
    const titleToUse = originalHeaterOption?.title || heaterOption.title;
    
    // Extract kg from heater title (e.g., "Aava 4.7kW (20kg)" -> 20 or "Kajo 6.6kW (80kg)" -> 80)
    // Try multiple patterns: "(20kg)", "20kg", "(20 kg)", "20 kg"
    const kgMatch = titleToUse.match(/\((\d+)\s*kg\)/i) || 
                   titleToUse.match(/(\d+)\s*kg/i) ||
                   titleToUse.match(/\((\d+)kg\)/i);
    
    if (!kgMatch) {
      console.warn(`Could not extract kg from heater title: "${titleToUse}"`);
      return undefined;
    }
    
    const kg = parseInt(kgMatch[1], 10);
    if (isNaN(kg)) return undefined;
    
    // Calculate: kg / 20 = number of packages needed
    // 1 package = 20kg = £29.50
    const packagesNeeded = kg / 20;
    const totalPrice = packagesNeeded * 29.50;
    
    console.log(`Heater stones calculation: ${kg}kg / 20kg = ${packagesNeeded} packages × £29.50 = £${totalPrice.toFixed(2)}`);
    
    return {
      kg,
      packagesNeeded,
      totalPrice,
    };
  }, [step, config, stepData, state]);
  
  // Keep backward compatibility - extract just the price
  const heaterStonesPrice = heaterStonesCalculation?.totalPrice;
  
  // Keep the function for backward compatibility
  const calculateHeaterStonesPrice = () => heaterStonesPrice;

  const handleToggle = (optionId: string) => {
    // Special handling for heater step: separate heaters from stones
    if (step === "heater") {
      const allStepData = config?.stepData;
      const heaterStepData = allStepData?.["heater"] || stepData;
      // Helper function to check if an option is a stone option
      const isStoneOption = (optId: string, optTitle?: string) => {
        const idLower = optId.toLowerCase();
        const isStoneById = idLower.includes("heater-stone") || 
                           idLower.includes("stone") ||
                           idLower.includes("heaterstone");
        
        if (isStoneById) return true;
        
        // Check title as fallback
        if (optTitle) {
          const titleLower = optTitle.toLowerCase();
          return titleLower.includes("according to") ||
                 titleLower.includes("heater stone") ||
                 titleLower.includes("heaterstone");
        }
        
        // If we have the option object, check its title
        const option = heaterStepData.options.find(o => o.id === optId);
        if (option) {
          const titleLower = option.title.toLowerCase();
          return titleLower.includes("according to") ||
                 titleLower.includes("heater stone") ||
                 titleLower.includes("heaterstone");
        }
        
        return false;
      };
      
      const isHeaterOption = !isStoneOption(optionId);
      const isStone = isStoneOption(optionId);
      
      if (isHeaterOption) {
        // Heater selection: single select - only one heater can be selected
        // Keep existing stone selections, replace/toggle heater selection
        const currentStones = selectedIds.filter(id => {
          const opt = heaterStepData.options.find(o => o.id === id);
          return opt && isStoneOption(id, opt.title);
        });
        
        // Check if this heater is already selected - if so, deselect it
        const isCurrentlySelected = selectedIds.includes(optionId);
        if (isCurrentlySelected) {
          // Deselect the heater, keep only stones
          updateSelection(stepData.stepId, [...currentStones]);
          // Clear the selected option image or show step image
          setSelectedOptionImageUrl(undefined);
        } else {
          // Select this heater (replaces any previously selected heater)
          updateSelection(stepData.stepId, [optionId, ...currentStones]);
          
          // Update image
          const selectedOption = stepData.options.find(opt => opt.id === optionId);
          if (selectedOption?.imageUrl) {
            setSelectedOptionImageUrl(selectedOption.imageUrl);
          }
        }
      } else if (isStone) {
        // Stone selection: can be toggled independently
        console.log(`[Heater Stones] Toggling stone option: ${optionId}`);
        console.log(`[Heater Stones] Current selectedIds:`, selectedIds);
        
        const currentHeaters = selectedIds.filter(id => {
          const opt = heaterStepData.options.find(o => o.id === id);
          return opt && !isStoneOption(id, opt.title);
        });
        
        console.log(`[Heater Stones] Current heaters:`, currentHeaters);
        
        // Toggle the stone option
        const isCurrentlySelected = selectedIds.includes(optionId);
        console.log(`[Heater Stones] Is currently selected:`, isCurrentlySelected);
        
        let updatedStones: string[];
        if (isCurrentlySelected) {
          // Remove the stone option
          updatedStones = selectedIds.filter(id => {
            if (id === optionId) return false; // Remove the clicked option
            const opt = heaterStepData.options.find(o => o.id === id);
            return opt && isStoneOption(id, opt.title); // Keep other stones
          });
        } else {
          // Add the stone option
          const currentStones = selectedIds.filter(id => {
            const opt = heaterStepData.options.find(o => o.id === id);
            return opt && isStoneOption(id, opt.title);
          });
          updatedStones = [...currentStones, optionId];
        }
        
        console.log(`[Heater Stones] Updated stones:`, updatedStones);
        console.log(`[Heater Stones] Final selection:`, [...currentHeaters, ...updatedStones]);
        
        updateSelection(stepData.stepId, [...currentHeaters, ...updatedStones]);
        
        // Update image if stone has image
        const selectedOption = stepData.options.find(opt => opt.id === optionId);
        if (selectedOption?.imageUrl) {
          setSelectedOptionImageUrl(selectedOption.imageUrl);
        } else if (updatedStones.length === 0) {
          // If no stones selected, show heater image or step image
          const selectedHeater = currentHeaters[0];
          if (selectedHeater) {
            const heaterOpt = stepData.options.find(opt => opt.id === selectedHeater);
            if (heaterOpt?.imageUrl) {
              setSelectedOptionImageUrl(heaterOpt.imageUrl);
            } else {
              setSelectedOptionImageUrl(undefined);
            }
          } else {
            setSelectedOptionImageUrl(undefined);
          }
        }
      }
    } else {
      // Normal selection logic for other steps
      if (stepData.selectionType === "single") {
        // Mark user interaction for Cube 125 rear-glass-wall step
        if (step === "rear-glass-wall" && config) {
          const productName = config.productName || "";
          const productId = config.productId || "";
          const slugLower = productSlug.toLowerCase();
          const nameLower = productName.toLowerCase();
          const idLower = productId.toLowerCase();
          const isCube125 = slugLower.includes("cube") && (slugLower.includes("125") || idLower.includes("125") || nameLower.includes("125"));
          
          if (isCube125) {
            hasUserInteractedRef.current = true;
          }
        }
        
        // Allow unchecking: if clicking the same option that's already selected, clear selection
        if (selectedIds.includes(optionId) && selectedIds.length === 1) {
          updateSelection(stepData.stepId, []);
          setSelectedOptionImageUrl(undefined);
        } else {
          updateSelection(stepData.stepId, [optionId]);
          // Immediately update image when option is selected
          const selectedOption = stepData.options.find(opt => opt.id === optionId);
          if (selectedOption?.imageUrl) {
            setSelectedOptionImageUrl(selectedOption.imageUrl);
          }
        }
      } else {
        const newSelectedIds = selectedIds.includes(optionId)
          ? selectedIds.filter((id) => id !== optionId)
          : [...selectedIds, optionId];
        updateSelection(stepData.stepId, newSelectedIds);
        // For multi-select, show the last selected option's image
        if (newSelectedIds.length > 0) {
          const lastSelectedId = newSelectedIds[newSelectedIds.length - 1];
          const selectedOption = stepData.options.find(opt => opt.id === lastSelectedId);
          if (selectedOption?.imageUrl) {
            setSelectedOptionImageUrl(selectedOption.imageUrl);
          }
        } else {
          setSelectedOptionImageUrl(undefined);
        }
      }
    }
  };

  // Handle quote generation
  const handleGenerateQuote = useCallback(async () => {
    if (!customerEmail) {
      setQuoteError("Please enter your email address");
      return;
    }

    if (!config) {
      setQuoteError("Product configuration not loaded. Please refresh the page.");
      return;
    }

    setIsGenerating(true);
    setQuoteError("");

    try {
      // Get delivery location if available
      const savedDeliveryLocation = typeof window !== "undefined" 
        ? localStorage.getItem(`delivery-location-${productSlug}`) || ""
        : "";
      
      const response = await fetch("/api/quotes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: config.productId,
          productName: config.productName,
          productConfig: config,
          selections: state.selections,
          customerEmail,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          notes: notes || undefined,
          deliveryLocation: savedDeliveryLocation,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate quote");
      }

      const data = await response.json();
      
      if (data.quoteId) {
        router.push(`/quote/${data.quoteId}`);
      } else {
        setQuoteError("Quote generated but no quote ID returned");
      }
    } catch (err: any) {
      setQuoteError(err.message || "Failed to generate quote. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [customerEmail, customerName, customerPhone, notes, config, state.selections, router, productSlug]);

  // Listen for generateQuote event from NavigationButtons
  useEffect(() => {
    const handleGenerateQuoteEvent = () => {
      if (customerEmail) {
        handleGenerateQuote();
      } else {
        setQuoteError("Please enter your email address");
      }
    };
    
    window.addEventListener('generateQuote', handleGenerateQuoteEvent);
    return () => window.removeEventListener('generateQuote', handleGenerateQuoteEvent);
  }, [customerEmail, handleGenerateQuote]);

  // Show a nice loading animation on initial configurator load
  // This only shows when config hasn't loaded yet (first visit)
  if (!config) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="text-center">
          <img 
            src="/saunamo-logo.webp" 
            alt="Saunamo" 
            className="h-10 mx-auto mb-6 animate-pulse"
          />
          <p className="text-gray-500">Loading configurator...</p>
        </div>
      </div>
    );
  }

  // For quote step, render the quote form instead of options
  if (step === "quote") {
    const quoteStep = config.steps.find(s => s.id === "quote");
    const design = config.design;
    
    // Build the "Your Selections" summary for the left panel (below image)
    const quoteSummary = (
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Selections</h3>
        
        {/* Main Product */}
        {config.mainProductPipedriveId && (
          <div className="border-b border-gray-200 pb-4">
            <h4 className="font-medium text-gray-900 mb-2">Sauna</h4>
            <ul className="space-y-1">
              <li className="text-sm text-gray-700">
                {capitalize(config.productName || "Main Product")}
              </li>
            </ul>
          </div>
        )}
        
        {config.steps.filter(s => s.id !== "quote").map((stepItem) => {
          const stepItemData = config.stepData[stepItem.id];
          const selectedIds = state.selections[stepItem.id] || [];
          if (selectedIds.length === 0 || !stepItemData) return null;

          return (
            <div key={stepItem.id} className="border-b border-gray-200 pb-4 last:border-0">
              <h4 className="font-medium text-gray-900 mb-2">
                {stepItem.id === "rear-glass-wall" ? "Rear Wall Option" : stepItem.name}
              </h4>
              <ul className="space-y-1">
                {selectedIds.map((optionId) => {
                  let option = stepItemData.options.find((opt) => opt.id === optionId);
                  
                  if (!option) {
                    const defaultStepData = getStepData(stepItem.id);
                    if (defaultStepData) {
                      option = defaultStepData.options.find((opt) => opt.id === optionId);
                    }
                  }
                  
                  if (!option) {
                    return (
                      <li key={optionId} className="text-sm text-gray-700">
                        {capitalize(optionId.replace(/-/g, " "))}
                      </li>
                    );
                  }
                  
                  let displayTitle = option.title;
                  if (stepItem.id === "heater") {
                    const titleLower = option.title.toLowerCase();
                    if (titleLower.includes("according to") || titleLower.includes("heater stone")) {
                      displayTitle = "Heater stones";
                    }
                  }
                  
                  return (
                    <li key={optionId} className="text-sm text-gray-700">
                      {capitalize(displayTitle)}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    );
    
    return (
      <ConfiguratorLayout
        currentStepId={"quote" as StepId}
        stepData={null}
        productImageUrl={productImageUrl}
        productName={config.productName}
        steps={config.steps}
        design={config.design}
        productSlug={productSlug}
        canProceed={!!customerEmail}
        selectedOptionImageUrl={undefined}
        selectedOptionTitle={undefined}
        isGenerating={isGenerating}
        leftPanelContent={quoteSummary}
      >
        {/* Contact Information Form - appears on the right side */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact Information</h2>
            <p className="text-gray-600">
              Please provide your contact details to generate your quote.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="quote-form-input w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="quote-form-input w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="quote-form-input w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800"
                placeholder="+44 20 1234 5678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="quote-form-input w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800"
                placeholder="Any special requirements or questions..."
              />
            </div>
          </div>

          {/* Error Message */}
          {quoteError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{quoteError}</p>
            </div>
          )}
        </div>
      </ConfiguratorLayout>
    );
  }

  // For non-quote steps, render the normal options
  return (
    <ConfiguratorLayout
      currentStepId={stepData?.stepId as StepId}
      stepData={stepData}
      productImageUrl={productImageUrl}
      productName={config.productName}
      steps={config.steps}
      design={config.design}
      productSlug={productSlug}
      canProceed={canProceed}
      selectedOptionImageUrl={selectedOptionImageUrl}
      selectedOptionTitle={selectedOptionTitle}
    >
      {/* For heater step, split into sections: Electric Heaters, Woodburning Heaters, and Heater Stones */}
      {step === "heater" ? (
        <>
          {/* Electric Heaters Section */}
          {stepData.options.filter(option => {
            const idLower = option.id.toLowerCase();
            const titleLower = option.title.toLowerCase();
            const isStone = idLower.includes("stone") || titleLower.includes("stone") || titleLower.includes("according to");
            if (isStone) return false;
            const isElectric = idLower.includes("aava") || 
                              idLower.includes("saunum") ||
                              titleLower.includes("aava") ||
                              titleLower.includes("saunum") ||
                              titleLower.includes("kw");
            return isElectric;
          }).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900">Electric Heaters</h3>
              <div className="space-y-3">
                {stepData.options
                  .filter(option => {
                    const idLower = option.id.toLowerCase();
                    const titleLower = option.title.toLowerCase();
                    const isStone = idLower.includes("stone") || titleLower.includes("stone") || titleLower.includes("according to");
                    if (isStone) return false;
                    const isElectric = idLower.includes("aava") || 
                                      idLower.includes("saunum") ||
                                      titleLower.includes("aava") ||
                                      titleLower.includes("saunum") ||
                                      titleLower.includes("kw");
                    return isElectric;
                  })
                  .map((option) => {
                    const productName = config?.productName || "";
                    const productId = config?.productId || "";
                    const isCube = productSlug.toLowerCase().includes("cube") || 
                                   productName.toLowerCase().includes("cube") ||
                                   productId.toLowerCase().includes("cube");
                    const isBarrel = productSlug.toLowerCase().includes("barrel") || 
                                    productName.toLowerCase().includes("barrel") ||
                                    productId.toLowerCase().includes("barrel");
                    const productType = isCube ? "cube" : isBarrel ? "barrel" : undefined;
                    
                    return (
                      <OptionCard
                        key={option.id}
                        option={option}
                        isSelected={selectedIds.includes(option.id)}
                        selectionType="single"
                        onToggle={() => handleToggle(option.id)}
                        stepId={step}
                        productType={productType}
                        preFetchedPrice={getPreFetchedPrice(option.id)}
                      />
                    );
                  })}
              </div>
            </div>
          )}
          
          {/* Woodburning Heaters Section */}
          {stepData.options.filter(option => {
            const idLower = option.id.toLowerCase();
            const titleLower = option.title.toLowerCase();
            const isStone = idLower.includes("stone") || titleLower.includes("stone") || titleLower.includes("according to");
            if (isStone) return false;
            const isWoodburning = idLower.includes("tuli") || 
                                 idLower.includes("pyros") ||
                                 idLower.includes("noki") ||
                                 titleLower.includes("tuli") ||
                                 titleLower.includes("pyros") ||
                                 titleLower.includes("noki");
            return isWoodburning;
          }).length > 0 && (
            <div className="space-y-4 mt-8">
              <h3 className="text-xl font-bold text-gray-900">Woodburning Heaters</h3>
              <div className="space-y-3">
                {stepData.options
                  .filter(option => {
                    const idLower = option.id.toLowerCase();
                    const titleLower = option.title.toLowerCase();
                    const isStone = idLower.includes("stone") || titleLower.includes("stone") || titleLower.includes("according to");
                    if (isStone) return false;
                    const isWoodburning = idLower.includes("tuli") || 
                                         idLower.includes("pyros") ||
                                         idLower.includes("noki") ||
                                         titleLower.includes("tuli") ||
                                         titleLower.includes("pyros") ||
                                         titleLower.includes("noki");
                    return isWoodburning;
                  })
                  .map((option) => {
                    const productName = config?.productName || "";
                    const productId = config?.productId || "";
                    const isCube = productSlug.toLowerCase().includes("cube") || 
                                   productName.toLowerCase().includes("cube") ||
                                   productId.toLowerCase().includes("cube");
                    const isBarrel = productSlug.toLowerCase().includes("barrel") || 
                                    productName.toLowerCase().includes("barrel") ||
                                    productId.toLowerCase().includes("barrel");
                    const productType = isCube ? "cube" : isBarrel ? "barrel" : undefined;
                    
                    return (
                      <OptionCard
                        key={option.id}
                        option={option}
                        isSelected={selectedIds.includes(option.id)}
                        selectionType="single"
                        onToggle={() => handleToggle(option.id)}
                        stepId={step}
                        productType={productType}
                        preFetchedPrice={getPreFetchedPrice(option.id)}
                      />
                    );
                  })}
              </div>
            </div>
          )}
          
          {/* Heater Stones Section */}
          <div className="space-y-4 mt-8">
            <h3 className="text-xl font-bold text-gray-900">Heater Stones</h3>
            <div className="space-y-3">
            {stepData.options
              .filter(option => {
                // Check option ID first (most reliable - doesn't change with global settings)
                const idLower = option.id.toLowerCase();
                const isStoneById = idLower.includes("heater-stone") || 
                                   idLower.includes("stone") ||
                                   idLower.includes("heaterstone");
                
                // Also check title as fallback (but this can be overridden by global settings)
                const titleLower = option.title.toLowerCase();
                const isStoneByTitle = titleLower.includes("according to") ||
                                      titleLower.includes("heater stone") ||
                                      titleLower.includes("heaterstone");
                
                return isStoneById || isStoneByTitle;
              })
              .sort((a, b) => {
                // Put "According to selected heater" first, then others
                const aIsAccording = a.title.toLowerCase().includes("according to");
                const bIsAccording = b.title.toLowerCase().includes("according to");
                if (aIsAccording && !bIsAccording) return -1; // According to goes first
                if (!aIsAccording && bIsAccording) return 1;
                return 0;
              })
              .map((option) => {
                // Determine product type for rear-glass-wall step
                const productName = config?.productName || "";
                const productId = config?.productId || "";
                const isCube = productSlug.toLowerCase().includes("cube") || 
                               productName.toLowerCase().includes("cube") ||
                               productId.toLowerCase().includes("cube");
                const isBarrel = productSlug.toLowerCase().includes("barrel") || 
                                productName.toLowerCase().includes("barrel") ||
                                productId.toLowerCase().includes("barrel");
                const productType = isCube ? "cube" : isBarrel ? "barrel" : undefined;
                
                // Calculate price for "According to selected heater" option
                // Recalculate on every render to ensure it uses latest heater selection
                // Check both title and ID, handle typos like "cccording"
                const titleLower = option.title.toLowerCase();
                const idLower = option.id.toLowerCase();
                const isAccordingToOption = 
                  titleLower.includes("according to") ||
                  titleLower.includes("cccording to") || // Handle typo
                  titleLower.includes("heater stone") ||
                  titleLower.includes("heaterstone") ||
                  idLower.includes("stone") ||
                  idLower.includes("heater-stone");
                
                // Use the memoized heater stones calculation
                // Force recalculation by using state.selections directly in the key
                // Always use heaterStonesCalculation for stone options, even if matching logic fails
                const calculatedPrice = isAccordingToOption ? (heaterStonesCalculation?.totalPrice ?? undefined) : undefined;
                const calculatedQuantity = isAccordingToOption ? (heaterStonesCalculation?.packagesNeeded ?? undefined) : undefined;
                
                // If heaterStonesCalculation exists but isAccordingToOption is false, log a warning
                if (heaterStonesCalculation !== undefined && !isAccordingToOption && process.env.NODE_ENV === 'development') {
                  console.warn(`[Heater Stones] Calculation exists (${heaterStonesCalculation.totalPrice}) but option not matched:`, {
                    optionId: option.id,
                    optionTitle: option.title,
                    titleLower,
                    idLower,
                  });
                }
                
                // Debug logging - always log for heater stones to diagnose
                if (isAccordingToOption) {
                  console.log(`[Heater Stones] Option "${option.title}":`, {
                    optionId: option.id,
                    isAccordingToOption,
                    heaterStonesCalculation,
                    calculatedPrice,
                    calculatedQuantity,
                    heaterSelection: state?.selections?.["heater"] || [],
                    step,
                    hasState: !!state,
                    hasSelections: !!state?.selections,
                  });
                }
                
                return (
                  <OptionCard
                    key={`${option.id}-${(state?.selections?.["heater"] || []).join(',')}`}
                    option={option}
                    isSelected={selectedIds.includes(option.id)}
                    selectionType="multi"
                    onToggle={() => handleToggle(option.id)}
                    stepId="heater-stones"
                    productType={productType}
                    calculatedPrice={calculatedPrice}
                    calculatedQuantity={calculatedQuantity}
                    preFetchedPrice={getPreFetchedPrice(option.id)}
                  />
                );
              })}
            </div>
          </div>
        </>
      ) : step === "cold-plunge" ? (
        /* Ice Bath step - shows expandable prompt */
        <div className="space-y-4">
          {/* Expandable Ice Bath prompt */}
          {!iceBathExpanded && selectedIds.length === 0 ? (
            <div 
              className="bg-white rounded-lg shadow-sm border-2 border-gray-200 hover:border-green-800 transition-colors cursor-pointer p-6"
              onClick={() => setIceBathExpanded(true)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Would you like to add an Ice Bath to your order?</h3>
                  <p className="text-sm text-gray-600 mt-1">Complete your wellness experience with contrast therapy</p>
                </div>
                <div className="flex items-center gap-2 text-green-800 flex-shrink-0 ml-4">
                  <span className="text-sm font-medium">View options</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            /* Expanded Ice Bath options */
            <OptionSection
              title="Ice Bath"
              description={stepData.description}
              subheader={adminConfig?.globalSettings?.stepSubheaders?.[step]}
              subtext={stepData.subtext}
              moreInfoUrl={adminConfig?.globalSettings?.stepMoreInfoEnabled?.[step] 
                ? adminConfig?.globalSettings?.stepMoreInfoUrl?.[step] 
                : undefined}
            >
              {/* Hide options link - collapses back to prompt */}
              {selectedIds.length === 0 && (
                <button
                  onClick={() => setIceBathExpanded(false)}
                  className="mb-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Hide options
                </button>
              )}
              {stepData.options.map((option) => {
                const productName = config?.productName || "";
                const productId = config?.productId || "";
                const isCube = productSlug.toLowerCase().includes("cube") || 
                               productName.toLowerCase().includes("cube") ||
                               productId.toLowerCase().includes("cube");
                const isBarrel = productSlug.toLowerCase().includes("barrel") || 
                                productName.toLowerCase().includes("barrel") ||
                                productId.toLowerCase().includes("barrel");
                const productType = isCube ? "cube" : isBarrel ? "barrel" : undefined;
                
                return (
                  <OptionCard
                    key={option.id}
                    option={option}
                    isSelected={selectedIds.includes(option.id)}
                    selectionType={stepData.selectionType}
                    onToggle={() => handleToggle(option.id)}
                    stepId={step}
                    productType={productType}
                    preFetchedPrice={getPreFetchedPrice(option.id)}
                  />
                );
              })}
            </OptionSection>
          )}
        </div>
      ) : step === "hot-tubs" ? (
        /* Hot Tubs step - shows expandable prompt */
        <div className="space-y-4">
          {/* Expandable Hot Tubs prompt */}
          {!hotTubsExpanded && selectedIds.length === 0 ? (
            <div 
              className="bg-white rounded-lg shadow-sm border-2 border-gray-200 hover:border-green-800 transition-colors cursor-pointer p-6"
              onClick={() => setHotTubsExpanded(true)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Would you like to add a Hot Tub to your order?</h3>
                  <p className="text-sm text-gray-600 mt-1">Enhance your outdoor wellness experience</p>
                </div>
                <div className="flex items-center gap-2 text-green-800 flex-shrink-0 ml-4">
                  <span className="text-sm font-medium">View options</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            /* Expanded Hot Tubs options */
            <OptionSection
              title="Hot Tubs"
              description={stepData.description}
              subheader={adminConfig?.globalSettings?.stepSubheaders?.[step]}
              subtext={stepData.subtext}
              moreInfoUrl={adminConfig?.globalSettings?.stepMoreInfoEnabled?.[step] 
                ? adminConfig?.globalSettings?.stepMoreInfoUrl?.[step] 
                : undefined}
            >
              {/* Hide options link - collapses back to prompt */}
              {selectedIds.length === 0 && (
                <button
                  onClick={() => setHotTubsExpanded(false)}
                  className="mb-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Hide options
                </button>
              )}
              {stepData.options.map((option) => {
                const productName = config?.productName || "";
                const productId = config?.productId || "";
                const isCube = productSlug.toLowerCase().includes("cube") || 
                               productName.toLowerCase().includes("cube") ||
                               productId.toLowerCase().includes("cube");
                const isBarrel = productSlug.toLowerCase().includes("barrel") || 
                                productName.toLowerCase().includes("barrel") ||
                                productId.toLowerCase().includes("barrel");
                const productType = isCube ? "cube" : isBarrel ? "barrel" : undefined;
                
                return (
                  <OptionCard
                    key={option.id}
                    option={option}
                    isSelected={selectedIds.includes(option.id)}
                    selectionType={stepData.selectionType}
                    onToggle={() => handleToggle(option.id)}
                    stepId={step}
                    productType={productType}
                    preFetchedPrice={getPreFetchedPrice(option.id)}
                  />
                );
              })}
            </OptionSection>
          )}
        </div>
      ) : step === "delivery" ? (
        <OptionSection
          title={stepData.title}
          description={stepData.description}
          subheader={adminConfig?.globalSettings?.stepSubheaders?.[step]}
          subtext={stepData.subtext}
          moreInfoUrl={adminConfig?.globalSettings?.stepMoreInfoEnabled?.[step] 
            ? adminConfig?.globalSettings?.stepMoreInfoUrl?.[step] 
            : undefined}
        >
          {stepData.options.map((option) => {
            const productName = config?.productName || "";
            const productId = config?.productId || "";
            const isCube = productSlug.toLowerCase().includes("cube") || 
                           productName.toLowerCase().includes("cube") ||
                           productId.toLowerCase().includes("cube");
            const isBarrel = productSlug.toLowerCase().includes("barrel") || 
                            productName.toLowerCase().includes("barrel") ||
                            productId.toLowerCase().includes("barrel");
            const productType = isCube ? "cube" : isBarrel ? "barrel" : undefined;
            
            const isOutsideUK = option.id === "delivery-outside-uk";
            const isSelected = selectedIds.includes(option.id);
            
            return (
              <OptionCard
                key={option.id}
                option={option}
                isSelected={isSelected}
                selectionType={stepData.selectionType}
                onToggle={() => {
                  handleToggle(option.id);
                  // Clear location if deselecting
                  if (isSelected) {
                    setDeliveryLocation("");
                    if (typeof window !== "undefined") {
                      localStorage.removeItem(`delivery-location-${productSlug}`);
                    }
                  }
                }}
                stepId={step}
                productType={productType}
                preFetchedPrice={getPreFetchedPrice(option.id)}
                additionalContent={isOutsideUK && isSelected ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Location
                    </label>
                    <input
                      type="text"
                      value={deliveryLocation}
                      onChange={(e) => {
                        setDeliveryLocation(e.target.value);
                        // Store immediately
                        if (typeof window !== "undefined") {
                          localStorage.setItem(`delivery-location-${productSlug}`, e.target.value);
                        }
                      }}
                      placeholder="Enter delivery location (e.g., France, Germany, etc.)"
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800 delivery-location-input text-[#303337] placeholder:text-gray-400"
                      style={{ color: '#303337' }}
                    />
                  </div>
                ) : undefined}
              />
            );
          })}
        </OptionSection>
      ) : (
        <OptionSection
          title={stepData.title}
          description={stepData.description}
          subheader={adminConfig?.globalSettings?.stepSubheaders?.[step]}
          subtext={stepData.subtext}
          moreInfoUrl={adminConfig?.globalSettings?.stepMoreInfoEnabled?.[step] 
            ? adminConfig?.globalSettings?.stepMoreInfoUrl?.[step] 
            : undefined}
        >
          {stepData.options.map((option) => {
            // Debug log for half-moon option
            if (option.id === "glass-half-moon") {
              console.log(`🖼️ Rendering half-moon option:`, {
                id: option.id,
                title: option.title,
                imageUrl: option.imageUrl,
                fullOption: option,
              });
            }
            
            // Determine product type for rear-glass-wall step
            const productName = config?.productName || "";
            const productId = config?.productId || "";
            const isCube = productSlug.toLowerCase().includes("cube") || 
                           productName.toLowerCase().includes("cube") ||
                           productId.toLowerCase().includes("cube");
            const isBarrel = productSlug.toLowerCase().includes("barrel") || 
                            productName.toLowerCase().includes("barrel") ||
                            productId.toLowerCase().includes("barrel");
            const productType = isCube ? "cube" : isBarrel ? "barrel" : undefined;
            
            // Calculate lighting price based on multiplier (e.g., "2x 2.5m LED" = 2x multiplier)
            // Supports formats: "2x 2.5m LED" or "Under Bench (2x 2.5m LED)"
            const lightingMultiplier = step === "lighting" ? (() => {
              // Extract multiplier from option title - try both formats:
              // 1. At the start: "2x 2.5m LED"
              // 2. In parentheses: "Under Bench (2x 2.5m LED)"
              const titleMatch = option.title.match(/(?:^|\()(\d+)x\s/i);
              return titleMatch ? parseInt(titleMatch[1], 10) : null;
            })() : null;
            
            // Find the base lighting option (1x version) for price calculation
            // Supports formats: "1x 2.5m LED" or "Under Bench (1x 2.5m LED)"
            const baseLightingOptionId = step === "lighting" && lightingMultiplier ? (() => {
              const baseOption = stepData.options.find(opt => {
                const baseTitle = opt.title.toLowerCase();
                // Match either format: starts with "1x" or contains "(1x" in parentheses
                const has1x = (baseTitle.startsWith("1 x") || baseTitle.startsWith("1x") || baseTitle.includes("(1x"));
                return has1x && baseTitle.includes("2.5m") && baseTitle.includes("led");
              });
              return baseOption?.id;
            })() : undefined;
            
            // Get pre-fetched price for base lighting option if multiplier is used
            const basePreFetchedPrice = baseLightingOptionId ? getPreFetchedPrice(baseLightingOptionId) : undefined;
            
            return (
              <OptionCard
                key={option.id}
                option={option}
                isSelected={selectedIds.includes(option.id)}
                selectionType={stepData.selectionType}
                onToggle={() => handleToggle(option.id)}
                stepId={step}
                productType={productType}
                lightingMultiplier={lightingMultiplier}
                baseLightingOptionId={baseLightingOptionId}
                preFetchedPrice={getPreFetchedPrice(option.id)}
                basePreFetchedPrice={basePreFetchedPrice}
              />
            );
          })}
        </OptionSection>
      )}
    </ConfiguratorLayout>
  );
}

