import { StepData } from "@/types/configurator";

export const aromasAccessoriesData: StepData = {
  stepId: "aromas-accessories",
  title: "Aromas & Sauna Accessories",
  description: "Enhance your sauna experience with aromas and accessories",
  selectionType: "multi", // Multiple options can be selected
  required: false,
  options: [
    {
      id: "aroma-essentials",
      title: "Aroma Essential Set",
      description: "Curated collection of eucalyptus, birch, and pine essential oils",
      imageUrl: "/images/aroma-essentials.jpg",
      price: 45,
    },
    {
      id: "accessory-bucket",
      title: "Traditional Water Bucket",
      description: "Handcrafted wooden bucket with ladle for authentic sauna ritual",
      imageUrl: "/images/accessory-bucket.jpg",
      price: 85,
    },
    {
      id: "accessory-timer",
      title: "Sauna Timer",
      description: "Premium hourglass timer for perfect sauna sessions",
      imageUrl: "/images/accessory-timer.jpg",
      price: 35,
    },
    {
      id: "accessory-towels",
      title: "Premium Sauna Towels",
      description: "Set of 4 organic cotton sauna towels",
      imageUrl: "/images/accessory-towels.jpg",
      price: 120,
    },
  ],
};



