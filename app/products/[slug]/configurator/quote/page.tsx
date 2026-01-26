"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useConfigurator } from "@/contexts/ConfiguratorContext";
import { STEPS } from "@/constants/steps";
import ConfiguratorLayout from "@/components/ConfiguratorLayout";
import { getProductConfig } from "@/utils/productStorage";
import { ProductConfig } from "@/types/product";
import { capitalize } from "@/utils/capitalize";
import { getStepData } from "@/data";
import Stepper from "@/components/Stepper";
import ProductImage from "@/components/ProductImage";
import NavigationButtons from "@/components/NavigationButtons";

export default function ProductQuotePage() {
  const router = useRouter();
  const params = useParams();
  const productSlug = params.slug as string;
  
  const { state } = useConfigurator();
  const [config, setConfig] = useState<ProductConfig | null>(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  // Add style tag to override global input styles for quote page
  useEffect(() => {
    const styleId = "quote-input-override";
    // Remove existing style if it exists to ensure fresh injection
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const style = document.createElement("style");
    style.id = styleId;
    // Use higher specificity and ensure it loads after global CSS
    style.textContent = `
      input[type="email"].quote-form-input,
      input[type="text"].quote-form-input,
      input[type="tel"].quote-form-input,
      textarea.quote-form-input {
        color: #000000 !important;
      }
      input[type="email"].quote-form-input::placeholder,
      input[type="text"].quote-form-input::placeholder,
      input[type="tel"].quote-form-input::placeholder,
      textarea.quote-form-input::placeholder {
        color: rgba(0, 0, 0, 0.5) !important;
      }
      /* Additional override for autofill and browser defaults */
      input[type="email"].quote-form-input:-webkit-autofill,
      input[type="text"].quote-form-input:-webkit-autofill,
      input[type="tel"].quote-form-input:-webkit-autofill {
        -webkit-text-fill-color: #000000 !important;
        color: #000000 !important;
      }
      /* Force override for all states */
      input[type="email"].quote-form-input:focus,
      input[type="text"].quote-form-input:focus,
      input[type="tel"].quote-form-input:focus,
      textarea.quote-form-input:focus {
        color: #000000 !important;
      }
    `;
    // Append to end of head to ensure it loads after global CSS
    document.head.appendChild(style);
    
    return () => {
      // Cleanup: remove style tag when component unmounts
      const styleToRemove = document.getElementById(styleId);
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, []);

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
        const productConfig = await getProductConfig(product.id);
        setConfig(productConfig);
      } else {
        console.error("❌ Product not found with slug:", productSlug);
      }
    } catch (error) {
      console.error("❌ Error loading product config:", error);
    }
  };

  // Load product config
  useEffect(() => {
    // Initial load
    loadConfig();

    // Listen for storage changes (when admin panel saves)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("saunamo-product-config-")) {
        loadConfig();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Also listen for custom events (for same-tab updates)
    const handleCustomStorage = () => {
      loadConfig();
    };
    window.addEventListener("productConfigUpdated", handleCustomStorage);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("productConfigUpdated", handleCustomStorage);
    };
  }, [productSlug]);

  // Check if user has made any selections
  const hasSelections = Object.values(state.selections).some(
    (selections) => selections && selections.length > 0
  );

  useEffect(() => {
    if (!hasSelections) {
      // Get first available step (filter out rear-glass-wall for Hiki/Aisti)
      const isHikiOrAisti = productSlug.toLowerCase().includes("hiki") || 
                            productSlug.toLowerCase().includes("aisti");
      const availableSteps = config?.steps?.filter(s => {
        if (isHikiOrAisti && s.id === "rear-glass-wall") return false;
        return true;
      }) || [];
      const firstStep = availableSteps[0] || config?.steps?.[0];
      router.push(`/products/${productSlug}/configurator/${firstStep?.id || "heater"}`);
    }
  }, [hasSelections, router, productSlug, config]);

  // Calculate current total from selections
  const calculateTotal = () => {
    let total = 0;
    Object.entries(state.selections).forEach(([stepId, optionIds]) => {
      const stepData = config?.stepData?.[stepId];
      if (!stepData || !optionIds) return;

      optionIds.forEach((optionId) => {
        const option = stepData.options.find((opt) => opt.id === optionId);
        if (option) {
          total += option.price;
        }
      });
    });
    return total;
  };

  const handleGenerateQuote = useCallback(async () => {
    if (!customerEmail) {
      setError("Please enter your email address");
      return;
    }

    if (!config) {
      setError("Product configuration not loaded. Please refresh the page.");
      return;
    }

    setIsGenerating(true);
    setError("");

    // Debug: Log selections before sending
    console.log("[Quote Page] Selections being sent to API:", JSON.stringify(state.selections, null, 2));
    console.log("[Quote Page] Heater selections specifically:", state.selections["heater"]);

    try {
      // Pass the full config since server can't access localStorage
      const response = await fetch("/api/quotes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: config.productId,
          productName: config.productName,
          productConfig: config, // Pass full config since server can't access localStorage
          selections: state.selections,
          customerEmail,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          notes: notes || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate quote");
      }

      const data = await response.json();
      
      // Generate and open PDF locally
      try {
        const pdfResponse = await fetch("/api/quotes/pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            quote: data.quote,
            quoteSettings: config.quoteSettings, // Pass quote settings
          }),
        });

        if (pdfResponse.ok) {
          const pdfBlob = await pdfResponse.blob();
          const pdfUrl = URL.createObjectURL(pdfBlob);
          
          // Open PDF in new tab
          window.open(pdfUrl, "_blank");
          
          // Clean up the URL after a delay
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
          
          alert(`Quote generated successfully! Quote ID: ${data.quoteId}\n\nThe PDF has been opened in a new tab.`);
        } else {
          alert(`Quote generated successfully! Quote ID: ${data.quoteId}\n\nNote: PDF generation failed.`);
        }
      } catch (pdfError) {
        console.error("Failed to generate PDF:", pdfError);
        alert(`Quote generated successfully! Quote ID: ${data.quoteId}\n\nNote: PDF generation failed.`);
      }
      
      // Optionally redirect or reset
    } catch (err: any) {
      setError(err.message || "Failed to generate quote. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [customerEmail, customerName, customerPhone, notes, config, state.selections]);

  // Listen for generateQuote event from NavigationButtons
  useEffect(() => {
    const handleGenerateQuoteEvent = () => {
      if (customerEmail) {
        handleGenerateQuote();
      } else {
        setError("Please enter your email address");
      }
    };
    
    window.addEventListener('generateQuote', handleGenerateQuoteEvent);
    return () => window.removeEventListener('generateQuote', handleGenerateQuoteEvent);
  }, [customerEmail, handleGenerateQuote]);

  // Show loading state while config is loading (AFTER all hooks)
  if (!config) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600 mb-2">Loading configuration...</div>
          <div className="text-sm text-gray-500">Please wait while we load your quote details.</div>
        </div>
      </div>
    );
  }

  if (!hasSelections) {
    return null;
  }

  const lastStep = config.steps[config.steps.length - 1] || STEPS[STEPS.length - 1];
  const lastStepData = config.stepData[lastStep.id];

  // Find the quote step or use the last step
  const quoteStep = config.steps.find(s => s.id === "quote") || lastStep;
  
  const design = config.design;
  const productName = config.productName;
  const finalSteps = config.steps && config.steps.length > 0 ? config.steps : STEPS;
  
  // Get product image URL
  const productImageUrl = config.mainProductImageUrl;

  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: design?.backgroundColor || "#F3F0ED",
        color: design?.textColor || "#908F8D",
        fontFamily: design?.fontFamily || "Questrial, sans-serif",
      }}
    >
      {/* Top Section - Sticky Header */}
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="px-4 sm:px-8 py-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            {productName}
          </h1>
          <Stepper currentStepId={quoteStep.id} steps={finalSteps} productSlug={productSlug} />
        </div>
      </div>

      {/* Desktop Layout: Image + Quote Summary on left, Contact Info on right */}
      <div className="hidden lg:flex lg:flex-row gap-4 sm:gap-8 px-4 sm:px-8 py-4 sm:py-8">
        {/* Left: Product Image + Quote Summary - ~70% on desktop */}
        <div className="lg:flex-[7] space-y-6">
          {/* Product Image */}
          <div>
            <ProductImage
              imageUrl={productImageUrl}
              alt={`${productName} - Quote`}
              isOptionImage={false}
            />
          </div>

          {/* Quote Summary - Below Image */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Selections</h3>
            
            {/* Main Product - Show first if Pipedrive ID is configured */}
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
            
            {config.steps.map((step) => {
              const stepData = config.stepData[step.id];
              const selectedIds = state.selections[step.id] || [];
              if (selectedIds.length === 0 || !stepData) return null;

              return (
                <div key={step.id} className="border-b border-gray-200 pb-4 last:border-0">
                  <h4 className="font-medium text-gray-900 mb-2">
                    {step.id === "rear-glass-wall" ? "Rear Wall Option" : step.name}
                  </h4>
                  <ul className="space-y-1">
                    {selectedIds.map((optionId) => {
                      let option = stepData.options.find((opt) => opt.id === optionId);
                      
                      if (!option) {
                        const defaultStepData = getStepData(step.id);
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
                      if (step.id === "heater") {
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
        </div>

        {/* Right: Contact Information - ~30% on desktop */}
        <div className="lg:flex-[3] lg:flex-shrink-0">
          <div 
            className="rounded-lg shadow-sm"
            style={{
              backgroundColor: design?.cardBackgroundColor || "#ffffff",
              padding: design?.cardPadding || "1.5rem",
              borderRadius: design?.borderRadius || "0.5rem",
            }}
          >
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
                    className="quote-form-input w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800 focus:bg-white"
                    style={{ backgroundColor: "#ffffff", color: "#000000" }}
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
                    className="quote-form-input w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800 focus:bg-white"
                    style={{ backgroundColor: "#ffffff", color: "#000000" }}
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
                    className="quote-form-input w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800 focus:bg-white"
                    style={{ backgroundColor: "#ffffff", color: "#000000" }}
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
                    className="quote-form-input w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800 focus:bg-white"
                    style={{ backgroundColor: "#ffffff", color: "#000000" }}
                    placeholder="Any special requirements or questions..."
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Navigation buttons - Single divider, with spacing below */}
              <div className="mt-6 pb-6">
                <NavigationButtons
                  currentStepId={quoteStep.id}
                  canProceed={!!customerEmail}
                  steps={finalSteps}
                  productSlug={productSlug}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Layout: Stacked */}
      <div className="lg:hidden px-4 sm:px-8 py-4 sm:py-8 space-y-6">
        {/* Product Image */}
        <div>
          <ProductImage
            imageUrl={productImageUrl}
            alt={`${productName} - Quote`}
            isOptionImage={false}
          />
        </div>

        {/* Quote Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Selections</h3>
          
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
          
          {config.steps.map((step) => {
            const stepData = config.stepData[step.id];
            const selectedIds = state.selections[step.id] || [];
            if (selectedIds.length === 0 || !stepData) return null;

            return (
              <div key={step.id} className="border-b border-gray-200 pb-4 last:border-0">
                <h4 className="font-medium text-gray-900 mb-2">
                  {step.id === "rear-glass-wall" ? "Rear Wall Option" : step.name}
                </h4>
                <ul className="space-y-1">
                  {selectedIds.map((optionId) => {
                    let option = stepData.options.find((opt) => opt.id === optionId);
                    
                    if (!option) {
                      const defaultStepData = getStepData(step.id);
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
                    if (step.id === "heater") {
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

        {/* Contact Information */}
        <div 
          className="rounded-lg shadow-sm"
          style={{
            backgroundColor: design?.cardBackgroundColor || "#ffffff",
            padding: design?.cardPadding || "1.5rem",
            borderRadius: design?.borderRadius || "0.5rem",
          }}
        >
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
                  className="quote-form-input w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800 focus:bg-white"
                  style={{ backgroundColor: "#ffffff", color: "#000000" }}
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
                  className="quote-form-input w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800 focus:bg-white"
                  style={{ backgroundColor: "#ffffff", color: "#000000" }}
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
                  className="quote-form-input w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800 focus:bg-white"
                  style={{ backgroundColor: "#ffffff", color: "#000000" }}
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
                  className="quote-form-input w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800 focus:bg-white"
                  style={{ backgroundColor: "#ffffff", color: "#000000" }}
                  placeholder="Any special requirements or questions..."
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Navigation buttons - Single divider, with spacing below */}
            <div className="mt-6 pb-6">
              <NavigationButtons
                currentStepId={quoteStep.id}
                canProceed={!!customerEmail}
                steps={finalSteps}
                productSlug={productSlug}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
