import { StepData, Step } from "./configurator";

export type DesignConfig = {
  // Colors
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  cardBackgroundColor: string;
  borderColor: string;
  
  // Typography
  fontFamily: string;
  headingFontSize: string;
  bodyFontSize: string;
  
  // Spacing
  cardPadding: string;
  sectionSpacing: string;
  borderRadius: string;
  
  // Layout
  imageWidth: string; // Percentage for left image
  panelWidth: string; // Percentage for right panel
};

export type DiscountCampaign = {
  id: string;
  name: string;
  description?: string;
  discountType: "percentage" | "fixed"; // Percentage or fixed amount
  discountValue: number; // Percentage (0-100) or fixed amount
  appliesTo: "all" | "specific"; // Apply to all products or specific ones
  productIds?: string[]; // Product IDs from configurator if appliesTo is "specific"
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type QuoteSettings = {
  // Company Information
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
  companyZip: string;
  companyCountry: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  
  // Logo
  companyLogoUrl: string;
  
  // Quote Settings
  quoteValidityDays: number; // How long quote is valid
  taxRate: number; // Tax rate as decimal (e.g., 0.23 for 23%)
  taxEnabled: boolean; // Whether to show tax on quotes
  currency: string; // Currency code (USD, EUR, etc.)
  
  // Discount Campaigns
  discountCampaigns?: DiscountCampaign[];
  
  // Terms & Conditions
  termsAndConditions: string; // Terms text
  paymentTerms: string; // Payment terms text
  notes: string; // Default notes on quotes
  
  // Footer
  footerText: string; // Footer text on quote
};

export type GlobalStepOptionConfig = {
  // Global step names (applies to all products)
  stepNames?: Record<string, string>; // stepId -> stepName
  // Global subheaders for steps (applies to all products)
  stepSubheaders?: Record<string, string>; // stepId -> subheaderText
  // Global images for steps (applies to all products)
  stepImages?: Record<string, string>; // stepId -> imageUrl
  // Global images for options (applies to all products)
  optionImages?: Record<string, string>; // optionId -> imageUrl
  // Global titles for options (applies to all products)
  optionTitles?: Record<string, string>; // optionId -> optionTitle
  // Global Pipedrive product links for options (applies to all products)
  optionPipedriveProducts?: Record<string, number>; // optionId -> pipedriveProductId
  // Global included flags for options (applies to all products)
  optionIncluded?: Record<string, boolean>; // optionId -> isIncluded (default: false)
  // Global "More information" button settings for steps
  stepMoreInfoEnabled?: Record<string, boolean>; // stepId -> enabled (default: false)
  stepMoreInfoUrl?: Record<string, string>; // stepId -> url
};

export type AdminConfig = {
  productName: string;
  steps: Step[];
  stepData: Record<string, StepData>;
  mainProductImageUrl?: string;
  design: DesignConfig;
  // Price source configuration
  priceSource?: "pipedrive" | "manual";
  // Quote settings
  quoteSettings?: QuoteSettings;
  // Global settings (applies to all products)
  globalSettings?: GlobalStepOptionConfig;
};

export type AdminConfigContextType = {
  config: AdminConfig | null;
  updateConfig: (config: Partial<AdminConfig>) => void;
  saveConfig: () => void;
  loadConfig: () => void;
  resetConfig: () => void;
  exportConfig: () => void;
  importConfig: (configJson: string) => void;
  isDirty: boolean;
  saveStatus: "saved" | "saving" | null;
};

