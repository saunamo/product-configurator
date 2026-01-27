import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { AdminConfig } from "@/types/admin";

const CONFIG_FILE_PATH = join(process.cwd(), "data-store", "admin-config.json");

/**
 * GET /api/admin/config
 * Load admin configuration from server
 */
export async function GET() {
  try {
    // Check if config file exists
    if (!existsSync(CONFIG_FILE_PATH)) {
      return NextResponse.json({
        success: true,
        config: null,
        message: "No config found on server",
      });
    }

    // Read config file
    const fileContent = await readFile(CONFIG_FILE_PATH, "utf-8");
    const config = JSON.parse(fileContent) as AdminConfig;

    console.log("📥 Loaded admin config from server");

    return NextResponse.json({
      success: true,
      config,
    }, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error: any) {
    console.error("Failed to load admin config:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to load config",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/config
 * Save admin configuration to server
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config = body.config as AdminConfig;

    if (!config) {
      return NextResponse.json(
        { success: false, error: "No config provided" },
        { status: 400 }
      );
    }

    // Ensure data-store directory exists
    const dataStoreDir = join(process.cwd(), "data-store");
    if (!existsSync(dataStoreDir)) {
      await mkdir(dataStoreDir, { recursive: true });
    }

    // Save config to file
    await writeFile(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), "utf-8");

    console.log("💾 Saved admin config to server");

    return NextResponse.json({
      success: true,
      message: "Config saved successfully",
    });
  } catch (error: any) {
    console.error("Failed to save admin config:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to save config",
      },
      { status: 500 }
    );
  }
}
