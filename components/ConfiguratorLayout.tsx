"use client";

import { ReactNode, useEffect } from "react";
import Stepper from "./Stepper";
import ProductImage from "./ProductImage";
import NavigationButtons from "./NavigationButtons";
import { StepId } from "@/types/configurator";
import { StepData, Step } from "@/types/configurator";
import { useConfigurator } from "@/contexts/ConfiguratorContext";
import { useAdminConfig } from "@/contexts/AdminConfigContext";
import { DesignConfig } from "@/types/admin";
import { STEPS as DEFAULT_STEPS } from "@/constants/steps";

interface ConfiguratorLayoutProps {
  currentStepId: StepId;
  stepData: StepData;
  children: ReactNode;
  productImageUrl?: string;
  productName?: string;
  steps?: Step[];
  design?: DesignConfig;
  productSlug?: string; // For product-based routing
  canProceed?: boolean; // Optional override for canProceed calculation
  selectedOptionImageUrl?: string; // Image URL of selected option to display
  selectedOptionTitle?: string; // Title of selected option for badge (preserves capitalization)
}

export default function ConfiguratorLayout({
  currentStepId,
  stepData,
  children,
  productImageUrl,
  productName: propProductName,
  steps: propSteps,
  design: propDesign,
  productSlug,
  canProceed: propCanProceed,
  selectedOptionImageUrl,
  selectedOptionTitle: propSelectedOptionTitle,
}: ConfiguratorLayoutProps) {
  const { isStepComplete } = useConfigurator();
  const { config } = useAdminConfig();
  // Use prop if provided, otherwise calculate
  const canProceed = propCanProceed !== undefined ? propCanProceed : isStepComplete(currentStepId, stepData);
  
  // Use props if provided (product-based), otherwise use context (legacy)
  const productName = propProductName || config?.productName || "The Skuare";
  const steps = propSteps || config?.steps || [];
  const design = propDesign || config?.design;
  // Image priority: selected option > step image > product image > admin config main image
  // Step images should show when on that step (unless an option is selected)
  // Filter out empty strings and invalid placeholder URLs
  const isValidImageUrl = (url: string | undefined) => {
    if (!url || !url.trim()) return false;
    const trimmed = url.trim();
    // Reject placeholder URLs that don't work
    if (trimmed.includes("via.placeholder.com") && trimmed.includes("/80")) return false;
    if (trimmed === "https://via.placeholder.com/80") return false;
    return true;
  };
  
  const displayImageUrl = 
    (isValidImageUrl(selectedOptionImageUrl) ? selectedOptionImageUrl : undefined) ||
    (isValidImageUrl(stepData.imageUrl) ? stepData.imageUrl : undefined) ||
    (isValidImageUrl(productImageUrl) ? productImageUrl : undefined) ||
    (config && isValidImageUrl(config.mainProductImageUrl) ? config.mainProductImageUrl : undefined) ||
    undefined;
  
  // Determine if we should use option image scaling (for step images and option images)
  // Step images (like accessories) should also use object-contain for better scaling
  const isStepImage = !selectedOptionImageUrl && isValidImageUrl(stepData.imageUrl);
  const shouldUseOptionImageScaling = !!selectedOptionImageUrl || isStepImage;
  
  // Find the selected option title for the image label
  // Use propSelectedOptionTitle if provided (preserves exact capitalization), otherwise find by imageUrl
  const selectedOptionLabel = propSelectedOptionTitle || (() => {
    const selectedOption = selectedOptionImageUrl 
      ? stepData.options.find(opt => opt.imageUrl === selectedOptionImageUrl)
      : undefined;
    return selectedOption?.title;
  })();
  
  // Debug logging to help diagnose image loading issues
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("🖼️ ConfiguratorLayout Image Debug:", {
        priority: "selectedOption > stepImage > productImage > adminConfig",
        hasSelectedOptionImage: !!selectedOptionImageUrl,
        selectedOptionImageUrl: selectedOptionImageUrl?.substring(0, 50),
        hasStepImageUrl: !!stepData.imageUrl,
        stepImageUrl: stepData.imageUrl?.substring(0, 50),
        hasProductImageUrl: !!productImageUrl,
        productImageUrl: productImageUrl?.substring(0, 50),
        hasConfigMainImage: !!config?.mainProductImageUrl,
        configMainImageUrl: config?.mainProductImageUrl?.substring(0, 50),
        finalImageUrl: displayImageUrl ? `${displayImageUrl.substring(0, 50)}...` : 'none',
        stepId: currentStepId,
      });
    }
  }, [selectedOptionImageUrl, productImageUrl, config?.mainProductImageUrl, stepData.imageUrl, displayImageUrl, currentStepId]);
  const imageWidth = design?.imageWidth || "70%";
  const panelWidth = design?.panelWidth || "30%";

  // Safety check: if steps is empty, use default STEPS
  const finalSteps = steps && steps.length > 0 ? steps : DEFAULT_STEPS;

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
      <div 
        className="sticky top-0 z-50 border-b shadow-sm"
        style={{ 
          backgroundColor: design?.cardBackgroundColor || "#ffffff",
          borderColor: design?.borderColor || "#E2DEDA",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-6">
          <h1 
            className="font-bold mb-4 sm:mb-6 text-xl sm:text-3xl"
            style={{ 
              fontSize: design?.headingFontSize || "1.875rem",
              color: "#303337",
              fontFamily: design?.fontFamily || "Questrial, sans-serif",
            }}
          >
            {productName}
          </h1>
          <Stepper currentStepId={currentStepId} steps={finalSteps} productSlug={productSlug} />
        </div>
      </div>

      {/* Main Content Area - Responsive */}
      <div className="max-w-7xl mx-auto">
        {/* Mobile (< 768px): Fixed image at top, scrollable options below */}
        <div className="md:hidden">
          {/* Fixed image at top on mobile */}
          <div className="sticky top-0 z-40 bg-white border-b" style={{ borderColor: design?.borderColor || "#E2DEDA" }}>
            <div className="px-4 py-4">
              <ProductImage
                imageUrl={displayImageUrl}
                alt={`${productName} - ${stepData.title}`}
                selectedOptionLabel={selectedOptionLabel}
                isOptionImage={shouldUseOptionImageScaling}
              />
            </div>
          </div>
          {/* Scrollable options panel below image */}
          <div className="px-4 py-4">
            <div 
              className="rounded-lg shadow-sm"
              style={{
                backgroundColor: design?.cardBackgroundColor || "#ffffff",
                padding: design?.cardPadding || "1.5rem",
                borderRadius: design?.borderRadius || "0.5rem",
              }}
            >
              {children}
            </div>
          </div>
        </div>

        {/* Tablet (768px - 1023px): Side by side with 50/50 split */}
        <div className="hidden md:flex lg:hidden md:flex-row gap-4 md:gap-6 px-4 md:px-6 py-4 md:py-6">
          {/* Left: Product Image - 50% on tablet */}
          <div 
            className="md:flex-1 md:sticky md:top-8"
          >
            <ProductImage
              imageUrl={displayImageUrl}
              alt={`${productName} - ${stepData.title}`}
              selectedOptionLabel={selectedOptionLabel}
              isOptionImage={!!selectedOptionImageUrl}
            />
          </div>

          {/* Right: Configuration Panel - 50% on tablet */}
          <div 
            className="md:flex-1 md:flex-shrink-0"
          >
            <div 
              className="rounded-lg shadow-sm"
              style={{
                backgroundColor: design?.cardBackgroundColor || "#ffffff",
                padding: design?.cardPadding || "1.5rem",
                borderRadius: design?.borderRadius || "0.5rem",
              }}
            >
              {children}
              {/* Navigation buttons inside options box on tablet */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <NavigationButtons
                  currentStepId={currentStepId}
                  canProceed={canProceed}
                  steps={finalSteps}
                  productSlug={productSlug}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Desktop (≥ 1024px): Side by side with 70/30 split */}
        <div className="hidden lg:flex lg:flex-row gap-4 sm:gap-8 px-4 sm:px-8 py-4 sm:py-8">
          {/* Left: Product Image - ~70% on desktop */}
          <div 
            className="lg:flex-[7] lg:sticky lg:top-8"
          >
            <ProductImage
              imageUrl={displayImageUrl}
              alt={`${productName} - ${stepData.title}`}
              selectedOptionLabel={selectedOptionLabel}
              isOptionImage={!!selectedOptionImageUrl}
            />
          </div>

          {/* Right: Configuration Panel - ~30% on desktop */}
          <div 
            className="lg:flex-[3] lg:flex-shrink-0"
          >
            <div 
              className="rounded-lg shadow-sm"
              style={{
                backgroundColor: design?.cardBackgroundColor || "#ffffff",
                padding: design?.cardPadding || "1.5rem",
                borderRadius: design?.borderRadius || "0.5rem",
              }}
            >
              {children}
              {/* Navigation buttons inside options box on desktop */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <NavigationButtons
                  currentStepId={currentStepId}
                  canProceed={canProceed}
                  steps={finalSteps}
                  productSlug={productSlug}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation removed - now inside options box */}
    </div>
  );
}

