import { StepData } from "@/types/configurator";

export const coldPlungeData: StepData = {
  stepId: "cold-plunge",
  title: "Ice Bath",
  description: "Add an ice bath experience to complement your sauna",
  selectionType: "single",
  required: false,
  options: [
    {
      id: "cold-plunge-basic",
      title: "Basic Cold Plunge",
      description: "Compact cold plunge tub with basic features",
      imageUrl: "/images/cold-plunge-basic.jpg",
      price: 2500,
    },
    {
      id: "cold-plunge-premium",
      title: "Premium Cold Plunge",
      description: "Advanced cold plunge with temperature control and filtration",
      imageUrl: "/images/cold-plunge-premium.jpg",
      price: 4500,
    },
    {
      id: "cold-plunge-none",
      title: "No Cold Plunge",
      description: "Continue without cold plunge",
      imageUrl: "/images/cold-plunge-none.jpg",
      price: 0,
    },
  ],
};



