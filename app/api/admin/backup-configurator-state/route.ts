import { NextRequest, NextResponse } from "next/server";
import { getAllProducts } from "@/lib/database/products";
import { getProductConfig } from "@/lib/database/products";
import { processProductConfig } from "@/utils/productStorage";
import { writeFile, mkdir, readFile, existsSync } from "fs/promises";
import { join } from "path";
import { AdminConfig } from "@/types/admin";
import { ProductConfig } from "@/types/product";
import { STEPS } from "@/constants/steps";
import { defaultQuoteSettings } from "@/constants/defaultQuoteSettings";
import { defaultDesignConfig } from "@/constants/defaultDesign";

const DATA_DIR = join(process.cwd(), "data-store");
const BACKUP_DIR = join(DATA_DIR, "backups");
const CONFIG_FILE_PATH = join(DATA_DIR, "admin-config.json");

/**
 * Server-side version of applyGlobalSettingsToProductConfig
 * Applies global settings (step names, images, titles, Pipedrive links) to product config
 * Note: processProductConfig already handles filtering, image updates, step reordering, etc.
 * This function just applies the global admin settings on top
 */
async function applyGlobalSettingsToProductConfigServer(
  productConfig: ProductConfig,
  adminConfig: AdminConfig | null
): Promise<ProductConfig> {
  const globalSettings = adminConfig?.globalSettings;
  const updatedStepData = { ...productConfig.stepData };
  let updatedSteps = [...productConfig.steps];

  // Apply step names from global settings
  if (globalSettings?.stepNames) {
    updatedSteps = updatedSteps.map(step => {
      const globalStepName = globalSettings.stepNames?.[step.id];
      if (globalStepName) {
        return { ...step, name: globalStepName };
      }
      return step;
    });
  }

  // Apply step images from global settings
  if (globalSettings?.stepImages) {
    Object.entries(globalSettings.stepImages).forEach(([stepId, imageUrl]) => {
      if (updatedStepData[stepId] && imageUrl) {
        updatedStepData[stepId] = {
          ...updatedStepData[stepId],
          imageUrl: imageUrl as string,
        };
      }
    });
  }

  // Apply option images, titles, and Pipedrive links from global settings
  if (globalSettings?.optionImages || globalSettings?.optionTitles || globalSettings?.optionPipedriveProducts) {
    Object.keys(updatedStepData).forEach(stepId => {
      const stepData = updatedStepData[stepId];
      if (stepData && stepData.options) {
        updatedStepData[stepId] = {
          ...stepData,
          options: stepData.options.map(option => {
            let updatedOption = { ...option };
            
            // Apply option image from global settings
            const globalImage = globalSettings?.optionImages?.[option.id];
            if (globalImage) {
              updatedOption.imageUrl = globalImage as string;
            }
            
            // Apply option title from global settings
            const globalTitle = globalSettings?.optionTitles?.[option.id];
            if (globalTitle) {
              updatedOption.title = globalTitle as string;
            }
            
            // Apply Pipedrive product ID from global settings
            const pipedriveProductId = globalSettings?.optionPipedriveProducts?.[option.id];
            if (pipedriveProductId) {
              updatedOption.pipedriveProductId = pipedriveProductId as number;
            }
            
            return updatedOption;
          }),
        };
      }
    });
  }

  // CRITICAL: Ensure heater stepData includes stones option (from default data)
  // This matches what the configurator shows at runtime
  if (updatedStepData["heater"]) {
    const { stepDataMap } = require("@/data");
    const defaultHeaterData = stepDataMap["heater"];
    
    if (defaultHeaterData) {
      // Find stone options in default data
      const stoneOptions = defaultHeaterData.options.filter((opt: any) => {
        const idLower = opt.id.toLowerCase();
        const titleLower = (opt.title || "").toLowerCase();
        return idLower.includes("heater-stone") || 
               idLower.includes("stone") ||
               idLower.includes("heaterstone") ||
               titleLower.includes("according to") ||
               titleLower.includes("heater stone");
      });
      
      // Check if stones are already in the heater stepData
      const existingOptionIds = updatedStepData["heater"].options.map((o: any) => o.id);
      const missingStoneOptions = stoneOptions.filter((opt: any) => 
        !existingOptionIds.includes(opt.id)
      );
      
      // Add missing stone options
      if (missingStoneOptions.length > 0) {
        // Apply global settings to stone options
        const stoneOptionsWithGlobalSettings = missingStoneOptions.map((opt: any) => {
          let updatedOpt = { ...opt };
          
          // Apply global image
          const globalImage = globalSettings?.optionImages?.[opt.id];
          if (globalImage) {
            updatedOpt.imageUrl = globalImage as string;
          }
          
          // Apply global title
          const globalTitle = globalSettings?.optionTitles?.[opt.id];
          if (globalTitle) {
            updatedOpt.title = globalTitle as string;
          }
          
          // Apply Pipedrive product ID
          const pipedriveProductId = globalSettings?.optionPipedriveProducts?.[opt.id];
          if (pipedriveProductId) {
            updatedOpt.pipedriveProductId = pipedriveProductId as number;
          }
          
          return updatedOpt;
        });
        
        // Add metadata to indicate dynamic pricing calculation
        const stoneOptionsWithMetadata = stoneOptionsWithGlobalSettings.map((opt: any) => ({
          ...opt,
          // Add metadata to indicate this option has dynamic pricing
          dynamicPricing: true,
          pricingCalculation: {
            type: "heater-stones",
            description: "Price calculated based on selected heater model (kg / 20kg × £29.50 per package)",
            basePricePerPackage: 29.50,
            packageSize: 20, // kg
            calculationLogic: "Extract kg from selected heater title, divide by 20, multiply by £29.50"
          }
        }));
        
        updatedStepData["heater"] = {
          ...updatedStepData["heater"],
          options: [...updatedStepData["heater"].options, ...stoneOptionsWithMetadata],
        };
        
        console.log(`✅ Added ${stoneOptionsWithMetadata.length} stone option(s) to heater stepData for backup with dynamic pricing metadata`);
      }
    }
  }

  // CRITICAL: Filter out express and white glove delivery options - only keep standard delivery
  // This matches what the configurator shows at runtime
  if (updatedStepData["delivery"]) {
    const deliveryStep = updatedStepData["delivery"];
    const filteredDeliveryOptions = deliveryStep.options.filter((option: any) => {
      const optionId = option.id || "";
      const optionTitleLower = (option.title || "").toLowerCase();
      // Keep only standard delivery, remove express and white glove
      const isExpress = optionId.includes("express") || optionTitleLower.includes("express");
      const isWhiteGlove = optionId.includes("white-glove") || 
                           optionId.includes("whiteglove") ||
                           optionTitleLower.includes("white glove") ||
                           optionTitleLower.includes("whiteglove");
      return !isExpress && !isWhiteGlove;
    });
    
    if (filteredDeliveryOptions.length !== deliveryStep.options.length) {
      console.log(`🚫 Filtered out express/white glove delivery options. Remaining: ${filteredDeliveryOptions.length} option(s)`);
      updatedStepData["delivery"] = {
        ...deliveryStep,
        options: filteredDeliveryOptions,
      };
    }
  }

  // CRITICAL: Ensure proper step order - delivery is second-to-last, quote is last
  // This matches what the configurator shows at runtime
  // Strategy: Remove quote, hot-tubs, and delivery, then re-add them in correct order at the end
  
  const quoteIndex = updatedSteps.findIndex(s => s.id === "quote");
  const hotTubsIndex = updatedSteps.findIndex(s => s.id === "hot-tubs");
  const deliveryIndex = updatedSteps.findIndex(s => s.id === "delivery");
  
  const quoteStep = quoteIndex >= 0 ? updatedSteps[quoteIndex] : null;
  const hotTubsStep = hotTubsIndex >= 0 ? updatedSteps[hotTubsIndex] : null;
  const deliveryStep = deliveryIndex >= 0 ? updatedSteps[deliveryIndex] : null;
  
  // Remove quote, hot-tubs, and delivery from their current positions
  // Remove in reverse order to avoid index shifting issues
  const indicesToRemove = [quoteIndex, hotTubsIndex, deliveryIndex]
    .filter(idx => idx >= 0)
    .sort((a, b) => b - a); // Sort descending
  
  indicesToRemove.forEach(idx => {
    updatedSteps.splice(idx, 1);
  });
  
  // Now add them back in the correct order at the end:
  // 1. hot-tubs (if exists)
  // 2. delivery (if exists, or create it)
  // 3. quote (always last)
  
  if (hotTubsStep) {
    updatedSteps.push(hotTubsStep);
    console.log("✅ Placed hot-tubs step before delivery");
  }
  
  if (deliveryStep) {
    updatedSteps.push(deliveryStep);
    console.log("✅ Placed delivery step (second-to-last)");
  } else {
    // Create delivery step if it doesn't exist
    const deliveryStepFromConstant = STEPS.find(s => s.id === "delivery");
    if (deliveryStepFromConstant) {
      updatedSteps.push({
        id: deliveryStepFromConstant.id,
        name: globalSettings?.stepNames?.["delivery"] || deliveryStepFromConstant.name,
        route: deliveryStepFromConstant.route,
      });
      console.log("✅ Created and placed delivery step (second-to-last)");
    }
  }
  
  // Quote is always last
  if (quoteStep) {
    updatedSteps.push(quoteStep);
    console.log("✅ Placed Quote step at absolute last position");
  } else {
    // Create quote step if it doesn't exist
    const quoteStepFromConstant = STEPS.find(s => s.id === "quote");
    if (quoteStepFromConstant) {
      updatedSteps.push({
        id: quoteStepFromConstant.id,
        name: globalSettings?.stepNames?.["quote"] || quoteStepFromConstant.name,
        route: `/products/${productConfig.productId}/configurator/quote`,
      });
      console.log("✅ Created and placed Quote step at absolute last position");
    }
  }
  
  // Final safety check: ensure quote is absolutely last
  const finalQuoteIndex = updatedSteps.findIndex(s => s.id === "quote");
  if (finalQuoteIndex >= 0 && finalQuoteIndex < updatedSteps.length - 1) {
    // Quote is not last - move it to the end
    const quoteStepToMove = updatedSteps.splice(finalQuoteIndex, 1)[0];
    updatedSteps.push(quoteStepToMove);
    console.log("✅ Moved Quote step to absolute last position (safety check)");
  }

  return {
    ...productConfig,
    steps: updatedSteps,
    stepData: updatedStepData,
  };
}

/**
 * POST /api/admin/backup-configurator-state
 * Creates a complete backup of all product configurator states (FINAL rendered state)
 * This captures the exact state as shown in the configurator, including:
 * - All steps with correct order
 * - All options with images, prices, Pipedrive links
 * - Product-specific settings
 * - Global settings applied
 * - Filtered options (e.g., delivery options, rear glass wall options)
 */
export async function POST(request: NextRequest) {
  try {
    await mkdir(BACKUP_DIR, { recursive: true });
    
    const products = await getAllProducts();
    const backup: {
      timestamp: string;
      version: string;
      description: string;
      products: any[];
      configs: Record<string, any>;
    } = {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      description: "Complete backup of Saunamo configurator state - FINAL rendered state as shown in configurator",
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      configs: {},
    };

    console.log(`📦 Starting backup of ${products.length} products...`);

    // Load admin config from server
    let adminConfig: AdminConfig | null = null;
    try {
      if (existsSync(CONFIG_FILE_PATH)) {
        const configContent = await readFile(CONFIG_FILE_PATH, "utf-8");
        adminConfig = JSON.parse(configContent) as AdminConfig;
        console.log(`✅ Loaded admin config for global settings`);
      } else {
        console.warn(`⚠️ No admin config found, backing up without global settings`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load admin config:`, error);
    }

    // Load and process each product config to get FINAL rendered state
    for (const product of products) {
      try {
        console.log(`📦 Processing ${product.name} (${product.id})...`);
        const rawConfig = await getProductConfig(product.id);
        if (rawConfig) {
          // Process the config to get the FINAL rendered state
          // This includes: step reordering, filtering, image updates, etc.
          // Pass product info for server-side processing
          const processedConfig = await processProductConfig(rawConfig, product.id, {
            slug: product.slug,
            name: product.name,
          });
          
          // Apply global settings to get the complete final state (server-side)
          const finalConfig = await applyGlobalSettingsToProductConfigServer(processedConfig, adminConfig);
          
          // Save the FINAL state (exactly as shown in configurator)
          backup.configs[product.id] = {
            ...finalConfig,
            // Include quote settings from admin config (how quotes are generated and displayed)
            // Use admin config if available, otherwise use defaults
            quoteSettings: adminConfig?.quoteSettings || defaultQuoteSettings,
            // Include design config (used for PDF styling and quote appearance)
            // Use admin config if available, otherwise use defaults
            design: adminConfig?.design || defaultDesignConfig,
            // Include quote generation logic metadata
            _quoteGenerationMetadata: {
              // How heater stones are calculated
              heaterStonesCalculation: {
                basePricePerPackage: 29.50,
                packageSize: 20, // kg
                calculationLogic: "Extract kg from selected heater title, divide by 20, multiply by £29.50",
                titleTransformation: "According to selected heater -> Heater stones",
              },
              // How lighting multipliers work
              lightingMultiplierLogic: {
                description: "Lighting options with 'Nx' in title use base option price × multiplier",
                example: "2x 2.5m LED uses base option price × 2",
              },
              // How prices are synced
              priceSync: {
                source: adminConfig?.priceSource || "pipedrive",
                description: "Prices synced from Pipedrive product catalog before quote generation",
                fallback: "If Pipedrive price is 0 or missing, uses option's default price",
              },
              // How VAT is calculated
              vatCalculation: {
                description: "VAT rate extracted from Pipedrive product or uses quoteSettings.taxRate",
                calculation: "Item price × quantity × VAT rate = VAT amount",
                totalVat: "Sum of all item VAT amounts",
              },
              // How discounts are applied
              discountApplication: {
                description: "Discounts from active campaigns applied to subtotal",
                types: ["percentage", "fixed"],
                calculation: "Percentage: subtotal × (discountValue / 100), Fixed: discountValue",
              },
            },
            // Include quote summary display logic
            _quoteSummaryDisplay: {
              // How items are grouped
              grouping: "Items grouped by step (stepName)",
              // Title transformations
              titleTransformations: {
                heaterStones: "According to selected heater -> Heater stones",
              },
              // How quantities are displayed
              quantityDisplay: {
                heaterStones: "Shown as 'Heater stones (N packages)' in quote summary",
                lighting: "Shown as multiplier in quantity column",
              },
            },
            // Include PDF styling information
            _pdfStyling: {
              colors: {
                backgroundColor: "#F3F0ED", // From defaultDesignConfig
                textColor: "#908F8D",
                accentColor: "#303337",
                cardBackgroundColor: "#ffffff",
                borderColor: "#E2DEDA",
              },
              fonts: {
                family: "Helvetica",
                sizes: {
                  companyName: 24,
                  title: 20,
                  body: 12,
                  label: 10,
                },
              },
              layout: {
                pagePadding: 40,
                tableColumns: {
                  description: "35%",
                  priceVat0: "18%",
                  vat: "12%",
                  quantity: "10%",
                  total: "25%",
                },
              },
              companyInfo: {
                name: adminConfig?.quoteSettings?.companyName || "Saunamo, Arbor Eco LDA",
                logoUrl: adminConfig?.quoteSettings?.companyLogoUrl || "",
                address: adminConfig?.quoteSettings?.companyAddress || "",
                phone: adminConfig?.quoteSettings?.companyPhone || "",
                email: adminConfig?.quoteSettings?.companyEmail || "",
                website: adminConfig?.quoteSettings?.companyWebsite || "",
              },
            },
            // Include metadata
            _backupMetadata: {
              productId: product.id,
              productName: product.name,
              productSlug: product.slug,
              backedUpAt: new Date().toISOString(),
            },
          };
          
          console.log(`✅ Backed up ${product.name}: ${finalConfig.steps?.length || 0} steps, ${Object.keys(finalConfig.stepData || {}).length} stepData entries`);
        } else {
          console.warn(`⚠️ No config found for ${product.name} (${product.id})`);
        }
      } catch (error: any) {
        console.error(`❌ Failed to backup config for ${product.id}:`, error.message);
      }
    }

    // Save backup file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
    const backupFileName = `configurator-backup-${timestamp}.json`;
    const backupPath = join(BACKUP_DIR, backupFileName);
    
    await writeFile(backupPath, JSON.stringify(backup, null, 2), "utf-8");
    console.log(`💾 Saved backup to: ${backupFileName}`);

    // Also save as "latest" backup
    const latestBackupPath = join(BACKUP_DIR, "configurator-backup-latest.json");
    await writeFile(latestBackupPath, JSON.stringify(backup, null, 2), "utf-8");
    console.log(`💾 Saved latest backup`);

    return NextResponse.json({
      success: true,
      message: "Configurator state backed up successfully",
      backupFile: backupFileName,
      productsBackedUp: Object.keys(backup.configs).length,
      totalProducts: products.length,
      timestamp: backup.timestamp,
      backupSize: `${(JSON.stringify(backup).length / 1024 / 1024).toFixed(2)} MB`,
    });
  } catch (error: any) {
    console.error("❌ Backup failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
