import { StepData } from "@/types/configurator";

export const rearGlassWallData: StepData = {
  stepId: "rear-glass-wall",
  title: "Rear Wall Options",
  description: "Choose your rear glass wall option for barrel and cube saunas",
  selectionType: "single", // Only one option can be selected
  required: true,
  options: [
    {
      id: "glass-standard",
      title: "Standard Glass Wall",
      description: "Premium tempered glass with standard finish",
      imageUrl: "/images/glass-standard.jpg",
      price: 0,
    },
    {
      id: "glass-half-moon",
      title: "Half Moon Glass Wall",
      description: "Elegant half moon design for enhanced aesthetics",
      imageUrl: "/cube-back-moon.jpg", // Default for cube models, will be overridden for barrel
      price: 0,
    },
    {
      id: "glass-frosted",
      title: "Frosted Glass Wall",
      description: "Elegant frosted finish for enhanced privacy",
      imageUrl: "/images/glass-frosted.jpg",
      price: 250,
    },
    {
      id: "glass-clear",
      title: "Clear Glass Wall",
      description: "Crystal clear glass for maximum visibility",
      imageUrl: "/images/glass-clear.jpg",
      price: 150,
    },
    {
      id: "wooden-backwall",
      title: "Wooden backwall",
      description: "Traditional wooden back wall option",
      imageUrl: "/cube-full-back-wall.jpg", // Default for cube, will be overridden for barrel
      price: 0,
    },
    {
      id: "full-glass-backwall",
      title: "Full glass backwall",
      description: "Full glass back wall for maximum visibility",
      imageUrl: "/barrel-full-glass-wall.webp", // For barrel models
      price: 0,
    },
  ],
};



