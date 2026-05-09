import { Quote } from "@/types/quote";

type TimelinesMessagePayload = {
  phone: string;
  text: string;
  label?: string;
  whatsappAccountId?: string;
};

type WhatsAppFollowupPayload = {
  quote: Quote;
  quotePortalUrl: string;
  pipedriveDealUrl?: string;
  whatsappConsent?: boolean;
};

const TIMELINES_API_BASE = "https://app.timelines.ai/integrations/api";

function normalizePhone(phone?: string) {
  if (!phone) return "";
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) return trimmed.replace(/[^\d+]/g, "");
  return trimmed.replace(/\D/g, "");
}

async function sendTimelinesMessage(payload: TimelinesMessagePayload) {
  const token = process.env.TIMELINES_AI_API_TOKEN;
  if (!token) {
    console.log("[Timelines] TIMELINES_AI_API_TOKEN not configured, skipping WhatsApp message");
    return { success: false, skipped: true, reason: "missing_token" };
  }

  const body: Record<string, string> = {
    phone: payload.phone,
    text: payload.text,
  };
  if (payload.label) body.label = payload.label;
  if (payload.whatsappAccountId) body.whatsapp_account_id = payload.whatsappAccountId;

  const response = await fetch(`${TIMELINES_API_BASE}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Timelines message failed: ${response.status} ${errorText}`);
  }

  return { success: true, data: await response.json().catch(() => undefined) };
}

export async function sendConfiguratorWhatsAppTouch(payload: WhatsAppFollowupPayload) {
  const phone = normalizePhone(payload.quote.customerPhone);
  if (!phone || !payload.whatsappConsent) {
    return { success: false, skipped: true, reason: "no_customer_whatsapp_consent" };
  }

  const text = [
    `Hi ${payload.quote.customerName || "there"}, this is Saunamo.`,
    "",
    `I just sent your ${payload.quote.productName} quote by email. Here is the online version as well:`,
    payload.quotePortalUrl,
    "",
    "Would you like us to check the best heater, delivery, and installation setup for your space before you decide?",
  ].join("\n");

  return sendTimelinesMessage({
    phone,
    text,
    label: "configurator-quote",
    whatsappAccountId: process.env.TIMELINES_AI_WHATSAPP_ACCOUNT_ID,
  });
}

export async function sendConfiguratorInternalWhatsAppAlert(payload: WhatsAppFollowupPayload) {
  const salesPhone = normalizePhone(process.env.SAUNAMO_SALES_WHATSAPP_PHONE);
  if (!salesPhone) {
    console.log("[Timelines] SAUNAMO_SALES_WHATSAPP_PHONE not configured, skipping internal alert");
    return { success: false, skipped: true, reason: "missing_sales_phone" };
  }

  const phoneLine = payload.quote.customerPhone ? `Phone: ${payload.quote.customerPhone}` : "Phone: not provided";
  const text = [
    "New configurator quote needs follow-up",
    "",
    `Customer: ${payload.quote.customerName || payload.quote.customerEmail}`,
    `Email: ${payload.quote.customerEmail}`,
    phoneLine,
    `Product: ${payload.quote.productName}`,
    `Total: ${payload.quote.total}`,
    `Quote: ${payload.quotePortalUrl}`,
    payload.pipedriveDealUrl ? `Pipedrive: ${payload.pipedriveDealUrl}` : "",
    "",
    payload.whatsappConsent
      ? "Customer gave WhatsApp consent. Send a personal note now."
      : "No WhatsApp consent captured. Use email/call unless consent is confirmed.",
  ].filter(Boolean).join("\n");

  return sendTimelinesMessage({
    phone: salesPhone,
    text,
    label: "configurator-sales-alert",
    whatsappAccountId: process.env.TIMELINES_AI_WHATSAPP_ACCOUNT_ID,
  });
}
