"use client";

import { useState, useEffect, useRef } from "react";
import { useAdminConfig } from "@/contexts/AdminConfigContext";
import { StepData, Option } from "@/types/configurator";
import { DesignConfig, QuoteSettings, DiscountCampaign, GlobalStepOptionConfig } from "@/types/admin";
import Link from "next/link";
import ImageUpload from "@/components/ImageUpload";
import PipedriveProductSelector from "@/components/PipedriveProductSelector";
import { defaultQuoteSettings } from "@/constants/defaultQuoteSettings";
import QuotePreview from "@/components/QuotePreview";
import DiscountCampaignEditor from "@/components/DiscountCampaignEditor";
import { getAllProducts } from "@/utils/productStorage";
import { stepDataMap } from "@/data";
import { collectAllStepsAndOptions, CollectedStep, CollectedOption } from "@/utils/collectAllOptions";

export default function AdminPage() {
  const { config, updateConfig, saveConfig, resetConfig, exportConfig, importConfig, isDirty, saveStatus } = useAdminConfig();
  const [activeTab, setActiveTab] = useState<string>("general");
  const [importJson, setImportJson] = useState("");
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [allCollectedSteps, setAllCollectedSteps] = useState<CollectedStep[]>([]);
  const [isLoadingGlobalOptions, setIsLoadingGlobalOptions] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [productConfigs, setProductConfigs] = useState<Record<string, { mainProductImageUrl?: string; mainProductPipedriveId?: number }>>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Clean up duplicate rear glass wall options on mount (only once)
  useEffect(() => {
    if (config && config.stepData && config.stepData["rear-glass-wall"]) {
      const defaultStepData = stepDataMap["rear-glass-wall"];
      if (defaultStepData) {
        const defaultOptionIds = new Set(defaultStepData.options.map(o => o.id));
        const currentOptions = config.stepData["rear-glass-wall"].options || [];
        const validOptions = currentOptions.filter(o => defaultOptionIds.has(o.id));
        
        // If there are invalid/duplicate options, clean them up
        if (validOptions.length !== currentOptions.length || validOptions.length !== defaultStepData.options.length) {
          // Reset to default options only
          const cleanedStepData = {
            ...config.stepData,
            "rear-glass-wall": {
              ...defaultStepData,
              options: [...defaultStepData.options], // Fresh copy
            },
          };
          updateConfig({
            stepData: cleanedStepData,
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Read tab from URL on mount and handle navigation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && ["general", "steps", "global", "design", "quote", "import-export"].includes(tab)) {
      setActiveTab(tab);
    }

    // Listen for popstate (back/forward buttons)
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab && ["general", "steps", "global", "design", "quote", "import-export"].includes(tab)) {
        setActiveTab(tab);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Load all collected steps and options when global tab is active
  useEffect(() => {
    if (activeTab === "global" && typeof window !== "undefined") {
      setIsLoadingGlobalOptions(true);
      collectAllStepsAndOptions()
        .then(({ steps }) => {
          setAllCollectedSteps(steps);
          setIsLoadingGlobalOptions(false);
        })
        .catch((error) => {
          console.error("Error collecting all options:", error);
          setIsLoadingGlobalOptions(false);
        });
    }
  }, [activeTab]);

  // Load all products and their configs when general tab is active
  useEffect(() => {
    if (activeTab === "general" && typeof window !== "undefined") {
      setIsLoadingProducts(true);
      const loadProducts = async () => {
        try {
          const productsList = await getAllProducts();
          setProducts(productsList);
          
          // Load configs for each product to get their main product images and Pipedrive IDs
          // Use cache-busting to ensure we get the latest data
          const configs: Record<string, { mainProductImageUrl?: string; mainProductPipedriveId?: number }> = {};
          await Promise.all(
            productsList.map(async (product) => {
              try {
                const response = await fetch(`/api/products/${product.id}/config?t=${Date.now()}`, {
                  cache: "no-store",
                });
                if (response.ok) {
                  const data = await response.json();
                  // API returns { config: {...} }
                  const config = data.config || data;
                  console.log(`📥 Loaded config for ${product.id} on tab switch:`, {
                    hasConfig: !!config,
                    mainImageUrl: config?.mainProductImageUrl,
                    mainPipedriveId: config?.mainProductPipedriveId,
                  });
                  configs[product.id] = { 
                    mainProductImageUrl: config?.mainProductImageUrl,
                    mainProductPipedriveId: config?.mainProductPipedriveId,
                  };
                } else if (response.status === 404) {
                  // Config doesn't exist yet, that's fine
                  console.log(`📝 No config found for ${product.id} (404)`);
                  configs[product.id] = { mainProductImageUrl: undefined, mainProductPipedriveId: undefined };
                } else {
                  console.warn(`⚠️ Failed to load config for ${product.id}: ${response.status}`);
                }
              } catch (error) {
                console.error(`❌ Error loading config for ${product.id}:`, error);
              }
            })
          );
          console.log(`✅ Loaded configs for ${Object.keys(configs).length} products:`, configs);
          setProductConfigs(configs);
          setIsLoadingProducts(false);
        } catch (error) {
          console.error("❌ Error loading products:", error);
          setIsLoadingProducts(false);
        }
      };
      loadProducts();
    }
  }, [activeTab]);


  const handleTabChange = (tabId: string) => {
    if (tabId && ["general", "steps", "global", "design", "quote", "import-export"].includes(tabId)) {
      setActiveTab(tabId);
      setExpandedStep(null); // Collapse any expanded steps when switching tabs
      // Update URL without full page reload
      if (typeof window !== "undefined") {
        window.history.pushState({}, "", `/admin?tab=${tabId}`);
      }
    }
  };


  if (!config) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600 mb-2">Loading configuration...</div>
          <div className="text-sm text-gray-500">If this persists, try refreshing the page.</div>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    saveConfig();
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset to default configuration? This will clear all your changes.")) {
      resetConfig();
    }
  };

  const handleExport = () => {
    exportConfig();
    alert("Configuration exported!");
  };

  const handleImport = () => {
    try {
      importConfig(importJson);
      setImportJson("");
      alert("Configuration imported successfully!");
    } catch {
      alert("Failed to import configuration. Please check the JSON format.");
    }
  };

  // Step Management
  const addStep = () => {
    const newStepId = `step-${Date.now()}`;
    const newStep = {
      id: newStepId,
      name: "New Step",
      route: `/configurator/${newStepId}`,
    };
    const newStepData: StepData = {
      stepId: newStepId,
      title: "New Step",
      description: "",
      selectionType: "single",
      required: true,
      options: [],
    };
    updateConfig({
      steps: [...config.steps, newStep],
      stepData: { ...config.stepData, [newStepId]: newStepData },
    });
  };

  const removeStep = (stepId: string) => {
    if (confirm(`Are you sure you want to remove "${config.steps.find(s => s.id === stepId)?.name}"?`)) {
      const newSteps = config.steps.filter((s) => s.id !== stepId);
      const newStepData = { ...config.stepData };
      delete newStepData[stepId];
      updateConfig({ steps: newSteps, stepData: newStepData });
    }
  };

  const moveStep = (stepId: string, direction: "up" | "down") => {
    const index = config.steps.findIndex((s) => s.id === stepId);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === config.steps.length - 1) return;

    const newSteps = [...config.steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    updateConfig({ steps: newSteps });
  };

  // Config update helpers
  const updateProductName = (name: string) => {
    updateConfig({ productName: name });
  };

  const updateMainImage = (url: string | null) => {
    updateConfig({ mainProductImageUrl: url });
  };

  const updateProductMainPipedriveId = async (productId: string, pipedriveId: number | undefined) => {
    try {
      console.log(`🔗 Updating main Pipedrive ID for ${productId}:`, pipedriveId);
      
      // Update local state immediately for UI responsiveness
      setProductConfigs((prev) => ({
        ...prev,
        [productId]: { 
          ...prev[productId],
          mainProductPipedriveId: pipedriveId,
        },
      }));

      // Get current config
      const getResponse = await fetch(`/api/products/${productId}/config?t=${Date.now()}`, {
        cache: "no-store",
      });
      let currentConfig = null;
      
      if (getResponse.ok) {
        const responseData = await getResponse.json();
        currentConfig = responseData.config;
      } else if (getResponse.status === 404) {
        currentConfig = null;
      } else {
        throw new Error(`Failed to load product config: ${getResponse.status}`);
      }
      
      // Update config
      // CRITICAL: Preserve ALL existing fields, especially mainProductImageUrl
      const updatedConfig = currentConfig 
        ? {
            ...currentConfig, // Preserve ALL existing fields
            mainProductPipedriveId: pipedriveId,
            // Explicitly preserve mainProductImageUrl if it exists
            ...(currentConfig.mainProductImageUrl !== undefined && {
              mainProductImageUrl: currentConfig.mainProductImageUrl,
            }),
          }
        : {
            productId: productId,
            mainProductPipedriveId: pipedriveId,
            steps: [],
            stepData: {},
            design: config?.design || undefined,
            quoteSettings: config?.quoteSettings || undefined,
          };

      // Save to server
      const saveResponse = await fetch(`/api/products/${productId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });

      if (!saveResponse.ok) {
        throw new Error(`Failed to save Pipedrive ID: ${saveResponse.status}`);
      }

      // Update localStorage
      try {
        const PRODUCT_CONFIG_PREFIX = "saunamo-product-config-";
        localStorage.setItem(
          `${PRODUCT_CONFIG_PREFIX}${productId}`,
          JSON.stringify(updatedConfig)
        );
      } catch (e) {
        console.warn("⚠️ Could not update localStorage:", e);
      }

      // Dispatch event
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("productConfigUpdated"));
      }

      console.log(`✅ Updated main Pipedrive ID for product ${productId}`);
    } catch (error) {
      console.error(`❌ Failed to update Pipedrive ID for ${productId}:`, error);
    }
  };

  const updateProductMainImage = async (productId: string, imageUrl: string | null) => {
    try {
      console.log(`🖼️ Updating main image for ${productId}:`, imageUrl);
      
      // Update local state immediately for UI responsiveness
      setProductConfigs((prev) => ({
        ...prev,
        [productId]: { mainProductImageUrl: imageUrl || undefined },
      }));

      // Save to server - need to get current config first, then update
      // Use cache-busting to ensure we get the latest data
      const getResponse = await fetch(`/api/products/${productId}/config?t=${Date.now()}`, {
        cache: "no-store",
      });
      let currentConfig = null;
      
      if (getResponse.ok) {
        const responseData = await getResponse.json();
        currentConfig = responseData.config;
      } else if (getResponse.status === 404) {
        // Config doesn't exist yet, that's fine - we'll create a new one
        console.log(`📝 No existing config for ${productId}, will create new one`);
        currentConfig = null;
      } else {
        const errorText = await getResponse.text();
        console.error(`❌ Failed to load product config: ${getResponse.status} ${errorText}`);
        throw new Error(`Failed to load product config: ${getResponse.status}`);
      }
      
      console.log(`📥 Loaded current config for ${productId}:`, {
        hasConfig: !!currentConfig,
        hasMainImage: !!currentConfig?.mainProductImageUrl,
        currentImage: currentConfig?.mainProductImageUrl,
        newImage: imageUrl,
      });
      
      // If no config exists, create a minimal one. Otherwise, update the existing one.
      // CRITICAL: Preserve ALL existing fields, especially mainProductPipedriveId
      const updatedConfig = currentConfig 
        ? {
            ...currentConfig, // Preserve ALL existing fields
            mainProductImageUrl: imageUrl || undefined,
            // Explicitly preserve mainProductPipedriveId if it exists
            ...(currentConfig.mainProductPipedriveId !== undefined && {
              mainProductPipedriveId: currentConfig.mainProductPipedriveId,
            }),
          }
        : {
            productId: productId,
            mainProductImageUrl: imageUrl || undefined,
            steps: [],
            stepData: {},
            design: config?.design || undefined,
            quoteSettings: config?.quoteSettings || undefined,
          };

      console.log(`💾 Saving updated config for ${productId} with image:`, updatedConfig.mainProductImageUrl);
      const saveResponse = await fetch(`/api/products/${productId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });

      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        console.error(`❌ Failed to save product image: ${saveResponse.status} ${errorText}`);
        throw new Error(`Failed to save product image: ${saveResponse.status}`);
      }

      const saveResult = await saveResponse.json();
      const savedImageUrl = saveResult.config?.mainProductImageUrl;
      console.log(`✅ Successfully saved config for ${productId}:`, {
        savedImage: savedImageUrl,
        expectedImage: imageUrl,
        matchesExpected: savedImageUrl === imageUrl,
        imageUrlLength: imageUrl?.length || 0,
        savedImageUrlLength: savedImageUrl?.length || 0,
      });
      
      // Log if there's a mismatch
      if (savedImageUrl !== imageUrl) {
        console.error(`❌ CRITICAL: Image URL mismatch after save!`, {
          expected: imageUrl,
          saved: savedImageUrl,
          productId: productId,
        });
      }

      // Wait a moment for the file system to flush, then verify the save worked by fetching it back
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const verifyResponse = await fetch(`/api/products/${productId}/config?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        const verifiedImageUrl = verifyData.config?.mainProductImageUrl;
        console.log(`🔍 Verification: Fetched back config for ${productId}:`, {
          verifiedImage: verifiedImageUrl,
          matchesSaved: verifiedImageUrl === savedImageUrl,
          matchesExpected: verifiedImageUrl === imageUrl,
        });
        
        if (verifiedImageUrl !== imageUrl) {
          console.error(`❌ VERIFICATION FAILED: Saved image (${savedImageUrl}) does not match expected (${imageUrl})`);
          console.error(`❌ This means the save did not persist correctly. Retrying save...`);
          
          // Retry the save one more time
          const retryResponse = await fetch(`/api/products/${productId}/config`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedConfig),
          });
          
          if (retryResponse.ok) {
            const retryResult = await retryResponse.json();
            console.log(`🔄 Retry save result:`, retryResult.config?.mainProductImageUrl);
            
            // Wait and verify again
            await new Promise(resolve => setTimeout(resolve, 200));
            const retryVerifyResponse = await fetch(`/api/products/${productId}/config?t=${Date.now()}`, {
              cache: "no-store",
            });
            if (retryVerifyResponse.ok) {
              const retryVerifyData = await retryVerifyResponse.json();
              const retryVerifiedImageUrl = retryVerifyData.config?.mainProductImageUrl;
              if (retryVerifiedImageUrl !== imageUrl) {
                throw new Error(`Image save failed after retry. Expected: ${imageUrl}, Got: ${retryVerifiedImageUrl}`);
              }
              console.log(`✅ Retry save verified successfully`);
            }
          } else {
            throw new Error("Image save verification failed and retry also failed");
          }
        } else {
          console.log(`✅ Verification passed - image was saved correctly`);
        }
      } else {
        console.warn(`⚠️ Could not verify save for ${productId}: ${verifyResponse.status}`);
      }

      // Update localStorage to trigger storage event (for cross-tab updates)
      try {
        const PRODUCT_CONFIG_PREFIX = "saunamo-product-config-";
        localStorage.setItem(
          `${PRODUCT_CONFIG_PREFIX}${productId}`,
          JSON.stringify(updatedConfig)
        );
        console.log(`✅ Updated localStorage for product ${productId}`);
      } catch (e) {
        console.warn("⚠️ Could not update localStorage:", e);
      }

      // Dispatch custom event for same-tab updates (configurator listens for this)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("productConfigUpdated"));
        console.log(`✅ Dispatched productConfigUpdated event for ${productId}`);
      }

      console.log(`✅ Updated main image for product ${productId}`);
    } catch (error) {
      console.error(`❌ Failed to update product image for ${productId}:`, error);
      // Revert on error
      try {
        const response = await fetch(`/api/products/${productId}/config`);
        if (response.ok) {
          const { config } = await response.json();
          setProductConfigs((prev) => ({
            ...prev,
            [productId]: { mainProductImageUrl: config.mainProductImageUrl },
          }));
        }
      } catch (revertError) {
        console.error("Failed to revert:", revertError);
      }
    }
  };

  const updateStep = (stepId: string, updates: Partial<StepData>) => {
    const stepData = { ...config.stepData[stepId], ...updates };
    updateConfig({
      stepData: { ...config.stepData, [stepId]: stepData },
    });
  };

  const updateStepName = (stepId: string, name: string) => {
    const steps = config.steps.map((step) =>
      step.id === stepId ? { ...step, name } : step
    );
    updateConfig({ steps });
  };

  const updateStepRoute = (stepId: string, route: string) => {
    const steps = config.steps.map((step) =>
      step.id === stepId ? { ...step, route } : step
    );
    updateConfig({ steps });
  };

  const updateOption = (stepId: string, optionId: string, updates: Partial<Option>) => {
    const stepData = config.stepData[stepId];
    const options = stepData.options.map((opt) =>
      opt.id === optionId ? { ...opt, ...updates } : opt
    );
    updateStep(stepId, { options });
  };

  const addOption = (stepId: string) => {
    const stepData = config.stepData[stepId];
    const newOption: Option = {
      id: `option-${Date.now()}`,
      title: "New Option",
      description: "",
      imageUrl: "",
      price: 0,
    };
    updateStep(stepId, { options: [...stepData.options, newOption] });
  };

  const removeOption = (stepId: string, optionId: string) => {
    const stepData = config.stepData[stepId];
    updateStep(stepId, {
      options: stepData.options.filter((opt) => opt.id !== optionId),
    });
  };

  const updateDesign = (updates: Partial<DesignConfig>) => {
    updateConfig({
      design: { ...config.design, ...updates },
    });
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-[#faf9f7]"
      style={{ position: "relative", zIndex: 1, pointerEvents: "auto" }}
    >
      {/* Global Settings Indicator Banner */}
      <div className="bg-blue-800 text-white sticky top-0 z-20 shadow-md">
        <div className="max-w-7xl mx-auto px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium opacity-90">Global Settings</span>
              <span className="text-xs opacity-75">(Applies to all products)</span>
            </div>
            <Link
              href="/admin/products"
              className="text-sm font-medium hover:underline opacity-90 hover:opacity-100"
            >
              Configure Individual Products →
            </Link>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-[52px] z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Configuration</h1>
              <p className="text-sm text-gray-600">
                Manage your configurator settings • Changes auto-save to browser storage
              </p>
            </div>
            <div className="flex items-center gap-4">
              {saveStatus === "saving" && (
                <span className="text-sm text-blue-600 font-medium">● Saving...</span>
              )}
              {saveStatus === "saved" && (
                <span className="text-sm text-green-600 font-medium">✓ Saved</span>
              )}
              {!saveStatus && isDirty && (
                <span className="text-sm text-orange-600 font-medium">● Unsaved changes</span>
              )}
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSave();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                className="px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer bg-green-800 text-white hover:bg-green-900"
                style={{ userSelect: "none", pointerEvents: "auto" }}
              >
                Save Now
              </div>
              <Link
                href="/admin/products"
                className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Manage Products
              </Link>
              <Link
                href="/configurator/rear-glass-wall"
                className="px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
              >
                View Configurator
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8" style={{ position: "relative", zIndex: 1 }}>
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6" style={{ position: "relative", zIndex: 10 }}>
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {[
              { id: "general", label: "General" },
              { id: "steps", label: "Steps & Options" },
              { id: "global", label: "Global Settings" },
              { id: "design", label: "Design" },
              { id: "quote", label: "Quote Settings" },
              { id: "import-export", label: "Import/Export" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTabChange(tab.id);
                  }}
                  style={{ 
                    position: "relative",
                    zIndex: 1000,
                    cursor: "pointer",
                    pointerEvents: "auto !important",
                    userSelect: "none",
                    border: "none",
                    background: "transparent",
                    width: "100%",
                    textAlign: "left"
                  }}
                  className={`px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-green-800 text-green-800"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.label} {isActive && "✓"}
                </button>
              );
            })}
          </div>
        </div>

        {/* General Tab */}
        {activeTab === "general" && (
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Product Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={config.productName}
                    onChange={(e) => updateProductName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800"
                  />
                </div>
                <div>
                  <ImageUpload
                    label="Main Product Image"
                    value={config.mainProductImageUrl || ""}
                    onChange={updateMainImage}
                    placeholder="Enter URL or click Upload to select from computer"
                  />
                </div>
              </div>
            </div>

            {/* Product Main Images Management */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Product Main Images</h2>
              <p className="text-sm text-gray-600 mb-4">
                Manage the main product image for each product. This image appears on the left side of the configurator.
              </p>
              
              {isLoadingProducts ? (
                <div className="text-center py-8 text-gray-500">Loading products...</div>
              ) : products.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No products found</div>
              ) : (
                <div className="space-y-6">
                  {products.map((product) => {
                    const currentImageUrl = productConfigs[product.id]?.mainProductImageUrl || "";
                    const currentPipedriveId = productConfigs[product.id]?.mainProductPipedriveId;
                    return (
                      <div
                        key={product.id}
                        className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                      >
                        <div className="flex items-start gap-4">
                          {/* Product Info */}
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                            <p className="text-sm text-gray-500 mb-3">ID: {product.id}</p>
                            
                            {/* Image Upload */}
                            <div className="mt-3 mb-4">
                              <ImageUpload
                                label="Main Product Image"
                                value={currentImageUrl}
                                onChange={(url) => updateProductMainImage(product.id, url)}
                                placeholder="Enter URL or click Upload to select from computer"
                              />
                            </div>

                            {/* Pipedrive Product Link */}
                            <div className="mt-3">
                              <PipedriveProductSelector
                                value={currentPipedriveId}
                                onChange={(productId) => updateProductMainPipedriveId(product.id, productId)}
                              />
                            </div>
                          </div>
                          
                          {/* Image Preview */}
                          {currentImageUrl && (
                            <div className="flex-shrink-0">
                              <div className="w-32 h-32 border border-gray-300 rounded-lg overflow-hidden bg-white">
                                <img
                                  src={currentImageUrl}
                                  alt={`${product.name} preview`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    console.error(`❌ Failed to load image for ${product.name}`);
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1 text-center">Preview</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Price Source Configuration</h2>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Pipedrive Integration:</strong> Prices are synced from your Pipedrive product catalog. 
                    Select products from Pipedrive for each option in the Steps & Options tab.
                  </p>
                </div>
              </div>
            </div>

            {/* Discount Campaigns */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Discount Campaigns</h2>
              <p className="text-sm text-gray-600 mb-4">
                Create discount campaigns that apply to all products or specific products in your configurator.
              </p>
              
              <div className="space-y-4 mb-4">
                {(config.quoteSettings?.discountCampaigns || []).map((campaign, index) => {
                  if (editingCampaign === campaign.id) {
                    // Get all products from the product list
                    const allProducts = getAllProducts();

                    return (
                      <DiscountCampaignEditor
                        key={campaign.id}
                        campaign={campaign}
                        onSave={(updatedCampaign) => {
                          if (!config.quoteSettings) return;
                          const campaigns = [...(config.quoteSettings.discountCampaigns || [])];
                          campaigns[index] = updatedCampaign;
                          updateConfig({
                            quoteSettings: { ...config.quoteSettings, discountCampaigns: campaigns },
                          });
                          setEditingCampaign(null);
                        }}
                        onCancel={() => setEditingCampaign(null)}
                        allOptions={[]}
                        allProducts={allProducts}
                      />
                    );
                  }

                  return (
                    <div key={campaign.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{campaign.name}</h4>
                            <span className={`px-2 py-1 text-xs rounded ${
                              campaign.isActive 
                                ? "bg-green-100 text-green-800" 
                                : "bg-gray-100 text-gray-600"
                            }`}>
                              {campaign.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          {campaign.description && (
                            <p className="text-sm text-gray-600 mb-2">{campaign.description}</p>
                          )}
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">
                              {campaign.discountType === "percentage" 
                                ? `${campaign.discountValue}% off`
                                : `$${campaign.discountValue.toFixed(2)} off`}
                            </span>
                            {" • "}
                            <span>
                              Applies to: {campaign.appliesTo === "all" ? "All Products" : "Specific Products"}
                            </span>
                            {campaign.appliesTo === "specific" && campaign.productIds && campaign.productIds.length > 0 && (
                              <span className="text-gray-600">
                                {" • "}
                                {campaign.productIds.length} product{campaign.productIds.length !== 1 ? "s" : ""} selected
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingCampaign(campaign.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const campaigns = [...(config.quoteSettings?.discountCampaigns || [])];
                              campaigns.splice(index, 1);
                              updateConfig({
                                quoteSettings: { ...config.quoteSettings!, discountCampaigns: campaigns },
                              });
                            }}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const campaigns = [...(config.quoteSettings?.discountCampaigns || [])];
                          campaigns[index] = { ...campaign, isActive: !campaign.isActive };
                          updateConfig({
                            quoteSettings: { ...config.quoteSettings!, discountCampaigns: campaigns },
                          });
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {campaign.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  );
                })}
              </div>
              
              <button
                type="button"
                onClick={() => {
                  if (!config.quoteSettings) {
                    updateConfig({ quoteSettings: { ...defaultQuoteSettings } });
                  }
                  const quoteSettings = config.quoteSettings || defaultQuoteSettings;
                  const newCampaign: DiscountCampaign = {
                    id: `campaign-${Date.now()}`,
                    name: "New Campaign",
                    description: "",
                    discountType: "percentage",
                    discountValue: 10,
                    appliesTo: "all",
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  const campaigns = [...(quoteSettings.discountCampaigns || []), newCampaign];
                  updateConfig({
                    quoteSettings: { ...quoteSettings, discountCampaigns: campaigns },
                  });
                }}
                className="px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-900 font-medium text-sm"
              >
                + Add Discount Campaign
              </button>
            </div>
          </div>
        )}

        {/* Steps Tab */}
        {activeTab === "steps" && (
          <div className="space-y-4">
            {/* Step Management Header */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Step Management</h2>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addStep();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      addStep();
                    }
                  }}
                  className="px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-900 font-medium cursor-pointer"
                  style={{ userSelect: "none" }}
                >
                  + Add Step
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Total Steps: {config.steps.length} | Drag to reorder or use arrows
              </p>
            </div>

            {/* Steps List */}
            {config.steps.map((step, index) => {
              const stepData = config.stepData[step.id];
              const isExpanded = expandedStep === step.id;

              return (
                <div key={step.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {/* Step Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex flex-col gap-1">
                          <div
                            role="button"
                            tabIndex={index === 0 ? -1 : 0}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (index > 0) moveStep(step.id, "up");
                            }}
                            className={`p-1 cursor-pointer ${index === 0 ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:text-gray-900"}`}
                            style={{ userSelect: "none", pointerEvents: index === 0 ? "none" : "auto" }}
                          >
                            ↑
                          </div>
                          <div
                            role="button"
                            tabIndex={index === config.steps.length - 1 ? -1 : 0}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (index < config.steps.length - 1) moveStep(step.id, "down");
                            }}
                            className={`p-1 cursor-pointer ${index === config.steps.length - 1 ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:text-gray-900"}`}
                            style={{ userSelect: "none", pointerEvents: index === config.steps.length - 1 ? "none" : "auto" }}
                          >
                            ↓
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{step.name}</div>
                          <div className="text-sm text-gray-500">{step.route}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setExpandedStep(isExpanded ? null : step.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setExpandedStep(isExpanded ? null : step.id);
                            }
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
                          style={{ userSelect: "none" }}
                        >
                          {isExpanded ? "Collapse" : "Expand"}
                        </div>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeStep(step.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              removeStep(step.id);
                            }
                          }}
                          className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 cursor-pointer"
                          style={{ userSelect: "none" }}
                        >
                          Remove
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step Details (Collapsible) */}
                  {isExpanded && stepData && (
                    <div className="p-6 space-y-6 border-t border-gray-200">
                      {/* Step Basic Info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Step Name (shown in stepper)
                          </label>
                          <input
                            type="text"
                            value={step.name}
                            onChange={(e) => updateStepName(step.id, e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Route (URL path)
                          </label>
                          <input
                            type="text"
                            value={step.route}
                            onChange={(e) => updateStepRoute(step.id, e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Step Title
                          </label>
                          <input
                            type="text"
                            value={stepData.title}
                            onChange={(e) => updateStep(step.id, { title: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Selection Type
                          </label>
                          <select
                            value={stepData.selectionType}
                            onChange={(e) =>
                              updateStep(step.id, {
                                selectionType: e.target.value as "single" | "multi",
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800"
                          >
                            <option value="single">Single Select</option>
                            <option value="multi">Multi Select</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Step Description
                        </label>
                        <textarea
                          value={stepData.description || ""}
                          onChange={(e) => updateStep(step.id, { description: e.target.value })}
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800"
                          placeholder="Description shown above the options"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Subtext (Below Options)
                        </label>
                        <textarea
                          value={stepData.subtext || ""}
                          onChange={(e) => updateStep(step.id, { subtext: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800"
                          placeholder="Additional text displayed below the options list"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          This text will appear below all options in this step
                        </p>
                      </div>

                      <div>
                        <ImageUpload
                          label="Step Image"
                          value={stepData.imageUrl || ""}
                          onChange={(url) => updateStep(step.id, { imageUrl: url })}
                          placeholder="Enter URL or click Upload to select from computer"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          This image will be displayed in the configurator for this step
                        </p>
                      </div>

                      <div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={stepData.required}
                            onChange={(e) => updateStep(step.id, { required: e.target.checked })}
                            className="w-4 h-4 text-green-800 border-gray-300 rounded focus:ring-green-800"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Required (user must select an option to proceed)
                          </span>
                        </label>
                      </div>

                      {/* Options */}
                      <div className="border-t border-gray-200 pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">Options ({stepData.options.length})</h3>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              addOption(step.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                addOption(step.id);
                              }
                            }}
                            className="px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-900 text-sm font-medium cursor-pointer"
                            style={{ userSelect: "none" }}
                          >
                            + Add Option
                          </div>
                        </div>

                        <div className="space-y-4">
                          {stepData.options.map((option) => (
                            <div
                              key={option.id}
                              className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50"
                            >
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Option Title
                                  </label>
                                  <input
                                    type="text"
                                    value={option.title}
                                    onChange={(e) =>
                                      updateOption(step.id, option.id, { title: e.target.value })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Price ($)
                                  </label>
                                  <div className="flex gap-2">
                                    <input
                                      type="number"
                                      value={option.price}
                                      onChange={(e) =>
                                        updateOption(step.id, option.id, {
                                          price: parseFloat(e.target.value) || 0,
                                        })
                                      }
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                              <div>
                                <PipedriveProductSelector
                                  value={option.pipedriveProductId}
                                  onChange={(productId, product) => {
                                    updateOption(step.id, option.id, {
                                      pipedriveProductId: productId,
                                      // Auto-update price if product is selected
                                      ...(product && { price: product.price }),
                                    });
                                  }}
                                  onPriceUpdate={(price) => {
                                    updateOption(step.id, option.id, { price });
                                  }}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Select a product from your Pipedrive catalog. Price will sync automatically when generating quotes.
                                </p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Description
                                </label>
                                <textarea
                                  value={option.description}
                                  onChange={(e) =>
                                    updateOption(step.id, option.id, { description: e.target.value })
                                  }
                                  rows={2}
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                                />
                              </div>
                              <div>
                                <ImageUpload
                                  label="Option Image"
                                  value={option.imageUrl}
                                  onChange={(url) => updateOption(step.id, option.id, { imageUrl: url })}
                                  placeholder="Enter URL or click Upload to select from computer"
                                />
                              </div>
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeOption(step.id, option.id);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    removeOption(step.id, option.id);
                                  }
                                }}
                                className="text-sm text-red-600 hover:text-red-800 font-medium cursor-pointer"
                                style={{ userSelect: "none" }}
                              >
                                Remove Option
                              </div>
                            </div>
                          ))}
                          {stepData.options.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              No options yet. Click &quot;+ Add Option&quot; to get started.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Design Tab */}
        {activeTab === "design" && (
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-8">
            <h2 className="text-xl font-bold text-gray-900">Design Configuration</h2>
            
            {/* Colors */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Colors</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Background Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={config.design.backgroundColor}
                      onChange={(e) => updateDesign({ backgroundColor: e.target.value })}
                      className="w-16 h-10 rounded border"
                    />
                    <input
                      type="text"
                      value={config.design.backgroundColor}
                      onChange={(e) => updateDesign({ backgroundColor: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={config.design.textColor}
                      onChange={(e) => updateDesign({ textColor: e.target.value })}
                      className="w-16 h-10 rounded border"
                    />
                    <input
                      type="text"
                      value={config.design.textColor}
                      onChange={(e) => updateDesign({ textColor: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Accent Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={config.design.accentColor}
                      onChange={(e) => updateDesign({ accentColor: e.target.value })}
                      className="w-16 h-10 rounded border"
                    />
                    <input
                      type="text"
                      value={config.design.accentColor}
                      onChange={(e) => updateDesign({ accentColor: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Background
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={config.design.cardBackgroundColor}
                      onChange={(e) => updateDesign({ cardBackgroundColor: e.target.value })}
                      className="w-16 h-10 rounded border"
                    />
                    <input
                      type="text"
                      value={config.design.cardBackgroundColor}
                      onChange={(e) => updateDesign({ cardBackgroundColor: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Typography */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Typography</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Font Family
                  </label>
                  <input
                    type="text"
                    value={config.design.fontFamily}
                    onChange={(e) => updateDesign({ fontFamily: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Heading Font Size
                  </label>
                  <input
                    type="text"
                    value={config.design.headingFontSize}
                    onChange={(e) => updateDesign({ headingFontSize: e.target.value })}
                    placeholder="1.875rem"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Body Font Size
                  </label>
                  <input
                    type="text"
                    value={config.design.bodyFontSize}
                    onChange={(e) => updateDesign({ bodyFontSize: e.target.value })}
                    placeholder="1rem"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800"
                  />
                </div>
              </div>
            </div>

            {/* Spacing */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Spacing & Layout</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Padding
                  </label>
                  <input
                    type="text"
                    value={config.design.cardPadding}
                    onChange={(e) => updateDesign({ cardPadding: e.target.value })}
                    placeholder="1.5rem"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Section Spacing
                  </label>
                  <input
                    type="text"
                    value={config.design.sectionSpacing}
                    onChange={(e) => updateDesign({ sectionSpacing: e.target.value })}
                    placeholder="2rem"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Border Radius
                  </label>
                  <input
                    type="text"
                    value={config.design.borderRadius}
                    onChange={(e) => updateDesign({ borderRadius: e.target.value })}
                    placeholder="0.5rem"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image Width (%)
                  </label>
                  <input
                    type="text"
                    value={config.design.imageWidth}
                    onChange={(e) => updateDesign({ imageWidth: e.target.value })}
                    placeholder="70%"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Panel Width (%)
                  </label>
                  <input
                    type="text"
                    value={config.design.panelWidth}
                    onChange={(e) => updateDesign({ panelWidth: e.target.value })}
                    placeholder="30%"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Settings Tab */}
        {activeTab === "global" && (
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Global Step & Option Settings</h2>
              <p className="text-sm text-gray-600 mb-6">
                Configure step names, images, titles, and Pipedrive product links for ALL steps and options found across all products.
                These settings will be applied globally to all product configurators. Product-specific settings will override global settings.
              </p>
              
              {isLoadingGlobalOptions ? (
                <div className="text-center py-8">
                  <div className="text-gray-600">Loading all steps and options from products...</div>
                </div>
              ) : (
                <div className="space-y-6">
                  {allCollectedSteps.length === 0 ? (
                    <div className="text-center py-8 text-gray-600">
                      No steps found. Make sure you have products configured.
                    </div>
                  ) : (
                    allCollectedSteps.map((collectedStep, stepIndex) => {
                      const globalSettings = config.globalSettings || {};
                      const stepNumber = stepIndex + 1;
                      
                      // Determine product scope
                      const getStepProductScope = (stepId: string): string => {
                        if (stepId === "rear-glass-wall") {
                          return "Cube & Barrel models";
                        }
                        return "All products";
                      };
                      
                      const productScope = getStepProductScope(collectedStep.stepId);
                      
                      return (
                        <div key={collectedStep.stepId} className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50">
                          {/* Step Header */}
                          <div className="mb-6 pb-4 border-b border-gray-300">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-800 text-white font-bold text-sm">
                                  {stepNumber}
                                </span>
                                <h3 className="text-xl font-bold text-gray-900">{collectedStep.stepTitle}</h3>
                              </div>
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                {productScope}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 ml-11">
                              Step ID: <span className="font-mono text-xs text-gray-500">{collectedStep.stepId}</span>
                            </p>
                          </div>

                          {/* Step Name Setting */}
                          <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Step Name
                            </label>
                            <input
                              type="text"
                              value={globalSettings.stepNames?.[collectedStep.stepId] || collectedStep.stepTitle}
                              onChange={(e) => {
                                const currentGlobal = config.globalSettings || {};
                                const currentStepNames = currentGlobal.stepNames || {};
                                updateConfig({
                                  globalSettings: {
                                    ...currentGlobal,
                                    stepNames: {
                                      ...currentStepNames,
                                      [collectedStep.stepId]: e.target.value,
                                    },
                                  },
                                });
                              }}
                              placeholder={collectedStep.stepTitle}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              This name will be used in the stepper navigation for all products.
                            </p>
                          </div>

                          {/* Step Subheader Setting */}
                          <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Step Subheader (Optional)
                            </label>
                            <input
                              type="text"
                              value={globalSettings.stepSubheaders?.[collectedStep.stepId] || ""}
                              onChange={(e) => {
                                const currentGlobal = config.globalSettings || {};
                                const currentStepSubheaders = currentGlobal.stepSubheaders || {};
                                updateConfig({
                                  globalSettings: {
                                    ...currentGlobal,
                                    stepSubheaders: {
                                      ...currentStepSubheaders,
                                      [collectedStep.stepId]: e.target.value,
                                    },
                                  },
                                });
                              }}
                              placeholder="Enter subheader text (e.g., 'Choose your preferred option')"
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Optional text displayed below the step title.
                            </p>
                          </div>

                          {/* Step Image Setting */}
                          <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Step Image
                            </label>
                            <ImageUpload
                              label=""
                              value={globalSettings.stepImages?.[collectedStep.stepId] || ""}
                              onChange={(url) => {
                                const currentGlobal = config.globalSettings || {};
                                const currentStepImages = currentGlobal.stepImages || {};
                                updateConfig({
                                  globalSettings: {
                                    ...currentGlobal,
                                    stepImages: {
                                      ...currentStepImages,
                                      [collectedStep.stepId]: url,
                                    },
                                  },
                                });
                              }}
                              placeholder={`Upload image for ${collectedStep.stepTitle} step`}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Main image displayed for this step across all products.
                            </p>
                          </div>

                          {/* Option Settings */}
                          {collectedStep.options.length > 0 && (
                            <>
                              <div className="mb-4">
                                <h4 className="text-lg font-semibold text-gray-900 mb-2">Option Settings</h4>
                                <p className="text-sm text-gray-600">
                                  Configure images, titles, and Pipedrive product links for each option in this step.
                                </p>
                                {collectedStep.stepId === "rear-glass-wall" && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    Note: Rear glass wall options have separate Cube and Barrel configurations below.
                                  </p>
                                )}
                                
                                {/* More Information Button Settings */}
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                  <label className="flex items-center gap-2 mb-3">
                                    <input
                                      type="checkbox"
                                      checked={config?.globalSettings?.stepMoreInfoEnabled?.[collectedStep.stepId] ?? false}
                                      onChange={(e) => {
                                        if (!config) return;
                                        const currentGlobal = config.globalSettings || {};
                                        const currentMoreInfoEnabled = currentGlobal.stepMoreInfoEnabled || {};
                                        updateConfig({
                                          globalSettings: {
                                            stepNames: currentGlobal.stepNames || {},
                                            stepSubheaders: currentGlobal.stepSubheaders || {},
                                            stepImages: currentGlobal.stepImages || {},
                                            optionImages: currentGlobal.optionImages || {},
                                            optionTitles: currentGlobal.optionTitles || {},
                                            optionPipedriveProducts: currentGlobal.optionPipedriveProducts || {},
                                            optionIncluded: currentGlobal.optionIncluded || {},
                                            stepMoreInfoEnabled: {
                                              ...currentMoreInfoEnabled,
                                              [collectedStep.stepId]: e.target.checked,
                                            },
                                            stepMoreInfoUrl: currentGlobal.stepMoreInfoUrl || {},
                                          },
                                        });
                                      }}
                                      className="w-4 h-4 text-[#303337] border-gray-300 rounded focus:ring-[#303337]"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Show "More information" button</span>
                                  </label>
                                  {config?.globalSettings?.stepMoreInfoEnabled?.[collectedStep.stepId] && (
                                    <div className="mt-2">
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        More Information URL
                                      </label>
                                      <input
                                        type="url"
                                        value={config?.globalSettings?.stepMoreInfoUrl?.[collectedStep.stepId] || ""}
                                        onChange={(e) => {
                                          if (!config) return;
                                          const currentGlobal = config.globalSettings || {};
                                          const currentMoreInfoUrl = currentGlobal.stepMoreInfoUrl || {};
                                          updateConfig({
                                            globalSettings: {
                                              stepNames: currentGlobal.stepNames || {},
                                              stepSubheaders: currentGlobal.stepSubheaders || {},
                                              stepImages: currentGlobal.stepImages || {},
                                              optionImages: currentGlobal.optionImages || {},
                                              optionTitles: currentGlobal.optionTitles || {},
                                              optionPipedriveProducts: currentGlobal.optionPipedriveProducts || {},
                                              optionIncluded: currentGlobal.optionIncluded || {},
                                              stepMoreInfoEnabled: currentGlobal.stepMoreInfoEnabled || {},
                                              stepMoreInfoUrl: {
                                                ...currentMoreInfoUrl,
                                                [collectedStep.stepId]: e.target.value,
                                              },
                                            },
                                          });
                                        }}
                                        placeholder="https://example.com/more-info"
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#303337] focus:border-[#303337] text-sm"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Special handling for rear-glass-wall */}
                              {collectedStep.stepId === "rear-glass-wall" ? (
                                <div className="space-y-6">
                                  {/* Cube Models Section */}
                                  <div className="border-2 border-blue-300 rounded-lg p-5 bg-blue-50">
                                    <div className="flex items-center gap-2 mb-4">
                                      <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold">
                                        CUBE MODELS
                                      </span>
                                      <h5 className="text-base font-semibold text-gray-900">Cube Model Settings</h5>
                                    </div>
                                    <p className="text-xs text-gray-600 mb-4">
                                      Configure images and Pipedrive products for Cube models (Cube 125, Cube 220, Cube 300).
                                    </p>
                                    <div className="space-y-4">
                                      {collectedStep.options
                                        .filter((option) => {
                                          // Cube models: Only show wooden backwall and half moon
                                          return option.optionId === "wooden-backwall" || option.optionId === "glass-half-moon";
                                        })
                                        .map((option) => {
                                          const cubeImageKey = `cube_${option.optionId}`;
                                          const cubePipedriveKey = `cube_${option.optionId}`;
                                          const cubeTitleKey = `cube_${option.optionId}`;
                                          const globalImageUrl = globalSettings.optionImages?.[cubeImageKey] || "";
                                          const globalTitle = globalSettings.optionTitles?.[cubeTitleKey] || option.optionTitle;
                                          
                                          // Determine actual image URL
                                          let actualImageUrl = globalImageUrl;
                                          if (!actualImageUrl) {
                                            if (option.optionId === "wooden-backwall") {
                                              actualImageUrl = "/cube-full-back-wall.jpg";
                                            } else if (option.optionId === "glass-half-moon") {
                                              actualImageUrl = "/cube-back-moon.jpg";
                                            } else {
                                              actualImageUrl = option.defaultImageUrl || "";
                                            }
                                          }
                                          
                                          const pipedriveProductId = globalSettings.optionPipedriveProducts?.[cubePipedriveKey];
                                          const isIncluded = globalSettings.optionIncluded?.[`cube_${option.optionId}`] ?? false;

                                          return (
                                            <div key={`cube-${option.optionId}`} className="border border-blue-200 rounded-lg p-4 bg-white">
                                              <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Option Title
                                                  </label>
                                                  <input
                                                    type="text"
                                                    value={globalTitle}
                                                    onChange={(e) => {
                                                      if (!config) return;
                                                      const currentGlobal = config.globalSettings || {};
                                                      const currentOptionTitles = currentGlobal.optionTitles || {};
                                                      updateConfig({
                                                        globalSettings: {
                                                          stepNames: currentGlobal.stepNames || {},
                                                          stepSubheaders: currentGlobal.stepSubheaders || {},
                                                          stepImages: currentGlobal.stepImages || {},
                                                          optionImages: currentGlobal.optionImages || {},
                                                          optionTitles: {
                                                            ...currentOptionTitles,
                                                            [cubeTitleKey]: e.target.value,
                                                          },
                                                          optionPipedriveProducts: currentGlobal.optionPipedriveProducts || {},
                                                          optionIncluded: currentGlobal.optionIncluded || {},
                                                        },
                                                      });
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm font-semibold mb-1"
                                                  />
                                                  <p className="text-xs text-gray-500">{option.optionDescription}</p>
                                                </div>
                                                <div className="flex-shrink-0 ml-4">
                                                  <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                      type="checkbox"
                                                      checked={isIncluded}
                                                      onChange={(e) => {
                                                        if (!config) return;
                                                        const currentGlobal = config.globalSettings || {};
                                                        const currentOptionIncluded = currentGlobal.optionIncluded || {};
                                                        const key = `cube_${option.optionId}`;
                                                        console.log(`[Admin] Saving included status for cube option: ${key} = ${e.target.checked}`);
                                                        updateConfig({
                                                          globalSettings: {
                                                            stepNames: currentGlobal.stepNames || {},
                                                            stepSubheaders: currentGlobal.stepSubheaders || {},
                                                            stepImages: currentGlobal.stepImages || {},
                                                            optionImages: currentGlobal.optionImages || {},
                                                            optionTitles: currentGlobal.optionTitles || {},
                                                            optionPipedriveProducts: currentGlobal.optionPipedriveProducts || {},
                                                            optionIncluded: {
                                                              ...currentOptionIncluded,
                                                              [key]: e.target.checked,
                                                            },
                                                          },
                                                        });
                                                      }}
                                                      className="w-4 h-4 text-[#303337] border-gray-300 rounded focus:ring-[#303337]"
                                                    />
                                                    <span className="text-xs font-medium text-gray-700">Included</span>
                                                  </label>
                                                </div>
                                              </div>

                                              <div className="flex items-start gap-4">
                                                <div className="flex-1">
                                                  <label className="block text-xs font-medium text-gray-700 mb-2">
                                                    Cube Image
                                                  </label>
                                                  <div className="flex gap-3 items-start">
                                                    <div className="flex-1">
                                                      <ImageUpload
                                                        label=""
                                                        value={globalImageUrl}
                                                        onChange={(url) => {
                                                          const currentGlobal = config.globalSettings || {};
                                                          const currentOptionImages = currentGlobal.optionImages || {};
                                                          updateConfig({
                                                            globalSettings: {
                                                              ...currentGlobal,
                                                              optionImages: {
                                                                ...currentOptionImages,
                                                                [cubeImageKey]: url,
                                                              },
                                                            },
                                                          });
                                                        }}
                                                        placeholder={`Upload cube image for ${globalTitle}`}
                                                      />
                                                    </div>
                                                    {actualImageUrl && (
                                                      <div className="flex-shrink-0">
                                                        <div className="w-24 h-24 border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100">
                                                          <img
                                                            src={actualImageUrl}
                                                            alt={`${globalTitle} preview (Cube)`}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                              (e.target as HTMLImageElement).style.display = "none";
                                                            }}
                                                          />
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1 text-center">
                                                          {globalImageUrl ? "Current" : "Default"}
                                                        </p>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>

                                                <div className="flex-1">
                                                  <label className="block text-xs font-medium text-gray-700 mb-2">
                                                    Pipedrive Product (Cube)
                                                  </label>
                                                  <PipedriveProductSelector
                                                    value={pipedriveProductId}
                                                    onChange={(productId) => {
                                                      if (!config) return;
                                                      const currentGlobal = config.globalSettings || {};
                                                      const currentPipedriveProducts = currentGlobal.optionPipedriveProducts || {};
                                                      const updatedPipedriveProducts = { ...currentPipedriveProducts };
                                                      if (productId) {
                                                        updatedPipedriveProducts[cubePipedriveKey] = productId;
                                                        console.log(`[Admin] Saving Pipedrive product for cube option: ${cubePipedriveKey} = ${productId}`);
                                                      } else {
                                                        delete updatedPipedriveProducts[cubePipedriveKey];
                                                        console.log(`[Admin] Removing Pipedrive product for cube option: ${cubePipedriveKey}`);
                                                      }
                                                      updateConfig({
                                                        globalSettings: {
                                                          stepNames: currentGlobal.stepNames || {},
                                                          stepSubheaders: currentGlobal.stepSubheaders || {},
                                                          stepImages: currentGlobal.stepImages || {},
                                                          optionImages: currentGlobal.optionImages || {},
                                                          optionTitles: currentGlobal.optionTitles || {},
                                                          optionPipedriveProducts: updatedPipedriveProducts,
                                                          optionIncluded: currentGlobal.optionIncluded || {},
                                                        },
                                                      });
                                                    }}
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  </div>

                                  {/* Barrel Models Section */}
                                  <div className="border-2 border-green-300 rounded-lg p-5 bg-green-50">
                                    <div className="flex items-center gap-2 mb-4">
                                      <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-bold">
                                        BARREL MODELS
                                      </span>
                                      <h5 className="text-base font-semibold text-gray-900">Barrel Model Settings</h5>
                                    </div>
                                    <p className="text-xs text-gray-600 mb-4">
                                      Configure images and Pipedrive products for Barrel models (Barrel 220, Barrel 280).
                                    </p>
                                    <div className="space-y-4">
                                      {collectedStep.options
                                        .filter((option) => {
                                          // Barrel models: Only show wooden backwall, half moon, and full glass backwall
                                          return option.optionId === "wooden-backwall" || 
                                                 option.optionId === "glass-half-moon" || 
                                                 option.optionId === "full-glass-backwall";
                                        })
                                        .map((option) => {
                                          const barrelImageKey = `barrel_${option.optionId}`;
                                          const barrelPipedriveKey = `barrel_${option.optionId}`;
                                          const barrelTitleKey = `barrel_${option.optionId}`;
                                          const globalImageUrl = globalSettings.optionImages?.[barrelImageKey] || "";
                                          const globalTitle = globalSettings.optionTitles?.[barrelTitleKey] || option.optionTitle;
                                          const isIncluded = globalSettings.optionIncluded?.[`barrel_${option.optionId}`] ?? false;
                                          
                                          // Determine actual image URL
                                          let actualImageUrl = globalImageUrl;
                                          if (!actualImageUrl) {
                                            if (option.optionId === "wooden-backwall") {
                                              actualImageUrl = "/barrel-full-back-wall.png";
                                            } else if (option.optionId === "full-glass-backwall") {
                                              actualImageUrl = "/barrel-full-glass-wall.png";
                                            } else if (option.optionId === "glass-half-moon") {
                                              actualImageUrl = "/barrel-half-moon.png";
                                            } else {
                                              actualImageUrl = option.defaultImageUrl || "";
                                            }
                                          }
                                          
                                          const pipedriveProductId = globalSettings.optionPipedriveProducts?.[barrelPipedriveKey];

                                          return (
                                            <div key={`barrel-${option.optionId}`} className="border border-green-200 rounded-lg p-4 bg-white">
                                              <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Option Title
                                                  </label>
                                                  <input
                                                    type="text"
                                                    value={globalTitle}
                                                    onChange={(e) => {
                                                      if (!config) return;
                                                      const currentGlobal = config.globalSettings || {};
                                                      const currentOptionTitles = currentGlobal.optionTitles || {};
                                                      updateConfig({
                                                        globalSettings: {
                                                          stepNames: currentGlobal.stepNames || {},
                                                          stepSubheaders: currentGlobal.stepSubheaders || {},
                                                          stepImages: currentGlobal.stepImages || {},
                                                          optionImages: currentGlobal.optionImages || {},
                                                          optionTitles: {
                                                            ...currentOptionTitles,
                                                            [barrelTitleKey]: e.target.value,
                                                          },
                                                          optionPipedriveProducts: currentGlobal.optionPipedriveProducts || {},
                                                          optionIncluded: currentGlobal.optionIncluded || {},
                                                        },
                                                      });
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-600 focus:border-green-600 text-sm font-semibold mb-1"
                                                  />
                                                  <p className="text-xs text-gray-500">{option.optionDescription}</p>
                                                </div>
                                                <div className="flex-shrink-0 ml-4">
                                                  <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                      type="checkbox"
                                                      checked={isIncluded}
                                                      onChange={(e) => {
                                                        if (!config) return;
                                                        const currentGlobal = config.globalSettings || {};
                                                        const currentOptionIncluded = currentGlobal.optionIncluded || {};
                                                        updateConfig({
                                                          globalSettings: {
                                                            stepNames: currentGlobal.stepNames || {},
                                                            stepSubheaders: currentGlobal.stepSubheaders || {},
                                                            stepImages: currentGlobal.stepImages || {},
                                                            optionImages: currentGlobal.optionImages || {},
                                                            optionTitles: currentGlobal.optionTitles || {},
                                                            optionPipedriveProducts: currentGlobal.optionPipedriveProducts || {},
                                                            optionIncluded: {
                                                              ...currentOptionIncluded,
                                                              [`barrel_${option.optionId}`]: e.target.checked,
                                                            },
                                                          },
                                                        });
                                                      }}
                                                      className="w-4 h-4 text-[#303337] border-gray-300 rounded focus:ring-[#303337]"
                                                    />
                                                    <span className="text-xs font-medium text-gray-700">Included</span>
                                                  </label>
                                                </div>
                                              </div>

                                              <div className="flex items-start gap-4">
                                                <div className="flex-1">
                                                  <label className="block text-xs font-medium text-gray-700 mb-2">
                                                    Barrel Image
                                                  </label>
                                                  <div className="flex gap-3 items-start">
                                                    <div className="flex-1">
                                                      <ImageUpload
                                                        label=""
                                                        value={globalImageUrl}
                                                        onChange={(url) => {
                                                          const currentGlobal = config.globalSettings || {};
                                                          const currentOptionImages = currentGlobal.optionImages || {};
                                                          updateConfig({
                                                            globalSettings: {
                                                              ...currentGlobal,
                                                              optionImages: {
                                                                ...currentOptionImages,
                                                                [barrelImageKey]: url,
                                                              },
                                                            },
                                                          });
                                                        }}
                                                        placeholder={`Upload barrel image for ${globalTitle}`}
                                                      />
                                                    </div>
                                                    {actualImageUrl && (
                                                      <div className="flex-shrink-0">
                                                        <div className="w-24 h-24 border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100">
                                                          <img
                                                            src={actualImageUrl}
                                                            alt={`${globalTitle} preview (Barrel)`}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                              (e.target as HTMLImageElement).style.display = "none";
                                                            }}
                                                          />
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1 text-center">
                                                          {globalImageUrl ? "Current" : "Default"}
                                                        </p>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>

                                                <div className="flex-1">
                                                  <label className="block text-xs font-medium text-gray-700 mb-2">
                                                    Pipedrive Product (Barrel)
                                                  </label>
                                                  <PipedriveProductSelector
                                                    value={pipedriveProductId}
                                                    onChange={(productId) => {
                                                      if (!config) return;
                                                      const currentGlobal = config.globalSettings || {};
                                                      const currentPipedriveProducts = currentGlobal.optionPipedriveProducts || {};
                                                      const updatedPipedriveProducts = { ...currentPipedriveProducts };
                                                      if (productId) {
                                                        updatedPipedriveProducts[barrelPipedriveKey] = productId;
                                                      } else {
                                                        delete updatedPipedriveProducts[barrelPipedriveKey];
                                                      }
                                                      updateConfig({
                                                        globalSettings: {
                                                          stepNames: currentGlobal.stepNames || {},
                                                          stepSubheaders: currentGlobal.stepSubheaders || {},
                                                          stepImages: currentGlobal.stepImages || {},
                                                          optionImages: currentGlobal.optionImages || {},
                                                          optionTitles: currentGlobal.optionTitles || {},
                                                          optionPipedriveProducts: updatedPipedriveProducts,
                                                          optionIncluded: currentGlobal.optionIncluded || {},
                                                        },
                                                      });
                                                    }}
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* For other steps, show standard option settings */
                                <div className="space-y-4">
                                  {collectedStep.options.map((option) => {
                                    const optionImageUrl = globalSettings.optionImages?.[option.optionId] || "";
                                    const optionTitle = globalSettings.optionTitles?.[option.optionId] || option.optionTitle;
                                    const pipedriveProductId = globalSettings.optionPipedriveProducts?.[option.optionId];
                                    const isIncluded = globalSettings.optionIncluded?.[option.optionId] ?? false;

                                    return (
                                      <div key={option.optionId} className="border border-gray-200 rounded-lg p-4 bg-white">
                                        <div className="flex items-start justify-between mb-3">
                                          <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                              Option Title
                                            </label>
                                            <input
                                              type="text"
                                              value={optionTitle}
                                              onChange={(e) => {
                                                const currentGlobal = config.globalSettings || {};
                                                const currentOptionTitles = currentGlobal.optionTitles || {};
                                                updateConfig({
                                                  globalSettings: {
                                                    ...currentGlobal,
                                                    optionTitles: {
                                                      ...currentOptionTitles,
                                                      [option.optionId]: e.target.value,
                                                    },
                                                  },
                                                });
                                              }}
                                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm font-semibold mb-1"
                                            />
                                            <p className="text-xs text-gray-500">{option.optionDescription}</p>
                                          </div>
                                          <div className="flex-shrink-0 ml-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={isIncluded}
                                                onChange={(e) => {
                                                  const currentGlobal = config.globalSettings || {};
                                                  const currentOptionIncluded = currentGlobal.optionIncluded || {};
                                                  updateConfig({
                                                    globalSettings: {
                                                      ...currentGlobal,
                                                      optionIncluded: {
                                                        ...currentOptionIncluded,
                                                        [option.optionId]: e.target.checked,
                                                      },
                                                    },
                                                  });
                                                }}
                                                className="w-4 h-4 text-[#303337] border-gray-300 rounded focus:ring-[#303337]"
                                              />
                                              <span className="text-xs font-medium text-gray-700">Included</span>
                                            </label>
                                          </div>
                                        </div>

                                        <div className="flex items-start gap-4">
                                          <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-700 mb-2">
                                              Option Image
                                            </label>
                                            <div className="flex gap-3 items-start">
                                              <div className="flex-1">
                                                <ImageUpload
                                                  label=""
                                                  value={optionImageUrl}
                                                  onChange={(url) => {
                                                    const currentGlobal = config.globalSettings || {};
                                                    const currentOptionImages = currentGlobal.optionImages || {};
                                                    updateConfig({
                                                      globalSettings: {
                                                        ...currentGlobal,
                                                        optionImages: {
                                                          ...currentOptionImages,
                                                          [option.optionId]: url,
                                                        },
                                                      },
                                                    });
                                                  }}
                                                  placeholder={`Upload image for ${optionTitle}`}
                                                />
                                              </div>
                                              {optionImageUrl && (
                                                <div className="flex-shrink-0">
                                                  <div className="w-24 h-24 border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100">
                                                    <img
                                                      src={optionImageUrl}
                                                      alt={`${optionTitle} preview`}
                                                      className="w-full h-full object-cover"
                                                      onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = "none";
                                                      }}
                                                    />
                                                  </div>
                                                  <p className="text-xs text-gray-500 mt-1 text-center">Preview</p>
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-700 mb-2">
                                              Pipedrive Product
                                            </label>
                                            <PipedriveProductSelector
                                              value={pipedriveProductId}
                                              onChange={(productId) => {
                                                const currentGlobal = config.globalSettings || {};
                                                const currentPipedriveProducts = currentGlobal.optionPipedriveProducts || {};
                                                const updatedPipedriveProducts = { ...currentPipedriveProducts };
                                                if (productId) {
                                                  updatedPipedriveProducts[option.optionId] = productId;
                                                } else {
                                                  delete updatedPipedriveProducts[option.optionId];
                                                }
                                                updateConfig({
                                                  globalSettings: {
                                                    ...currentGlobal,
                                                    optionPipedriveProducts: updatedPipedriveProducts,
                                                  },
                                                });
                                              }}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        )}


        {/* Quote Settings Tab */}
        {activeTab === "quote" && (
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-8">
            <h2 className="text-xl font-bold text-gray-900">Quote Template Settings</h2>
            <p className="text-sm text-gray-600">
              Configure your quote template, company information, and terms. These settings will be used when generating PDF quotes.
            </p>

            {/* Initialize quote settings if not present */}
            {!config.quoteSettings && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Quote settings not configured. Click the button below to initialize with default values.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    updateConfig({ quoteSettings: defaultQuoteSettings });
                  }}
                  className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm font-medium"
                >
                  Initialize Quote Settings
                </button>
              </div>
            )}

            {config.quoteSettings && (
              <>
                {/* Company Logo */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Logo</h3>
                  <ImageUpload
                    label="Company Logo"
                    value={config.quoteSettings.companyLogoUrl || ""}
                    onChange={(url) =>
                      updateConfig({
                        quoteSettings: { ...config.quoteSettings!, companyLogoUrl: url },
                      })
                    }
                    placeholder="Enter logo URL or click Upload to select from computer"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Logo will appear at the top of your quotes. Recommended size: 200x60px or similar aspect ratio.
                  </p>
                </div>

                {/* Company Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={config.quoteSettings.companyName}
                        onChange={(e) =>
                          updateConfig({
                            quoteSettings: { ...config.quoteSettings!, companyName: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={config.quoteSettings.companyEmail}
                        onChange={(e) =>
                          updateConfig({
                            quoteSettings: { ...config.quoteSettings!, companyEmail: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={config.quoteSettings.companyPhone}
                        onChange={(e) =>
                          updateConfig({
                            quoteSettings: { ...config.quoteSettings!, companyPhone: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website
                      </label>
                      <input
                        type="url"
                        value={config.quoteSettings.companyWebsite}
                        onChange={(e) =>
                          updateConfig({
                            quoteSettings: { ...config.quoteSettings!, companyWebsite: e.target.value },
                          })
                        }
                        placeholder="https://"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <input
                        type="text"
                        value={config.quoteSettings.companyAddress}
                        onChange={(e) =>
                          updateConfig({
                            quoteSettings: { ...config.quoteSettings!, companyAddress: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          value={config.quoteSettings.companyCity}
                          onChange={(e) =>
                            updateConfig({
                              quoteSettings: { ...config.quoteSettings!, companyCity: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          State
                        </label>
                        <input
                          type="text"
                          value={config.quoteSettings.companyState}
                          onChange={(e) =>
                            updateConfig({
                              quoteSettings: { ...config.quoteSettings!, companyState: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ZIP
                        </label>
                        <input
                          type="text"
                          value={config.quoteSettings.companyZip}
                          onChange={(e) =>
                            updateConfig({
                              quoteSettings: { ...config.quoteSettings!, companyZip: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        value={config.quoteSettings.companyCountry}
                        onChange={(e) =>
                          updateConfig({
                            quoteSettings: { ...config.quoteSettings!, companyCountry: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Quote Configuration */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quote Configuration</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quote Validity (Days)
                      </label>
                      <input
                        type="number"
                        value={config.quoteSettings.quoteValidityDays}
                        onChange={(e) =>
                          updateConfig({
                            quoteSettings: { ...config.quoteSettings!, quoteValidityDays: parseInt(e.target.value) || 30 },
                          })
                        }
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Currency
                      </label>
                      <select
                        value={config.quoteSettings.currency}
                        onChange={(e) =>
                          updateConfig({
                            quoteSettings: { ...config.quoteSettings!, currency: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="CAD">CAD ($)</option>
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={config.quoteSettings.taxEnabled}
                          onChange={(e) =>
                            updateConfig({
                              quoteSettings: { ...config.quoteSettings!, taxEnabled: e.target.checked },
                            })
                          }
                          className="w-4 h-4 text-green-800 border-gray-300 rounded focus:ring-green-800"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Enable Tax on Quotes
                        </span>
                      </label>
                    </div>
                    {config.quoteSettings.taxEnabled && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tax Rate (%)
                        </label>
                        <input
                          type="number"
                          value={(config.quoteSettings.taxRate * 100).toFixed(2)}
                          onChange={(e) =>
                            updateConfig({
                              quoteSettings: { ...config.quoteSettings!, taxRate: (parseFloat(e.target.value) || 0) / 100 },
                            })
                          }
                          min="0"
                          max="100"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Enter as percentage (e.g., 23 for 23%)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Terms & Conditions */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Terms & Conditions</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Terms and Conditions
                      </label>
                      <textarea
                        value={config.quoteSettings.termsAndConditions}
                        onChange={(e) =>
                          updateConfig({
                            quoteSettings: { ...config.quoteSettings!, termsAndConditions: e.target.value },
                          })
                        }
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                        placeholder="Enter your terms and conditions..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Terms
                      </label>
                      <textarea
                        value={config.quoteSettings.paymentTerms}
                        onChange={(e) =>
                          updateConfig({
                            quoteSettings: { ...config.quoteSettings!, paymentTerms: e.target.value },
                          })
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                        placeholder="Enter payment terms..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Notes (Optional)
                      </label>
                      <textarea
                        value={config.quoteSettings.notes}
                        onChange={(e) =>
                          updateConfig({
                            quoteSettings: { ...config.quoteSettings!, notes: e.target.value },
                          })
                        }
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                        placeholder="Default notes to include on quotes..."
                      />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quote Footer</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Footer Text
                    </label>
                    <textarea
                      value={config.quoteSettings.footerText}
                      onChange={(e) =>
                        updateConfig({
                          quoteSettings: { ...config.quoteSettings!, footerText: e.target.value },
                        })
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                      placeholder="Footer text to appear at the bottom of quotes..."
                    />
                  </div>
                </div>

                {/* Preview Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quote Preview</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Preview how your quote will look with the current settings. This is a sample quote for demonstration purposes.
                  </p>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 overflow-auto max-h-[900px]">
                    <QuotePreview quoteSettings={config.quoteSettings} />
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!config.quoteSettings) return;
                        
                        // Generate a preview PDF
                        try {
                          const quoteSettings = config.quoteSettings;
                          // Create a sample quote
                          const sampleQuote = {
                            id: `quote-preview-${Date.now()}`,
                            productName: config.productName || "Sample Product",
                            customerEmail: "preview@example.com",
                            customerName: "Preview Customer",
                            customerPhone: "+1 (555) 123-4567",
                            items: [
                              {
                                stepId: "rear-glass-wall" as any,
                                stepName: "Rear Glass Wall",
                                optionId: "option-1",
                                optionTitle: "Premium Glass Wall",
                                optionDescription: "High-quality tempered glass",
                                price: 1250.00,
                              },
                              {
                                stepId: "lighting" as any,
                                stepName: "Lighting",
                                optionId: "option-2",
                                optionTitle: "LED Under Bench Lighting",
                                optionDescription: "Energy-efficient LED strips",
                                price: 450.00,
                              },
                              {
                                stepId: "heater" as any,
                                stepName: "Heater",
                                optionId: "option-3",
                                optionTitle: "Premium Sauna Heater",
                                optionDescription: "8kW electric heater with digital controls",
                                price: 1899.00,
                              },
                            ],
                            subtotal: 3599.00,
                            tax: quoteSettings.taxEnabled 
                              ? 3599.00 * quoteSettings.taxRate 
                              : undefined,
                            taxRate: quoteSettings.taxEnabled 
                              ? quoteSettings.taxRate 
                              : undefined,
                            total: quoteSettings.taxEnabled 
                              ? 3599.00 * (1 + quoteSettings.taxRate)
                              : 3599.00,
                            createdAt: new Date(),
                            expiresAt: new Date(Date.now() + quoteSettings.quoteValidityDays * 24 * 60 * 60 * 1000),
                            notes: quoteSettings.notes || "",
                          };

                          const pdfResponse = await fetch("/api/quotes/pdf", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ 
                              quote: sampleQuote,
                              quoteSettings: quoteSettings,
                            }),
                          });

                          if (pdfResponse.ok) {
                            const pdfBlob = await pdfResponse.blob();
                            const pdfUrl = URL.createObjectURL(pdfBlob);
                            window.open(pdfUrl, "_blank");
                            setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
                          } else {
                            alert("Failed to generate preview PDF. Please check your settings.");
                          }
                        } catch (error) {
                          console.error("Preview PDF generation failed:", error);
                          alert("Failed to generate preview PDF. Please try again.");
                        }
                      }}
                      className="px-6 py-3 bg-green-800 text-white rounded-lg hover:bg-green-900 font-medium transition-colors"
                    >
                      📄 Generate PDF Preview
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Import/Export Tab */}
        {activeTab === "import-export" && (
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your configuration is automatically saved to your browser's local storage. 
                However, browser data can be cleared when you close private/incognito windows, clear browser cache, 
                or use different browsers. <strong>We recommend exporting your configuration regularly as a backup.</strong>
              </p>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Export Configuration</h2>
              <p className="text-sm text-gray-600 mb-4">
                Download your current configuration as a JSON file. You can use this to backup your settings or transfer them to another instance.
              </p>
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleExport();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleExport();
                  }
                }}
                className="px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-900 font-medium cursor-pointer"
                style={{ userSelect: "none" }}
              >
                Export Configuration
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Configuration</h2>
              <p className="text-sm text-gray-600 mb-4">
                Paste a JSON configuration file to import settings. This will replace your current configuration.
              </p>
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder="Paste JSON configuration here..."
                rows={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800 font-mono text-sm"
              />
              <div className="mt-4 flex gap-4">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (importJson.trim()) handleImport();
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && importJson.trim()) {
                      e.preventDefault();
                      handleImport();
                    }
                  }}
                  className={`px-4 py-2 rounded-lg font-medium cursor-pointer ${
                    importJson.trim()
                      ? "bg-green-800 text-white hover:bg-green-900"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                  style={{ userSelect: "none", pointerEvents: importJson.trim() ? "auto" : "none" }}
                >
                  Import Configuration
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleReset();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleReset();
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium cursor-pointer"
                  style={{ userSelect: "none" }}
                >
                  Reset to Defaults
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
