import { StepData } from "@/types/configurator";
import { stepDataMap } from "@/data";
import { loadConfigFromStorage } from "./configStorage";

export async function getStepData(stepId: string): Promise<StepData | undefined> {
  // Try to load from admin config first
  const adminConfig = await loadConfigFromStorage();
  if (adminConfig?.stepData[stepId]) {
    return adminConfig.stepData[stepId];
  }
  // Fall back to default data
  return stepDataMap[stepId];
}

export async function getProductName(): Promise<string> {
  const adminConfig = await loadConfigFromStorage();
  return adminConfig?.productName || "The Skuare";
}

export async function getMainProductImageUrl(): Promise<string | undefined> {
  const adminConfig = await loadConfigFromStorage();
  return adminConfig?.mainProductImageUrl;
}



