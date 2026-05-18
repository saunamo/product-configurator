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

const COUNTRY_PREFIX_BY_MARKET: Record<string, string> = {
  uk: "44",
  en: "44",
  es: "34",
  pt: "351",
  fr: "33",
  it: "39",
};

function inferMarketFromQuoteUrl(url?: string) {
  const value = (url || "").toLowerCase();
  if (value.includes("saunamo.shop")) return "uk";
  if (value.includes("saunamo.co.uk") || value.includes("config.saunamo.co.uk")) return "uk";
  if (value.includes("saunamo.es")) return "es";
  if (value.includes("saunamo.pt")) return "pt";
  if (value.includes("saunamo.fr")) return "fr";
  if (value.includes("saunamo.it")) return "it";
  return process.env.SAUNAMO_DEFAULT_PHONE_MARKET || "";
}

function normalizePhone(phone?: string, market?: string) {
  if (!phone) return "";
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) return `+${trimmed.replace(/\D/g, "")}`;
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  const prefix = COUNTRY_PREFIX_BY_MARKET[(market || "").toLowerCase()];
  if (!prefix) return digits;
  if (digits.startsWith(prefix) && digits.length > prefix.length + 5) return `+${digits}`;
  if (digits.startsWith("0")) digits = digits.slice(1);
  return `+${prefix}${digits}`;
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
  const market = inferMarketFromQuoteUrl(payload.quotePortalUrl);
  const phone = normalizePhone(payload.quote.customerPhone, market);
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
  const market = inferMarketFromQuoteUrl(payload.quotePortalUrl);
  const salesPhone = normalizePhone(process.env.SAUNAMO_SALES_WHATSAPP_PHONE, market);
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
