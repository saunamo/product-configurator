import { NextRequest, NextResponse } from "next/server";
import {
  loadStorefrontEmbedConfig,
  storefrontOptions,
  withStorefrontCors,
} from "@/lib/storefrontEmbed";

export const dynamic = "force-dynamic";

export function OPTIONS(request: NextRequest) {
  return storefrontOptions(request, "GET, OPTIONS");
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const payload = await loadStorefrontEmbedConfig(params.slug);

    if (!payload) {
      return withStorefrontCors(
        request,
        NextResponse.json(
          { success: false, error: `Product config not found: ${params.slug}` },
          { status: 404 }
        ),
        "GET, OPTIONS"
      );
    }

    return withStorefrontCors(
      request,
      NextResponse.json({
        success: true,
        config: payload.config,
        pricesById: payload.pricesById,
      }),
      "GET, OPTIONS"
    );
  } catch (error: any) {
    console.error("[embed/config] Failed to load storefront config:", error);
    return withStorefrontCors(
      request,
      NextResponse.json(
        { success: false, error: error?.message || "Failed to load configurator" },
        { status: 500 }
      ),
      "GET, OPTIONS"
    );
  }
}
