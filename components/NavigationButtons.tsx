"use client";

import Link from "next/link";
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

  return (
    <div className="flex items-center justify-between w-full pt-6 border-t border-gray-200">
      <div>
        {previousStep ? (
          <Link
            href={getStepRoute(previousStep)}
            className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            ← Back
          </Link>
        ) : (
          <span className="text-gray-400">← Back</span>
        )}
      </div>
      <div>
        {nextStep ? (
          <Link
            href={getStepRoute(nextStep)}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              canProceed
                ? "bg-[#303337] text-white hover:opacity-90"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            onClick={(e) => {
              if (!canProceed) {
                e.preventDefault();
              }
            }}
          >
            Next →
          </Link>
        ) : (
          <Link
            href={getQuoteRoute()}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              canProceed
                ? "bg-[#303337] text-white hover:opacity-90"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            onClick={(e) => {
              if (!canProceed) {
                e.preventDefault();
              }
            }}
          >
            Generate Quote →
          </Link>
        )}
      </div>
    </div>
  );
}

