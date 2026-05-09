import { Quote } from "@/types/quote";

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

const KLAVIYO_API_BASE = "https://a.klaviyo.com/api";
const KLAVIYO_REVISION = process.env.KLAVIYO_API_REVISION || "2024-10-15";

function formatDate(value?: Date) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

function quoteCategory(productName: string) {
  const name = productName.toLowerCase();
  if (name.includes("aura") || name.includes("aisti") || name.includes("thermo black")) return "interior";
  if (name.includes("cube") || name.includes("barrel") || name.includes("hiki")) return "exterior";
  return "sauna";
}

export async function trackConfiguratorQuoteRequested(payload: ConfiguratorFollowupPayload) {
  const privateKey = process.env.KLAVIYO_PRIVATE_API_KEY;
  if (!privateKey) {
    console.log("[Klaviyo] KLAVIYO_PRIVATE_API_KEY not configured, skipping event");
    return { success: false, skipped: true, reason: "missing_key" };
  }

  const { quote } = payload;
  const response = await fetch(`${KLAVIYO_API_BASE}/events/`, {
    method: "POST",
    headers: {
      Authorization: `Klaviyo-API-Key ${privateKey}`,
      "Content-Type": "application/json",
      accept: "application/json",
      revision: KLAVIYO_REVISION,
    },
    body: JSON.stringify({
      data: {
        type: "event",
        attributes: {
          metric: {
            data: {
              type: "metric",
              attributes: {
                name: "Configurator Quote Requested",
              },
            },
          },
          profile: {
            data: {
              type: "profile",
              attributes: {
                email: quote.customerEmail,
                phone_number: quote.customerPhone || undefined,
                first_name: quote.customerName || undefined,
                properties: {
                  saunamo_lead_type: "configurator_quote",
                  saunamo_latest_quote_id: quote.id,
                  saunamo_latest_product_name: quote.productName,
                  saunamo_latest_quote_total: quote.total,
                  saunamo_latest_quote_url: payload.quotePortalUrl,
                  saunamo_latest_pipedrive_deal_id: payload.pipedriveDealId,
                  saunamo_latest_pipedrive_deal_url: payload.pipedriveDealUrl,
                  saunamo_sms_consent: !!payload.smsConsent,
                  saunamo_whatsapp_consent: !!payload.whatsappConsent,
                },
              },
            },
          },
          properties: {
            quote_id: quote.id,
            product_id: payload.productId,
            product_slug: payload.productSlug,
            product_name: quote.productName,
            product_category: quoteCategory(quote.productName),
            product_image_url: payload.productImageUrl,
            quote_total: quote.total,
            quote_subtotal: quote.subtotal,
            quote_tax: quote.tax || 0,
            quote_url: payload.quotePortalUrl,
            quote_created_at: formatDate(quote.createdAt),
            quote_expires_at: formatDate(quote.expiresAt),
            customer_name: quote.customerName,
            customer_phone: quote.customerPhone,
            customer_address: payload.customerAddress || quote.customerAddress,
            delivery_location: payload.deliveryLocation || quote.deliveryLocation,
            pipedrive_deal_id: payload.pipedriveDealId,
            pipedrive_deal_url: payload.pipedriveDealUrl,
            sms_consent: !!payload.smsConsent,
            whatsapp_consent: !!payload.whatsappConsent,
            attribution: payload.attribution || {},
            items: quote.items.map((item) => ({
              step_name: item.stepName,
              option_title: item.optionTitle,
              price: item.price,
              quantity: item.quantity || 1,
              total: item.price * (item.quantity || 1),
            })),
            item_count: quote.items.length,
          },
          unique_id: `configurator_quote_${quote.id}`,
          time: formatDate(quote.createdAt),
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Klaviyo event failed: ${response.status} ${errorText}`);
  }

  return { success: true };
}
