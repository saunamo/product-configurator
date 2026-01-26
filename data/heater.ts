import { StepData } from "@/types/configurator";

export const heaterData: StepData = {
  stepId: "heater",
  title: "Heater",
  description: "Choose your sauna heater",
  selectionType: "single", // Only one option can be selected
  required: true,
  options: [
    {
      id: "heater-standard",
      title: "Standard Heater",
      description: "Reliable 6kW electric heater with digital controls",
      imageUrl: "/images/heater-standard.jpg",
      price: 1200,
    },
    {
      id: "heater-premium",
      title: "Premium Heater",
      description: "Advanced 9kW heater with WiFi connectivity and app control",
      imageUrl: "/images/heater-premium.jpg",
      price: 1800,
    },
    {
      id: "heater-wood",
      title: "Wood-Fired Heater",
      description: "Traditional wood-burning heater for authentic sauna experience",
      imageUrl: "/images/heater-wood.jpg",
      price: 2500,
    },
    {
      id: "heater-stone-according-to-heater",
      title: "According to selected heater",
      description: "Heater stones quantity and price calculated based on selected heater model",
      imageUrl: "/images/heater-stones.jpg",
      price: 0, // Price will be calculated dynamically
    },
  ],
};



