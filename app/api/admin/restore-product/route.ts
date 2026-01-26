import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { saveProductConfig } from "@/lib/database/products";

const DATA_DIR = join(process.cwd(), "data-store");
const BACKUP_DIR = join(DATA_DIR, "backups");

/**
 * POST /api/admin/restore-product
 * Restores a single product's configuration from backup
 * Body: { productId: "cube-125", backupFile?: "latest" | "configurator-backup-YYYY-MM-DD.json" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const productId = body.productId;
    let backupFileName = body.backupFile || "latest";
    
    if (!productId) {
      return NextResponse.json(
        { success: false, error: "productId is required" },
        { status: 400 }
      );
    }
    
    // Handle "latest" keyword
    if (backupFileName === "latest") {
      backupFileName = "configurator-backup-latest.json";
    }
    
    const backupPath = join(BACKUP_DIR, backupFileName);
    
    // Check if backup file exists
    try {
      await readFile(backupPath, "utf-8");
    } catch (error) {
      return NextResponse.json(
        { success: false, error: `Backup file not found: ${backupFileName}` },
        { status: 404 }
      );
    }
    
    const backupData = JSON.parse(await readFile(backupPath, "utf-8"));
    
    // Check if product exists in backup
    if (!backupData.configs || !backupData.configs[productId]) {
      return NextResponse.json(
        { success: false, error: `Product ${productId} not found in backup` },
        { status: 404 }
      );
    }
    
    const configData = backupData.configs[productId] as any;
    
    // Remove backup metadata before saving
    const { _backupMetadata, _quoteGenerationMetadata, _quoteSummaryDisplay, _pdfStyling, ...configToSave } = configData;
    
    // Save the product config
    await saveProductConfig(configToSave);
    
    console.log(`✅ Restored config for ${productId} (${configData._backupMetadata?.productName || productId})`);
    
    return NextResponse.json({
      success: true,
      message: `Product ${productId} restored from ${backupFileName}`,
      productId,
      productName: configData._backupMetadata?.productName || productId,
      backupTimestamp: backupData.timestamp,
      restoredAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ Restore failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
