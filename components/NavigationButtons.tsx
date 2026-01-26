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
}

export default function NavigationButtons({
  currentStepId,
  canProceed,
  steps: propSteps,
  productSlug,
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
    // For quote step, use Next.js router to go to dedicated quote page
    if (route.includes('/quote')) {
      router.replace(route);
      return;
    }
    // For other steps, use instant navigation
    window.history.pushState({}, '', route);
    // Dispatch custom event to notify page component
    window.dispatchEvent(new CustomEvent('stepchange', { detail: { route } }));
  };

  return (
    <div className="flex items-center justify-between w-full pt-6 border-t border-gray-200">
      <div>
        {previousStep ? (
          <button
            onClick={() => handleNavigate(getStepRoute(previousStep))}
            className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            ← Back
          </button>
        ) : (
          <span className="text-gray-400">← Back</span>
        )}
      </div>
      <div>
        {nextStep ? (
          <button
            onClick={() => {
              if (canProceed) {
                handleNavigate(getStepRoute(nextStep));
              }
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
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
              if (canProceed) {
                // For quote step, dispatch event to trigger quote generation
                // The quote page will listen for this event
                window.dispatchEvent(new CustomEvent('generateQuote'));
              }
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              canProceed
                ? "bg-[#303337] text-white hover:opacity-90 cursor-pointer"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            disabled={!canProceed}
          >
            Generate Quote →
          </button>
        )}
      </div>
    </div>
  );
}

