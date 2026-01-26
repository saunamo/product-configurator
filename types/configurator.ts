export type StepId = string; // Made flexible for dynamic steps

export type Step = {
  id: StepId;
  name: string;
  route: string;
};

export type Option = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  // External price integration
  shopifyProductId?: string; // Shopify product ID for price sync
  pipedriveFieldId?: string; // Pipedrive custom field ID for price sync
  pipedriveProductId?: number; // Pipedrive product ID from product catalog
};

export type StepData = {
  stepId: StepId;
  title: string;
  description?: string;
  subtext?: string; // Text displayed below the options list
  imageUrl?: string; // Image for the step (shown in configurator)
  options: Option[];
  selectionType: "single" | "multi";
  required: boolean;
};

export type ConfiguratorState = {
  selections: {
    [key in StepId]?: string[]; // Array of selected option IDs
  };
};

export type ConfiguratorContextType = {
  state: ConfiguratorState;
  updateSelection: (stepId: StepId, optionIds: string[]) => void;
  getSelection: (stepId: StepId) => string[];
  isStepComplete: (stepId: StepId, stepData: StepData) => boolean;
};

