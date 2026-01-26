import { NextRequest, NextResponse } from "next/server";
import {
  createDeal,
  getDeals,
  getDeal,
  getPipelines,
  getStages,
} from "@/lib/pipedrive/client";

/**
 * GET /api/pipedrive/deals
 * Get deals from Pipedrive
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dealId = searchParams.get("id");
    const stageId = searchParams.get("stage_id");
    const limit = searchParams.get("limit");

    if (dealId) {
      const data = await getDeal(parseInt(dealId));
      return NextResponse.json({
        success: true,
        deal: data.data,
      });
    }

    const deals = await getDeals({
      stage_id: stageId ? parseInt(stageId) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json({
      success: true,
      deals: deals.data || [],
    });
  } catch (error: any) {
    console.error("Pipedrive API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch deals from Pipedrive",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pipedrive/deals
 * Create a new deal in Pipedrive
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, value, currency, person_id, org_id, stage_id, customFields } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: "Deal title is required" },
        { status: 400 }
      );
    }

    const dealData: any = {
      title,
      value: value || 0,
      currency: currency || "USD",
    };

    if (person_id) dealData.person_id = person_id;
    if (org_id) dealData.org_id = org_id;
    if (stage_id) dealData.stage_id = stage_id;
    if (customFields) {
      Object.assign(dealData, customFields);
    }

    const result = await createDeal(dealData);

    return NextResponse.json({
      success: true,
      deal: result.data,
      dealId: result.data.id,
    });
  } catch (error: any) {
    console.error("Pipedrive API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create deal in Pipedrive",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pipedrive/pipelines
 * Get pipelines and stages
 */
export async function GET_PIPELINES() {
  try {
    const pipelines = await getPipelines();
    return NextResponse.json({
      success: true,
      pipelines: pipelines.data || [],
    });
  } catch (error: any) {
    console.error("Pipedrive API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch pipelines",
      },
      { status: 500 }
    );
  }
}



