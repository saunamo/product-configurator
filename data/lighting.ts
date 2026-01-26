import { StepData } from "@/types/configurator";

export const lightingData: StepData = {
  stepId: "lighting",
  title: "Lighting",
  description: "Select your preferred lighting configuration",
  selectionType: "single", // Only one option can be selected
  required: true,
  options: [
    {
      id: "lighting-under-bench",
      title: "Under Bench",
      description: "Subtle lighting installed under the bench for ambient illumination",
      imageUrl: "/images/lighting-under-bench.jpg",
      price: 350,
    },
    {
      id: "lighting-under-bench-backrests",
      title: "Under Bench + Behind Backrests",
      description: "Comprehensive lighting solution with under bench and backrest illumination",
      imageUrl: "/images/lighting-under-bench-backrests.jpg",
      price: 550,
    },
    {
      id: "lighting-wall-only",
      title: "Wall Light Only",
      description: "Minimalist wall-mounted lighting for focused illumination",
      imageUrl: "/images/lighting-wall-only.jpg",
      price: 200,
    },
  ],
};



