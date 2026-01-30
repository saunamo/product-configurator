import { StepData } from "@/types/configurator";

export const deliveryData: StepData = {
  stepId: "delivery",
  title: "Delivery",
  description: "Choose your delivery option",
  selectionType: "single",
  required: true,
  options: [
    {
      id: "delivery-standard",
      title: "Standard Delivery UK",
      description: "Curbside delivery within 2-3 weeks",
      imageUrl: "",
      price: 200,
    },
    {
      id: "delivery-outside-uk",
      title: "Delivery Outside UK",
      description: "International delivery - price will be confirmed separately",
      imageUrl: "",
      price: 0,
      priceLabel: "Price to be confirmed",
    },
  ],
};



