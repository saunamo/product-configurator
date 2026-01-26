import { StepData } from "@/types/configurator";

export const electricalAssemblyData: StepData = {
  stepId: "electrical-assembly",
  title: "Electrical Installation & Sauna Assembly",
  description: "Select installation and assembly services",
  selectionType: "multi", // Multiple options can be selected
  required: false,
  options: [
    {
      id: "electrical-installation",
      title: "Electrical Installation",
      description: "Professional electrical installation by certified electricians",
      imageUrl: "/images/electrical-installation.jpg",
      price: 800,
    },
    {
      id: "sauna-assembly",
      title: "Sauna Assembly",
      description: "Complete assembly service by our expert team",
      imageUrl: "/images/sauna-assembly.jpg",
      price: 1200,
    },
    {
      id: "full-service",
      title: "Full Service Package",
      description: "Complete electrical installation and assembly service",
      imageUrl: "/images/full-service.jpg",
      price: 1800,
    },
  ],
};



