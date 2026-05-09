import { Quote } from "@/types/quote";
import { trackConfiguratorQuoteRequested } from "./klaviyo";
import {
  sendConfiguratorInternalWhatsAppAlert,
  sendConfiguratorWhatsAppTouch,
} from "./timelines";

type ConfiguratorFollowupPayload = {
  quote: Quote;
  quotePortalUrl: string;
  productId?: string;
  productSlug?: string;
  productImageUrl?: string;
  pipedriveDealId?: number;
  pipedriveDealUrl?: string;
  customerAddress?: string;
  deliveryLocation?: string;
  attribution?: Record<string, string>;
  smsConsent?: boolean;
  whatsappConsent?: boolean;
};

export async function triggerConfiguratorFollowup(payload: ConfiguratorFollowupPayload) {
  const results: Record<string, unknown> = {};

  try {
    results.klaviyo = await trackConfiguratorQuoteRequested(payload);
  } catch (error: any) {
    results.klaviyo = { success: false, error: error?.message || String(error) };
    console.error("[Followup] Klaviyo event failed:", error?.message || error);
  }

  try {
    results.customerWhatsApp = await sendConfiguratorWhatsAppTouch(payload);
  } catch (error: any) {
    results.customerWhatsApp = { success: false, error: error?.message || String(error) };
    console.error("[Followup] Customer WhatsApp failed:", error?.message || error);
  }

  try {
    results.internalWhatsAppAlert = await sendConfiguratorInternalWhatsAppAlert(payload);
  } catch (error: any) {
    results.internalWhatsAppAlert = { success: false, error: error?.message || String(error) };
    console.error("[Followup] Internal WhatsApp alert failed:", error?.message || error);
  }

  return results;
}
