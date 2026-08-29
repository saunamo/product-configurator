import type { Quote } from "@/types/quote";

export type OsLeadIntakeResult = {
  ok: true;
  status: "accepted" | "duplicate";
  os: {
    pipeline: string;
    stage: string;
    contact_id: string;
    deal_id: string;
  };
  agent_task: {
    id: string;
    queued: boolean;
    already_completed: boolean;
    customer_send_authorized: false;
  };
  configurator_quote: {
    id: string | null;
    activity_id: string | null;
    hydrated: boolean;
  };
};

type ConfiguratorLeadInput = {
  quote: Quote;
  quotePortalUrl: string;
  productId?: string;
  productSlug?: string;
  deliveryLocation?: string;
  attribution?: Record<string, string>;
};

export async function sendConfiguratorLeadToOs(
  input: ConfiguratorLeadInput,
  timeoutMs = 15_000
): Promise<OsLeadIntakeResult> {
  const endpoint = (process.env.SAUNAMO_OS_LEAD_INTAKE_URL || "").trim();
  const key = (process.env.SAUNAMO_OS_LEAD_INTAKE_KEY || "").trim();
  if (!endpoint || !key) {
    throw new Error("Direct OS lead intake is not configured");
  }

  const location = (
    input.quote.customerAddress ||
    input.deliveryLocation ||
    ""
  ).trim();
  const selectedProducts = input.quote.items.map((item) =>
    `${item.optionTitle} × ${item.quantity || 1}`
  );
  const payload = {
    source: "configurator",
    source_event_id: input.quote.id,
    market: "UK",
    stage: "complete",
    contact: {
      name: input.quote.customerName || "",
      email: input.quote.customerEmail,
      phone: input.quote.customerPhone || "",
      location,
    },
    request: {
      message: input.quote.notes || "",
      product_name: input.quote.productName,
      product_id: input.productId || input.productSlug,
      quote_id: input.quote.id,
      quote_url: input.quotePortalUrl,
      selected_products: selectedProducts,
      total: input.quote.total,
      notes: selectedProducts.join("\n"),
    },
    attribution: input.attribution || input.quote.attribution || {},
    configurator_quote: input.quote,
    page_url: input.quotePortalUrl,
    submitted_at:
      input.quote.createdAt instanceof Date
        ? input.quote.createdAt.toISOString()
        : input.quote.createdAt,
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-lead-intake-key": key,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const raw = await response.text();
  let result: Partial<OsLeadIntakeResult> & { error?: string } = {};
  try {
    result = raw ? JSON.parse(raw) : {};
  } catch {
    // The bounded response excerpt below is sufficient diagnostics.
  }
  if (
    !response.ok ||
    !result.ok ||
    !result.os?.deal_id ||
    !result.configurator_quote?.hydrated ||
    !result.configurator_quote?.activity_id
  ) {
    const detail = result.error || raw.slice(0, 300) || response.statusText;
    throw new Error(`Direct OS lead intake failed (${response.status}): ${detail}`);
  }
  return result as OsLeadIntakeResult;
}
