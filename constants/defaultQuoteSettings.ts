import { QuoteSettings } from "@/types/admin";

export const defaultQuoteSettings: QuoteSettings = {
  // Company Information
  companyName: "Saunamo, Arbor Eco LDA",
  companyAddress: "",
  companyCity: "",
  companyState: "",
  companyZip: "",
  companyCountry: "",
  companyPhone: "",
  companyEmail: "",
  companyWebsite: "",
  
  // Logo
  companyLogoUrl: "",
  
  // Quote Settings
  quoteValidityDays: 30,
  taxRate: 0,
  taxEnabled: false,
  currency: "GBP",
  
  // Discount Campaigns
  discountCampaigns: [],
  
  // Terms & Conditions
  termsAndConditions: "This quote is valid for the specified period. Prices are subject to change without notice. Payment terms: Net 30 days.",
  paymentTerms: "Payment is due within 30 days of invoice date. Late payments may incur additional fees.",
  notes: "",
  
  // Footer
  footerText: "Thank you for your interest. For questions, please contact us at the information above.",
};

