"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { STEPS } from "@/constants/steps";
import { StepId, Step } from "@/types/configurator";
import { useAdminConfig } from "@/contexts/AdminConfigContext";

interface StepperProps {
  currentStepId: StepId;
  steps?: Step[];
  productSlug?: string;
}

export default function Stepper({ currentStepId, steps: propSteps, productSlug }: StepperProps) {
  const router = useRouter();
  const { config } = useAdminConfig();
  const steps = propSteps || config?.steps || STEPS;
  const currentIndex = steps.findIndex((step) => step.id === currentStepId);
  
  // Debug: Log which steps are being used
  if (process.env.NODE_ENV === 'development') {
    console.log("🎯 Stepper rendering with steps:", {
      hasPropSteps: !!propSteps,
      propStepNames: propSteps?.map(s => ({ id: s.id, name: s.name })),
      hasAdminConfigSteps: !!config?.steps,
      adminConfigStepNames: config?.steps?.map(s => ({ id: s.id, name: s.name })),
      finalStepNames: steps.map(s => ({ id: s.id, name: s.name })),
      currentStepId,
    });
  }
  
  // Build route - use product slug if provided, otherwise use step route as-is
  const getStepRoute = (step: Step) => {
    if (productSlug) {
      // Product-based routing: /products/[slug]/configurator/[step]
      // Use step.id directly (route is just the step ID for product configs)
      return `/products/${productSlug}/configurator/${step.id}`;
    }
    // For legacy routing, use the full route path
    return step.route;
  };

  // Navigate without page reload - update URL directly without Next.js router
  const handleStepClick = (step: Step) => {
    const route = getStepRoute(step);
    // Update URL directly using history API (no Next.js navigation = no reload)
    window.history.pushState({}, '', route);
    // Dispatch custom event to notify page component
    window.dispatchEvent(new CustomEvent('stepchange', { detail: { route } }));
  };

  return (
    <nav className="w-full" aria-label="Configurator steps">
      <ol className="flex items-start w-full relative">
        {/* Connector lines between steps only (not before first or after last) */}
        {steps.map((step, index) => {
          // Skip if this is the last step (no connector after it)
          if (index >= steps.length - 1) return null;
          
          // Each step container is flex-1 (equal width = 100/n%)
          // Connector spans from center of current step to center of next step
          const stepWidthPercent = 100 / steps.length;
          // Start at center of current step, end at center of next step
          const leftPercent = (index + 0.5) * stepWidthPercent;
          const widthPercent = stepWidthPercent; // One full step width
          
          return (
            <div
              key={`connector-${index}`}
              className="absolute top-5 h-0.5"
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                backgroundColor: "#E2DEDA", // Light warm grey
                zIndex: 1
              }}
            />
          );
        })}
        
        {steps.map((step, index) => {
          const isActive = step.id === currentStepId;
          const isCompleted = index < currentIndex;

          return (
            <li key={step.id} className="flex flex-col items-center flex-1 relative z-10">
              {/* Circle - fixed position, always aligned */}
              <button
                onClick={() => handleStepClick(step)}
                className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity w-full"
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors flex-shrink-0 relative z-10 ${
                    isActive
                      ? "bg-[#303337] border-[#303337] text-white"
                      : isCompleted
                      ? "bg-gray-300 border-gray-300 text-white"
                      : "bg-gray-300 border-gray-300 text-white"
                  }`}
                >
                  <span className="text-sm font-medium">{index + 1}</span>
                </div>
                    {/* Text below - fixed height container to keep circles aligned */}
                    <div className="mt-2 h-10 md:h-12 flex items-start justify-center w-full">
                      <span
                        className={`text-xs md:text-sm font-medium text-center leading-tight px-1 ${
                          isActive
                            ? "text-[#303337]"
                            : "text-[#908F8D]"
                        }`}
                        style={{ maxWidth: "80px" }}
                      >
                        {step.name}
                      </span>
                    </div>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

