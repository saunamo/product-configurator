import { StepData } from "@/types/configurator";

export const hotTubsData: StepData = {
  stepId: "hot-tubs",
  title: "Hot Tubs",
  description: "Add a hot tub experience to complement your sauna",
  selectionType: "single", // Only one option can be selected
  required: false,
  options: [
    {
      id: "hot-tub-basic",
      title: "Basic Hot Tub",
      description: "Compact hot tub with basic features",
      imageUrl: "/images/hot-tub-basic.jpg",
      price: 3000,
    },
    {
      id: "hot-tub-premium",
      title: "Premium Hot Tub",
      description: "Advanced hot tub with temperature control and jets",
      imageUrl: "/images/hot-tub-premium.jpg",
      price: 5500,
    },
    {
      id: "hot-tub-none",
      title: "No Hot Tub",
      description: "Continue without hot tub",
      imageUrl: "/images/hot-tub-none.jpg",
      price: 0,
    },
  ],
};
