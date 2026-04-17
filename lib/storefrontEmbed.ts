import { readFile } from "fs/promises";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";
import { getProduct as getPipedriveProduct } from "@/lib/pipedrive/client";
import { getProductConfig } from "@/lib/database/products";
import { getTransportPipedriveId } from "@/lib/ukTransportPipedrive";
import { AdminConfig } from "@/types/admin";

type PriceInfo = {
  excl: number;
  incl: number;
  vatRate: number;
  currency: string;
  name: string;
};

const ALLOWED_ORIGINS = new Set([
  "https://www.saunamo.co.uk",
  "https://saunamo.co.uk",
  "https://saunamo-usa.myshopify.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

const ADMIN_CONFIG_FILE_PATH = join(process.cwd(), "data-store", "admin-config.json");

function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function resolveRequestOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return origin;
  }

  const referer = request.headers.get("referer");
  if (!referer) {
    return null;
  }

  try {
    const refererOrigin = new URL(referer).origin;
    return ALLOWED_ORIGINS.has(refererOrigin) ? refererOrigin : null;
  } catch {
    return null;
  }
}

export function withStorefrontCors(
  request: NextRequest,
  response: NextResponse,
  methods: string
): NextResponse {
  const origin = resolveRequestOrigin(request);

  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }

  response.headers.set("Access-Control-Allow-Methods", methods);
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Access-Control-Max-Age", "86400");

  return response;
}

export function storefrontOptions(request: NextRequest, methods: string): NextResponse {
  return withStorefrontCors(request, new NextResponse(null, { status: 204 }), methods);
}

async function loadAdminConfig(): Promise<AdminConfig | null> {
  try {
    const raw = await readFile(ADMIN_CONFIG_FILE_PATH, "utf-8");
    return JSON.parse(raw) as AdminConfig;
  } catch {
    return null;
  }
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function mergeConfigWithAdmin(rawConfig: any, adminConfig: AdminConfig | null, productSlug: string) {
  if (!rawConfig || !rawConfig.stepData) {
    return null;
  }

  const merged = deepClone(rawConfig);
  const globals = (adminConfig && adminConfig.globalSettings) || {};
  const stepNames = globals.stepNames || {};
  const stepImages = globals.stepImages || {};
  const stepSubheaders = globals.stepSubheaders || {};
  const optionTitles = globals.optionTitles || {};
  const optionImages = globals.optionImages || {};
  const optionPipedriveProducts = globals.optionPipedriveProducts || {};

  merged.globalSettings = globals;

  if (Array.isArray(merged.steps)) {
    merged.steps = merged.steps
      .filter((step: any) => !!merged.stepData[step.id])
      .map((step: any) => {
        const cloned = { ...step };
        if (stepNames[step.id]) {
          cloned.name = stepNames[step.id];
        }
        return cloned;
      });
  }

  Object.keys(merged.stepData).forEach((stepId) => {
    const stepData = merged.stepData[stepId];
    if (!stepData) {
      return;
    }

    if (stepNames[stepId]) {
      stepData.title = stepNames[stepId];
    }

    if (stepSubheaders[stepId]) {
      stepData.subtext = stepSubheaders[stepId];
    }

    if (stepImages[stepId] && !(productSlug.includes("aura") && stepId === "electrical-assembly")) {
      stepData.imageUrl = stepImages[stepId];
    }

    stepData.options = (stepData.options || []).map((option: any) => {
      const clonedOption = { ...option };

      if (optionTitles[clonedOption.id]) {
        clonedOption.title = optionTitles[clonedOption.id];
      }

      if (optionImages[clonedOption.id]) {
        clonedOption.imageUrl = optionImages[clonedOption.id];
      }

      if (optionPipedriveProducts[clonedOption.id]) {
        clonedOption.pipedriveProductId = optionPipedriveProducts[clonedOption.id];
      }

      return clonedOption;
    });
  });

  merged.quoteSettings = {
    ...(merged.quoteSettings || {}),
    currency: "GBP",
  };

  return merged;
}

function getOptionProductId(config: any, option: any, stepId: string, productSlug: string): number | null {
  if (!option) {
    return null;
  }

  if (stepId === "delivery" && option.id === "delivery-standard") {
    return getTransportPipedriveId(productSlug) || option.pipedriveProductId || 18212;
  }

  const globals = (config && config.globalSettings) || {};
  if (globals.optionPipedriveProducts && globals.optionPipedriveProducts[option.id]) {
    return globals.optionPipedriveProducts[option.id];
  }

  return option.pipedriveProductId || null;
}

function collectPriceIds(config: any, productSlug: string): number[] {
  const ids: number[] = [];

  if (config?.mainProductPipedriveId) {
    ids.push(config.mainProductPipedriveId);
  }

  Object.keys(config?.stepData || {}).forEach((stepId) => {
    const stepData = config.stepData[stepId];
    (stepData?.options || []).forEach((option: any) => {
      const productId = getOptionProductId(config, option, stepId, productSlug);
      if (productId) {
        ids.push(productId);
      }
    });
  });

  const transportId = getTransportPipedriveId(productSlug);
  if (transportId) {
    ids.push(transportId);
  }

  return ids.filter((id, index, all) => id && all.indexOf(id) === index);
}

async function loadPriceMap(ids: number[]): Promise<Record<number, PriceInfo>> {
  const pricesById: Record<number, PriceInfo> = {};

  if (!process.env.PIPEDRIVE_API_TOKEN || ids.length === 0) {
    return pricesById;
  }

  await Promise.all(
    ids.map(async (id) => {
      try {
        const response = await getPipedriveProduct(id);
        const product = response?.data;
        const gbpPrice =
          product?.prices?.find((entry: any) => entry.currency === "GBP") ||
          product?.prices?.[0];

        if (!product || !gbpPrice || typeof gbpPrice.price !== "number") {
          return;
        }

        const vatRate =
          typeof product.tax === "number"
            ? product.tax / 100
            : parseFloat(product.tax || "20") / 100;
        const excl = roundMoney(gbpPrice.price);

        pricesById[id] = {
          excl,
          incl: roundMoney(excl * (1 + (Number.isFinite(vatRate) ? vatRate : 0.2))),
          vatRate: Number.isFinite(vatRate) ? vatRate : 0.2,
          currency: gbpPrice.currency || "GBP",
          name: product.name || "",
        };
      } catch (error) {
        console.warn(`[storefrontEmbed] Failed to fetch Pipedrive product ${id}:`, error);
      }
    })
  );

  return pricesById;
}

export async function loadStorefrontEmbedConfig(productSlug: string) {
  const rawConfig = await getProductConfig(productSlug);
  if (!rawConfig) {
    return null;
  }

  const adminConfig = await loadAdminConfig();
  const mergedConfig = mergeConfigWithAdmin(rawConfig, adminConfig, productSlug);
  if (!mergedConfig) {
    return null;
  }

  const priceIds = collectPriceIds(mergedConfig, productSlug);
  const pricesById = await loadPriceMap(priceIds);
  const basePrice = mergedConfig.mainProductPipedriveId
    ? pricesById[mergedConfig.mainProductPipedriveId]?.excl ?? null
    : null;
  const transportId = getTransportPipedriveId(productSlug);
  const transportPrice = transportId ? pricesById[transportId]?.excl ?? null : null;

  return {
    config: {
      ...mergedConfig,
      basePrice,
      transportPrice,
    },
    pricesById,
  };
}
