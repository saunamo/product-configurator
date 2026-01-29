"use client";

import React, { useRef, useEffect } from "react";
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
  
  // Refs for scrolling to active step on mobile
  const navRef = useRef<HTMLElement>(null);
  const stepRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  
  // Auto-scroll to active step on mobile when step changes
  useEffect(() => {
    if (!navRef.current || currentIndex === -1) return;
    
    // Small delay to ensure DOM has updated
    const timeoutId = setTimeout(() => {
      const activeStep = steps[currentIndex];
      const activeStepElement = stepRefs.current.get(activeStep.id);
      
      if (activeStepElement && navRef.current) {
        // Check if we're on mobile (viewport width < 640px, which is Tailwind's sm breakpoint)
        const isMobile = window.innerWidth < 640;
        
        if (isMobile) {
          // Get the container and step positions
          const container = navRef.current;
          const stepRect = activeStepElement.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          
          // Calculate scroll position to center the active step
          const stepCenter = stepRect.left + stepRect.width / 2;
          const containerCenter = containerRect.width / 2;
          const scrollLeft = container.scrollLeft + (stepCenter - containerRect.left - containerCenter);
          
          // Smooth scroll to center the active step
          container.scrollTo({
            left: Math.max(0, scrollLeft), // Ensure we don't scroll to negative values
            behavior: 'smooth'
          });
        }
      }
    }, 100); // Small delay to ensure layout is complete
    
    return () => clearTimeout(timeoutId);
  }, [currentStepId, currentIndex, steps]);
  
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
    <nav 
      ref={navRef}
      className="w-full overflow-x-auto stepper-scroll" 
      aria-label="Configurator steps"
    >
      <ol className="flex items-start w-full relative min-w-max">
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
              className="absolute top-4 sm:top-5 h-0.5"
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
            <li 
              key={step.id} 
              ref={(el) => {
                if (el) {
                  stepRefs.current.set(step.id, el);
                } else {
                  stepRefs.current.delete(step.id);
                }
              }}
              className="flex flex-col items-center flex-1 relative z-10 min-w-[60px] sm:min-w-[80px]"
            >
              {/* Circle - fixed position, always aligned */}
              <button
                onClick={() => handleStepClick(step)}
                className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity w-full px-1"
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-colors flex-shrink-0 relative z-10 ${
                    isActive
                      ? "bg-[#303337] border-[#303337] text-white"
                      : isCompleted
                      ? "bg-gray-300 border-gray-300 text-white"
                      : "bg-gray-300 border-gray-300 text-white"
                  }`}
                >
                  <span className="text-xs sm:text-sm font-medium">{index + 1}</span>
                </div>
                    {/* Text below - fixed height container to keep circles aligned */}
                    <div className="mt-1.5 sm:mt-2 h-8 sm:h-10 md:h-12 flex items-start justify-center w-full">
                      <span
                        className={`text-[10px] xs:text-xs sm:text-xs md:text-sm font-medium text-center leading-tight px-0.5 sm:px-1 ${
                          isActive
                            ? "text-[#303337]"
                            : "text-[#908F8D]"
                        }`}
                        style={{ 
                          maxWidth: "100%",
                          wordBreak: "break-word",
                          hyphens: "auto"
                        }}
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

