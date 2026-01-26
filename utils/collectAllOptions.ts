/**
 * Utility to collect all unique steps and options from all products
 * This is used to build the comprehensive global settings
 */

import { getAllProducts, getProductConfig } from "./productStorage";
import { stepDataMap } from "@/data";
import { StepData } from "@/types/configurator";

export type CollectedOption = {
  stepId: string;
  stepTitle: string;
  optionId: string;
  optionTitle: string;
  optionDescription?: string;
  defaultImageUrl?: string;
  defaultPrice?: number;
};

export type CollectedStep = {
  stepId: string;
  stepTitle: string;
  options: CollectedOption[];
};

/**
 * Collect all unique steps and options from:
 * 1. Default step data (from /data files)
 * 2. All product configurations
 */
export async function collectAllStepsAndOptions(): Promise<{
  steps: CollectedStep[];
  allOptions: CollectedOption[];
}> {
  // Start with default step data
  const stepMap = new Map<string, CollectedStep>();
  const optionMap = new Map<string, CollectedOption>();

  // Add all default steps and options
  Object.values(stepDataMap).forEach((stepData: StepData) => {
    const stepId = stepData.stepId;
    const stepTitle = stepData.title;
    
    if (!stepMap.has(stepId)) {
      stepMap.set(stepId, {
        stepId,
        stepTitle,
        options: [],
      });
    }

    const step = stepMap.get(stepId)!;

    // Add all options from this step
    stepData.options.forEach((option) => {
      const optionKey = `${stepId}:${option.id}`;
      if (!optionMap.has(optionKey)) {
        const collectedOption: CollectedOption = {
          stepId,
          stepTitle,
          optionId: option.id,
          optionTitle: option.title,
          optionDescription: option.description,
          defaultImageUrl: option.imageUrl,
          defaultPrice: option.price,
        };
        optionMap.set(optionKey, collectedOption);
        step.options.push(collectedOption);
      }
    });
  });

  // Now collect from all product configurations
  if (typeof window !== "undefined") {
    const products = getAllProducts();
    
    for (const product of products) {
      try {
        const productConfig = await getProductConfig(product.id);
        if (!productConfig) continue;

        // Collect from product-specific step data
        if (productConfig.stepData) {
          Object.entries(productConfig.stepData).forEach(([stepId, stepData]) => {
            const stepTitle = stepData.title;
            
            if (!stepMap.has(stepId)) {
              stepMap.set(stepId, {
                stepId,
                stepTitle,
                options: [],
              });
            }

            const step = stepMap.get(stepId)!;

            // Add all options from this step
            stepData.options.forEach((option) => {
              const optionKey = `${stepId}:${option.id}`;
              if (!optionMap.has(optionKey)) {
                const collectedOption: CollectedOption = {
                  stepId,
                  stepTitle,
                  optionId: option.id,
                  optionTitle: option.title,
                  optionDescription: option.description,
                  defaultImageUrl: option.imageUrl,
                  defaultPrice: option.price,
                };
                optionMap.set(optionKey, collectedOption);
                step.options.push(collectedOption);
              }
            });
          });
        }
      } catch (error) {
        console.error(`Error collecting options from product ${product.id}:`, error);
      }
    }
  }

  const steps = Array.from(stepMap.values()).sort((a, b) => {
    // Sort by step ID to maintain consistent order
    return a.stepId.localeCompare(b.stepId);
  });

  const allOptions = Array.from(optionMap.values());

  return { steps, allOptions };
}

/**
 * Get a unique key for an option in global settings
 */
export function getGlobalOptionKey(stepId: string, optionId: string, productType?: "cube" | "barrel"): string {
  if (productType) {
    return `${productType}_${optionId}`;
  }
  return optionId;
}
