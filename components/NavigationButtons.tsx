"use client";

import { useRouter } from "next/navigation";
import { STEPS } from "@/constants/steps";
import { StepId, Step } from "@/types/configurator";
import { useAdminConfig } from "@/contexts/AdminConfigContext";

interface NavigationButtonsProps {
  currentStepId: StepId;
  canProceed: boolean;
  steps?: Step[];
  productSlug?: string;
  isGenerating?: boolean;
}

export default function NavigationButtons({
  currentStepId,
  canProceed,
  steps: propSteps,
  productSlug,
  isGenerating = false,
}: NavigationButtonsProps) {
  const router = useRouter();
  const { config } = useAdminConfig();
  const steps = propSteps || config?.steps || STEPS;
  const currentIndex = steps.findIndex((step) => step.id === currentStepId);
  const previousStep = currentIndex > 0 ? steps[currentIndex - 1] : null;
  const nextStep =
    currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;
  
  // Build route - use product slug if provided
  const getStepRoute = (step: Step) => {
    if (productSlug) {
      // For product-based routing, use step.id directly (route is just the step ID)
      const stepRoute = step.id;
      return `/products/${productSlug}/configurator/${stepRoute}`;
    }
    // For legacy routing, use the full route path
    return step.route;
  };
  
  const getQuoteRoute = () => {
    if (productSlug) {
      return `/products/${productSlug}/configurator/quote`;
    }
    return "/configurator/quote";
  };

  // Navigate without page reload - update URL directly without Next.js router
  const handleNavigate = (route: string) => {
    // Use instant navigation for all steps including quote
    window.history.pushState({}, '', route);
    // Dispatch custom event to notify page component
    window.dispatchEvent(new CustomEvent('stepchange', { detail: { route } }));
  };

  return (
    <div className="flex items-center justify-between w-full gap-3 sm:gap-4">
      <div className="flex-shrink-0">
        {previousStep ? (
          <button
            onClick={() => handleNavigate(getStepRoute(previousStep))}
            className="text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm sm:text-base px-2 sm:px-0 py-2 sm:py-0"
          >
            ← Back
          </button>
        ) : (
          <span className="text-gray-400 text-sm sm:text-base px-2 sm:px-0 py-2 sm:py-0">← Back</span>
        )}
      </div>
      <div className="flex-shrink-0">
        {nextStep ? (
          <button
            onClick={() => {
              if (canProceed) {
                handleNavigate(getStepRoute(nextStep));
              }
            }}
            className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base whitespace-nowrap ${
              canProceed
                ? "bg-[#303337] text-white hover:opacity-90 cursor-pointer"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            disabled={!canProceed}
          >
            Next →
          </button>
        ) : (
          <button
            onClick={() => {
              if (canProceed && !isGenerating) {
                // For quote step, dispatch event to trigger quote generation
                // The quote page will listen for this event
                window.dispatchEvent(new CustomEvent('generateQuote'));
              }
            }}
            className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base whitespace-nowrap flex items-center gap-2 ${
              canProceed && !isGenerating
                ? "bg-[#303337] text-white hover:opacity-90 cursor-pointer"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            disabled={!canProceed || isGenerating}
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              "Generate Quote →"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

