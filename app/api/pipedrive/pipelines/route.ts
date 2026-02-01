import { NextResponse } from "next/server";
import { getPipelines } from "@/lib/pipedrive/client";

export async function GET() {
  try {
    const result = await getPipelines();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get pipelines" },
      { status: 500 }
    );
  }
}
