import { Step } from "@/types/configurator";

export const STEPS: Step[] = [
  {
    id: "rear-glass-wall",
    name: "Rear Wall",
    route: "/configurator/rear-glass-wall",
  },
  {
    id: "heater",
    name: "Heater",
    route: "/configurator/heater",
  },
  {
    id: "lighting",
    name: "Lighting",
    route: "/configurator/lighting",
  },
  {
    id: "aromas-accessories",
    name: "Aromas & Sauna Accessories",
    route: "/configurator/aromas-accessories",
  },
  {
    id: "electrical-assembly",
    name: "Installation & Wood Treatment",
    route: "/configurator/electrical-assembly",
  },
  {
    id: "cold-plunge",
    name: "Cold Plunge",
    route: "/configurator/cold-plunge",
  },
  {
    id: "delivery",
    name: "Delivery",
    route: "/configurator/delivery",
  },
];

export const STEP_ROUTES = STEPS.map((step) => step.route);
export const DEFAULT_STEP = STEPS[0];



