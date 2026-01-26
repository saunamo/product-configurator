import { NextRequest, NextResponse } from "next/server";
import { readFile, readdir, mkdir } from "fs/promises";
import { join } from "path";
import { saveProductConfig } from "@/lib/database/products";
import { saveAllProducts } from "@/lib/database/products";

const DATA_DIR = join(process.cwd(), "data-store");
const BACKUP_DIR = join(DATA_DIR, "backups");

/**
 * POST /api/admin/restore-configurator-state
 * Restores configurator state from backup
 * Body: { backupFile?: "latest" | "configurator-backup-YYYY-MM-DD.json" }
 * 
 * This restores the EXACT state that was backed up, including:
 * - All product configs with final rendered state
 * - All steps, options, images, settings
 * - Product-specific configurations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const backupFileName = body.backupFile || "configurator-backup-latest.json";
    
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
    
    console.log(`📦 Restoring from backup: ${backupFileName}`);
    console.log(`📦 Backup timestamp: ${backupData.timestamp}`);
    console.log(`📦 Products in backup: ${backupData.products?.length || 0}`);
    console.log(`📦 Configs in backup: ${Object.keys(backupData.configs || {}).length}`);

    // Restore products
    if (backupData.products && backupData.products.length > 0) {
      await saveAllProducts(backupData.products);
      console.log(`✅ Restored ${backupData.products.length} products`);
    }

    // Restore product configs (FINAL rendered state)
    let restoredCount = 0;
    let failedCount = 0;
    
    for (const [productId, config] of Object.entries(backupData.configs || {})) {
      try {
        const configData = config as any;
        
        // Remove backup metadata before saving
        const { _backupMetadata, ...configToSave } = configData;
        
        await saveProductConfig(configToSave);
        restoredCount++;
        console.log(`✅ Restored config for ${productId} (${configData._backupMetadata?.productName || productId})`);
      } catch (error: any) {
        console.error(`❌ Failed to restore config for ${productId}:`, error.message);
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Configurator state restored from ${backupFileName}`,
      productsRestored: backupData.products?.length || 0,
      configsRestored: restoredCount,
      configsFailed: failedCount,
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

/**
 * GET /api/admin/restore-configurator-state
 * Lists available backups
 */
export async function GET() {
  try {
    await mkdir(BACKUP_DIR, { recursive: true });
    const files = await readdir(BACKUP_DIR);
    const backups = files
      .filter(f => f.startsWith("configurator-backup-") && f.endsWith(".json"))
      .map(f => ({
        fileName: f,
        isLatest: f === "configurator-backup-latest.json",
      }))
      .sort((a, b) => {
        if (a.isLatest) return -1;
        if (b.isLatest) return 1;
        return b.fileName.localeCompare(a.fileName);
      });

    // Try to get metadata from latest backup
    let latestBackupInfo = null;
    try {
      const latestPath = join(BACKUP_DIR, "configurator-backup-latest.json");
      const latestData = JSON.parse(await readFile(latestPath, "utf-8"));
      latestBackupInfo = {
        timestamp: latestData.timestamp,
        productsCount: latestData.products?.length || 0,
        configsCount: Object.keys(latestData.configs || {}).length,
        description: latestData.description,
      };
    } catch (error) {
      // Latest backup doesn't exist yet
    }

    return NextResponse.json({
      success: true,
      backups,
      latestBackup: latestBackupInfo,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
