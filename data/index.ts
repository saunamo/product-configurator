import { StepData } from "@/types/configurator";
import { rearGlassWallData } from "./rearGlassWall";
import { lightingData } from "./lighting";
import { heaterData } from "./heater";
import { aromasAccessoriesData } from "./aromasAccessories";
import { electricalAssemblyData } from "./electricalAssembly";
import { deliveryData } from "./delivery";
import { coldPlungeData } from "./coldPlunge";
import { hotTubsData } from "./hotTubs";

export const stepDataMap: Record<string, StepData> = {
  "rear-glass-wall": rearGlassWallData,
  lighting: lightingData,
  heater: heaterData,
  "aromas-accessories": aromasAccessoriesData,
  "electrical-assembly": electricalAssemblyData,
  delivery: deliveryData,
  "cold-plunge": coldPlungeData,
  "hot-tubs": hotTubsData,
};

export function getStepData(stepId: string): StepData | undefined {
  return stepDataMap[stepId];
}



