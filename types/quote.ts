import { StepId } from "./configurator";

export type QuoteItem = {
  stepId: StepId;
  stepName: string;
  optionId: string;
  optionTitle: string;
  optionDescription: string;
  price: number;
  vatRate?: number; // VAT rate as decimal (e.g., 0.23 for 23%)
  quantity?: number; // Quantity (defaults to 1)
  priceLabel?: string; // Custom price label (e.g., "POA" for Price on Application)
  lightingMultiplier?: number; // Multiplier for lighting options (e.g., 2 for "2x 2.5m LED")
  baseLightingOptionId?: string; // Base option ID for lighting price calculation
  heaterStonesCalculatedPrice?: number; // Calculated price for heater stones based on selected heater
  heaterStonesQuantity?: number; // Number of stone packages needed (kg / 20)
};

export type Quote = {
  id: string;
  productName: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  items: QuoteItem[];
  subtotal: number;
  discount?: number;
  discountDescription?: string; // Description of applied discount campaign
  tax?: number;
  taxRate?: number;
  total: number;
  createdAt: Date;
  expiresAt?: Date;
  notes?: string;
};

export type QuoteGenerationRequest = {
  productId?: string; // For multi-product support
  productName?: string; // Product name if config not provided
  productConfig?: any; // Full product config (since server can't access localStorage)
  selections: {
    [key in StepId]?: string[];
  };
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  deliveryLocation?: string; // Delivery location for "Delivery Outside UK" option
};

