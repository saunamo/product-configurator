"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { StepData, Option } from "@/types/configurator";
import { DesignConfig, QuoteSettings } from "@/types/admin";
import Link from "next/link";
import ImageUpload from "@/components/ImageUpload";
import PipedriveProductSelector from "@/components/PipedriveProductSelector";
import { getProduct, getProductConfig, saveProductConfig, getAllProducts, saveAllProducts } from "@/utils/productStorage";
import { Product, ProductConfig } from "@/types/product";
import { STEPS } from "@/constants/steps";
import { stepDataMap } from "@/data";
import { defaultDesignConfig } from "@/constants/defaultDesign";
import { defaultQuoteSettings } from "@/constants/defaultQuoteSettings";
import QuotePreview from "@/components/QuotePreview";

export default function ProductAdminPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as string;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [config, setConfig] = useState<ProductConfig | null>(null);
  const [activeTab, setActiveTab] = useState<string>("general");
  const [importJson, setImportJson] = useState("");
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | null>(null);

  // Load product and config
  useEffect(() => {
    // If productId is "new", redirect to the new product page
    if (productId === "new") {
      router.push("/admin/products/new");
      return;
    }
    
    const loadedProduct = getProduct(productId);
    if (!loadedProduct) {
      router.push("/admin/products");
      return;
    }
    
    setProduct(loadedProduct);
    
    const loadedConfig = getProductConfig(productId);
    if (loadedConfig) {
      // Merge with defaults to ensure all properties exist
      const defaultConfig: ProductConfig = {
        productId,
        productName: loadedProduct.name,
        steps: STEPS,
        stepData: stepDataMap,
        design: defaultDesignConfig,
        priceSource: "pipedrive",
        quoteSettings: defaultQuoteSettings,
      };
      // Use nullish coalescing to explicitly preserve mainProductImageUrl (even if empty string)
      // The ?? operator only treats null/undefined as falsy, not empty strings
      const mergedConfig: ProductConfig = {
        ...defaultConfig,
        ...loadedConfig,
        // Explicitly preserve mainProductImageUrl from loaded config using nullish coalescing
        mainProductImageUrl: loadedConfig.mainProductImageUrl ?? defaultConfig.mainProductImageUrl,
        // Ensure nested objects are merged, not replaced
        design: { ...defaultConfig.design, ...loadedConfig.design },
        quoteSettings: loadedConfig.quoteSettings 
          ? { ...defaultConfig.quoteSettings, ...loadedConfig.quoteSettings }
          : defaultConfig.quoteSettings,
      };
      console.log("📥 Loaded product config - mainProductImageUrl:", {
        fromLoaded: loadedConfig.mainProductImageUrl,
        fromDefault: defaultConfig.mainProductImageUrl,
        merged: mergedConfig.mainProductImageUrl,
        hasValue: !!mergedConfig.mainProductImageUrl,
        length: mergedConfig.mainProductImageUrl?.length || 0,
      });
      setConfig(mergedConfig);
    } else {
      // Create default config
      const defaultConfig: ProductConfig = {
        productId,
        productName: loadedProduct.name,
        steps: STEPS,
        stepData: stepDataMap,
        design: defaultDesignConfig,
        priceSource: "pipedrive",
        quoteSettings: defaultQuoteSettings,
      };
      setConfig(defaultConfig);
      saveProductConfig(defaultConfig);
    }
  }, [productId, router]);

  // Auto-save
  useEffect(() => {
    if (!config || !isDirty) return;

    setSaveStatus("saving");
    const timeoutId = setTimeout(() => {
      if (config) {
        console.log("💾 Saving product config - mainProductImageUrl:", config.mainProductImageUrl ? `${config.mainProductImageUrl.substring(0, 50)}...` : "undefined");
        saveProductConfig(config);
        setIsDirty(false);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus(null), 2000);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [config, isDirty]);

  // Read tab from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && ["general", "steps", "design", "quote", "import-export"].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setExpandedStep(null);
    window.history.pushState({}, "", `/admin/products/${productId}?tab=${tabId}`);
  };

  if (!product || !config) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600 mb-2">Loading...</div>
        </div>
      </div>
    );
  }

  const updateConfig = (updates: Partial<ProductConfig>) => {
    console.log("🔄 updateConfig called with updates:", Object.keys(updates));
    if (updates.mainProductImageUrl !== undefined) {
      console.log("🔄 mainProductImageUrl update:", {
        newValue: updates.mainProductImageUrl ? `${updates.mainProductImageUrl.substring(0, 50)}...` : "empty/undefined",
        length: updates.mainProductImageUrl?.length || 0,
        isDataURL: updates.mainProductImageUrl?.startsWith("data:image"),
      });
    }
    setConfig((prev) => {
      if (!prev) return prev;
      // Use nullish coalescing for mainProductImageUrl to preserve empty strings
      const updated: ProductConfig = {
        ...prev,
        ...updates,
        mainProductImageUrl: updates.mainProductImageUrl !== undefined 
          ? updates.mainProductImageUrl 
          : prev.mainProductImageUrl,
      };
      console.log("🔄 Updated config - mainProductImageUrl:", {
        value: updated.mainProductImageUrl ? `${updated.mainProductImageUrl.substring(0, 50)}...` : "undefined",
        length: updated.mainProductImageUrl?.length || 0,
        hasValue: !!updated.mainProductImageUrl,
      });
      setIsDirty(true);
      return updated;
    });
  };

  const updateProductName = (name: string) => {
    updateConfig({ productName: name });
    // Also update product name
    const updatedProduct = { ...product, name, updatedAt: new Date() };
    setProduct(updatedProduct);
    const products = getAllProducts();
    const index = products.findIndex((p) => p.id === productId);
    if (index >= 0) {
      products[index] = updatedProduct;
      saveAllProducts(products);
    }
  };

  const updateMainImage = (url: string) => {
    console.log("🖼️ Updating main product image URL:", {
      urlLength: url?.length || 0,
      urlPreview: url ? `${url.substring(0, 50)}...` : "empty",
      isDataURL: url?.startsWith("data:image"),
      productId: product.id,
    });
    updateConfig({ mainProductImageUrl: url });
  };

  const updateStep = (stepId: string, updates: Partial<StepData>) => {
    if (!config) return;
    const stepData = config.stepData[stepId];
    if (!stepData) return;
    
    updateConfig({
      stepData: {
        ...config.stepData,
        [stepId]: { ...stepData, ...updates },
      },
    });
  };

  const updateOption = (stepId: string, optionId: string, updates: Partial<Option>) => {
    if (!config) return;
    const stepData = config.stepData[stepId];
    if (!stepData) return;
    
    const options = stepData.options.map((opt) =>
      opt.id === optionId ? { ...opt, ...updates } : opt
    );
    
    updateConfig({
      stepData: {
        ...config.stepData,
        [stepId]: { ...stepData, options },
      },
    });
  };

  const addStep = () => {
    if (!config) return;
    const newStepId = `step-${Date.now()}`;
    const newStep = {
      id: newStepId,
      name: "New Step",
      route: `/products/${product.slug}/configurator/${newStepId}`,
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
    if (!config) return;
    if (confirm("Are you sure you want to remove this step?")) {
      const { [stepId]: removed, ...remainingStepData } = config.stepData;
      updateConfig({
        steps: config.steps.filter((s) => s.id !== stepId),
        stepData: remainingStepData,
      });
    }
  };

  const addOption = (stepId: string) => {
    if (!config) return;
    const stepData = config.stepData[stepId];
    if (!stepData) return;
    
    const newOption: Option = {
      id: `option-${Date.now()}`,
      title: "New Option",
      description: "",
      imageUrl: "",
      price: 0,
    };
    
    updateConfig({
      stepData: {
        ...config.stepData,
        [stepId]: {
          ...stepData,
          options: [...stepData.options, newOption],
        },
      },
    });
  };

  const removeOption = (stepId: string, optionId: string) => {
    if (!config) return;
    const stepData = config.stepData[stepId];
    if (!stepData) return;
    
    updateConfig({
      stepData: {
        ...config.stepData,
        [stepId]: {
          ...stepData,
          options: stepData.options.filter((opt) => opt.id !== optionId),
        },
      },
    });
  };

  const updateDesign = (updates: Partial<DesignConfig>) => {
    updateConfig({
      design: { ...config.design, ...updates },
    });
  };

  return (
    <div
      className="min-h-screen bg-[#faf9f7]"
      style={{ position: "relative", zIndex: 1, pointerEvents: "auto" }}
    >
      {/* Product Indicator Banner */}
      <div className="bg-green-800 text-white sticky top-0 z-20 shadow-md">
        <div className="max-w-7xl mx-auto px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium opacity-90">Currently configuring:</span>
              <span className="text-lg font-bold">{product.name}</span>
              <span className="text-xs opacity-75">({product.id})</span>
            </div>
            <Link
              href="/admin/products"
              className="text-sm font-medium hover:underline opacity-90 hover:opacity-100"
            >
              Switch Product →
            </Link>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-[52px] z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{product.name} - Configuration</h1>
              <p className="text-sm text-gray-600">
                Manage configurator settings • Changes auto-save
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
              <Link
                href="/admin/products"
                className="px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
              >
                ← Back to Products
              </Link>
              <Link
                  href={`/products/${product.slug}`}
                className="px-4 py-2 rounded-lg font-medium bg-green-800 text-white hover:bg-green-900 transition-colors"
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
              { id: "design", label: "Design" },
              { id: "quote", label: "Quote Settings" },
              { id: "import-export", label: "Import/Export" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={`/admin/products/${productId}?tab=${tab.id}`}
                  onClick={(e) => {
                    handleTabChange(tab.id);
                    window.history.pushState({}, "", `/admin/products/${productId}?tab=${tab.id}`);
                  }}
                  style={{ 
                    position: "relative",
                    zIndex: 100,
                    cursor: "pointer",
                    pointerEvents: "auto",
                    userSelect: "none",
                    textDecoration: "none",
                    display: "block",
                    color: "inherit"
                  }}
                  className={`px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-green-800 text-green-800"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.label} {isActive && "✓"}
                </Link>
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
                  {config.mainProductImageUrl && (
                    <div className="mt-2 space-y-2">
                      <div className="text-sm text-green-600">
                        ✅ Image saved ({config.mainProductImageUrl.length > 100 ? "Data URL" : "URL"})
                        {config.mainProductImageUrl.length > 100 && (
                          <span className="ml-2 text-xs text-gray-500">
                            Size: {(config.mainProductImageUrl.length / 1024).toFixed(1)} KB
                          </span>
                        )}
                      </div>
                      {config.mainProductImageUrl.startsWith("data:image") && (
                        <div className="w-32 h-32 border border-gray-300 rounded overflow-hidden">
                          <img 
                            src={config.mainProductImageUrl} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error("❌ Image preview failed to load");
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      )}
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                        💡 <strong>Note:</strong> Images are saved in browser localStorage. To sync to Chrome:
                        <br />1. Go to "Import/Export" tab below
                        <br />2. Click "Export Configuration" 
                        <br />3. Copy the JSON
                        <br />4. Open Chrome, go to same page, "Import/Export" tab
                        <br />5. Paste JSON and click "Import Configuration"
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
          </div>
        )}

        {/* Steps & Options Tab - Same as before but using product config */}
        {activeTab === "steps" && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Step Management</h2>
                <div className="flex gap-2">
                  {productId === "cube-125" && (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Auto-add Pipedrive products to Cube 125
                        const pipedriveMappings: Record<string, Record<string, number>> = {
                          lighting: { defaultOption: 6689 }, // Sauna Exterior Hiki L
                          heater: { defaultOption: 6689 }, // Placeholder
                          "aromas-accessories": { option1: 6688, option2: 6690 }, // Whisk products
                          "electrical-assembly": { defaultOption: 6677 }, // Ice Bath Installation
                          delivery: { defaultOption: 6677 }, // Placeholder
                          "cold-plunge": { defaultOption: 6692 }, // Cooling Unit
                        };
                        
                        let updated = 0;
                        const updatedConfig = { ...config };
                        
                        Object.entries(pipedriveMappings).forEach(([stepId, mappings]) => {
                          const stepData = updatedConfig.stepData[stepId];
                          if (!stepData) return;
                          
                          stepData.options.forEach((option, index) => {
                            const mappingKey = `option${index + 1}`;
                            const productId = mappings[mappingKey] || mappings.defaultOption;
                            
                            if (productId && !option.pipedriveProductId) {
                              option.pipedriveProductId = productId;
                              updated++;
                            }
                          });
                        });
                        
                        if (updated > 0) {
                          updateConfig({ stepData: updatedConfig.stepData });
                          alert(`✅ Added Pipedrive products to ${updated} options!`);
                        } else {
                          alert("All options already have Pipedrive products, or no matching options found.");
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium cursor-pointer text-sm"
                      style={{ userSelect: "none", pointerEvents: "auto" }}
                    >
                      🔗 Auto-Add Pipedrive Products
                    </div>
                  )}
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
                    style={{ userSelect: "none", pointerEvents: "auto" }}
                  >
                    + Add Step
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {config.steps.map((step, index) => {
                const stepData = config.stepData[step.id];
                const isExpanded = expandedStep === step.id;

                return (
                  <div key={step.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setExpandedStep(isExpanded ? null : step.id);
                        }
                      }}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                      style={{ userSelect: "none", pointerEvents: "auto" }}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">#{index + 1}</span>
                        <span className="font-medium text-gray-900">{step.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Move step up
                              const newSteps = [...config.steps];
                              [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
                              updateConfig({ steps: newSteps });
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            ↑
                          </button>
                        )}
                        {index < config.steps.length - 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Move step down
                              const newSteps = [...config.steps];
                              [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
                              updateConfig({ steps: newSteps });
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            ↓
                          </button>
                        )}
                        <span className="text-sm text-gray-500">{isExpanded ? "▼" : "▶"}</span>
                      </div>
                    </div>

                    {isExpanded && stepData && (
                      <div className="border-t border-gray-200 p-6 space-y-6">
                        {/* Step configuration fields - same structure as main admin page */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Step Name
                            </label>
                            <input
                              type="text"
                              value={step.name}
                              onChange={(e) => {
                                const newSteps = config.steps.map((s) =>
                                  s.id === step.id ? { ...s, name: e.target.value } : s
                                );
                                updateConfig({ steps: newSteps });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Route
                            </label>
                            <input
                              type="text"
                              value={step.route}
                              onChange={(e) => {
                                const newSteps = config.steps.map((s) =>
                                  s.id === step.id ? { ...s, route: e.target.value } : s
                                );
                                updateConfig({ steps: newSteps });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Step Title
                          </label>
                          <input
                            type="text"
                            value={stepData.title}
                            onChange={(e) => updateStep(step.id, { title: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Step Description
                          </label>
                          <textarea
                            value={stepData.description || ""}
                            onChange={(e) => updateStep(step.id, { description: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                            placeholder="Description shown above the options"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subtext (Below Options)
                          </label>
                          <textarea
                            value={stepData.subtext || ""}
                            onChange={(e) => updateStep(step.id, { subtext: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                            placeholder="Additional text displayed below the options list"
                          />
                          <p className="mt-1 text-xs text-gray-500">
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

                        {/* Options section - same as main admin */}
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
                          className="text-sm text-red-600 hover:text-red-800 font-medium cursor-pointer"
                          style={{ userSelect: "none" }}
                        >
                          Remove Step
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Design Tab - Same structure as main admin */}
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quote Settings Tab */}
        {activeTab === "quote" && config && (
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
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Export Configuration</h2>
              <p className="text-sm text-gray-600 mb-4">
                Copy the configuration JSON to sync to Chrome (or download as file).
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    const json = JSON.stringify(config, null, 2);
                    try {
                      await navigator.clipboard.writeText(json);
                      alert("✅ Configuration copied to clipboard! Now paste it in Chrome's Import section.");
                    } catch (err) {
                      // Fallback if clipboard API fails
                      const textarea = document.createElement("textarea");
                      textarea.value = json;
                      document.body.appendChild(textarea);
                      textarea.select();
                      document.execCommand("copy");
                      document.body.removeChild(textarea);
                      alert("✅ Configuration copied to clipboard! Now paste it in Chrome's Import section.");
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  📋 Copy to Clipboard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const json = JSON.stringify(config, null, 2);
                    const blob = new Blob([json], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${product.slug}-config.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-900 font-medium"
                >
                  💾 Download as File
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Configuration</h2>
              <p className="text-sm text-gray-600 mb-4">
                Paste a JSON configuration file to import settings.
              </p>
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder="Paste JSON configuration here..."
                rows={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  try {
                    const parsed = JSON.parse(importJson) as ProductConfig;
                    parsed.productId = productId; // Ensure productId matches
                    setConfig(parsed);
                    saveProductConfig(parsed);
                    setImportJson("");
                    alert("Configuration imported successfully!");
                  } catch {
                    alert("Failed to import configuration. Please check the JSON format.");
                  }
                }}
                disabled={!importJson.trim()}
                className="mt-4 px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-900 font-medium disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                Import Configuration
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

