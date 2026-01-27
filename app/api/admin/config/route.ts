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
    const incomingConfig = body.config as AdminConfig;

    if (!incomingConfig) {
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

    // CRITICAL: Load existing config first to preserve ALL fields
    // This prevents data loss if the client sends a partial update
    let existingConfig: AdminConfig | null = null;
    if (existsSync(CONFIG_FILE_PATH)) {
      try {
        const fileContent = await readFile(CONFIG_FILE_PATH, "utf-8");
        existingConfig = JSON.parse(fileContent) as AdminConfig;
      } catch (error) {
        console.warn("⚠️ Could not read existing config, will save new config:", error);
      }
    }

    // Merge: preserve all existing fields, then apply updates
    // The client should send the complete config, but we merge just to be safe
    const configToSave: AdminConfig = existingConfig
      ? {
          ...existingConfig, // Preserve all existing fields
          ...incomingConfig, // Apply updates
          // Deep merge nested objects to ensure nothing is lost
          globalSettings: {
            ...existingConfig.globalSettings,
            ...incomingConfig.globalSettings,
            // Merge nested globalSettings objects
            stepNames: {
              ...existingConfig.globalSettings?.stepNames,
              ...incomingConfig.globalSettings?.stepNames,
            },
            stepSubheaders: {
              ...existingConfig.globalSettings?.stepSubheaders,
              ...incomingConfig.globalSettings?.stepSubheaders,
            },
            stepImages: {
              ...existingConfig.globalSettings?.stepImages,
              ...incomingConfig.globalSettings?.stepImages,
            },
            optionImages: {
              ...existingConfig.globalSettings?.optionImages,
              ...incomingConfig.globalSettings?.optionImages,
            },
            optionTitles: {
              ...existingConfig.globalSettings?.optionTitles,
              ...incomingConfig.globalSettings?.optionTitles,
            },
            optionPipedriveProducts: {
              ...existingConfig.globalSettings?.optionPipedriveProducts,
              ...incomingConfig.globalSettings?.optionPipedriveProducts,
            },
            optionIncluded: {
              ...existingConfig.globalSettings?.optionIncluded,
              ...incomingConfig.globalSettings?.optionIncluded,
            },
            stepMoreInfoEnabled: {
              ...existingConfig.globalSettings?.stepMoreInfoEnabled,
              ...incomingConfig.globalSettings?.stepMoreInfoEnabled,
            },
            stepMoreInfoUrl: {
              ...existingConfig.globalSettings?.stepMoreInfoUrl,
              ...incomingConfig.globalSettings?.stepMoreInfoUrl,
            },
          },
          design: {
            ...existingConfig.design,
            ...incomingConfig.design,
          },
          quoteSettings: incomingConfig.quoteSettings
            ? {
                ...existingConfig.quoteSettings,
                ...incomingConfig.quoteSettings,
              }
            : existingConfig.quoteSettings,
          stepData: {
            ...existingConfig.stepData,
            ...incomingConfig.stepData,
          },
        }
      : incomingConfig; // No existing config, save the new one

    // Save config to file
    await writeFile(CONFIG_FILE_PATH, JSON.stringify(configToSave, null, 2), "utf-8");

    console.log("💾 Saved admin config to server (merged with existing)");

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
