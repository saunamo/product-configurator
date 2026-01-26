"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { AdminConfig, AdminConfigContextType } from "@/types/admin";
import { saveConfigToStorage, loadConfigFromStorage, clearConfigFromStorage } from "@/utils/configStorage";
import { STEPS } from "@/constants/steps";
import { stepDataMap } from "@/data";
import { defaultDesignConfig } from "@/constants/defaultDesign";
import { defaultQuoteSettings } from "@/constants/defaultQuoteSettings";

function getDefaultConfig(): AdminConfig {
  return {
    productName: "The Skuare",
    steps: STEPS,
    stepData: stepDataMap,
    design: defaultDesignConfig,
    priceSource: "pipedrive",
    quoteSettings: defaultQuoteSettings,
    globalSettings: {
      stepNames: {},
      stepSubheaders: {},
      stepImages: {},
      optionImages: {},
      optionTitles: {},
      optionPipedriveProducts: {},
      optionIncluded: {},
      stepMoreInfoEnabled: {},
      stepMoreInfoUrl: {},
    },
  };
}

const AdminConfigContext = createContext<AdminConfigContextType | undefined>(
  undefined
);

export function AdminConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize with default config immediately
  const [config, setConfig] = useState<AdminConfig | null>(() => getDefaultConfig());
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | null>(null);
  const isSavingRef = useRef(false); // Track if we're currently saving to prevent reload loops

  // Load config function (now async)
  const loadConfigFromStorageAndMerge = useCallback(async () => {
    const loaded = await loadConfigFromStorage();
    if (loaded) {
      // Debug: Log what's being loaded
      if (process.env.NODE_ENV === 'development') {
        console.log('[AdminConfig] Loading config from storage:', {
          hasGlobalSettings: !!loaded.globalSettings,
          optionPipedriveProductsKeys: loaded.globalSettings?.optionPipedriveProducts ? Object.keys(loaded.globalSettings.optionPipedriveProducts) : [],
          optionIncludedKeys: loaded.globalSettings?.optionIncluded ? Object.keys(loaded.globalSettings.optionIncluded) : [],
          optionPipedriveProducts: loaded.globalSettings?.optionPipedriveProducts,
          optionIncluded: loaded.globalSettings?.optionIncluded,
        });
      }
      
      // Merge with defaults to ensure all properties exist
      const defaultConfig = getDefaultConfig();
      const mergedConfig: AdminConfig = {
        ...defaultConfig,
        ...loaded,
        // Ensure nested objects are merged, not replaced
        design: { ...defaultConfig.design, ...loaded.design },
        quoteSettings: loaded.quoteSettings 
          ? { ...defaultConfig.quoteSettings, ...loaded.quoteSettings }
          : defaultConfig.quoteSettings,
        globalSettings: loaded.globalSettings
          ? {
              stepNames: { ...defaultConfig.globalSettings?.stepNames, ...loaded.globalSettings.stepNames },
              stepSubheaders: { ...defaultConfig.globalSettings?.stepSubheaders, ...loaded.globalSettings.stepSubheaders },
              stepImages: { ...defaultConfig.globalSettings?.stepImages, ...loaded.globalSettings.stepImages },
              optionImages: { ...defaultConfig.globalSettings?.optionImages, ...loaded.globalSettings.optionImages },
              optionTitles: { ...defaultConfig.globalSettings?.optionTitles, ...loaded.globalSettings.optionTitles },
              optionPipedriveProducts: { ...defaultConfig.globalSettings?.optionPipedriveProducts, ...loaded.globalSettings.optionPipedriveProducts },
              optionIncluded: { ...defaultConfig.globalSettings?.optionIncluded, ...loaded.globalSettings.optionIncluded },
              stepMoreInfoEnabled: { ...defaultConfig.globalSettings?.stepMoreInfoEnabled, ...loaded.globalSettings.stepMoreInfoEnabled },
              stepMoreInfoUrl: { ...defaultConfig.globalSettings?.stepMoreInfoUrl, ...loaded.globalSettings.stepMoreInfoUrl },
            }
          : defaultConfig.globalSettings,
      };
      
      // Debug: Log what's in the merged config
      if (process.env.NODE_ENV === 'development') {
        console.log('[AdminConfig] Merged config globalSettings:', {
          optionPipedriveProductsKeys: mergedConfig.globalSettings?.optionPipedriveProducts ? Object.keys(mergedConfig.globalSettings.optionPipedriveProducts) : [],
          optionIncludedKeys: mergedConfig.globalSettings?.optionIncluded ? Object.keys(mergedConfig.globalSettings.optionIncluded) : [],
        });
      }
      
      setConfig(mergedConfig);
    } else {
      setConfig(getDefaultConfig());
    }
  }, []);

  // Load config on mount
  useEffect(() => {
    loadConfigFromStorageAndMerge();

    // Listen for storage changes (cross-tab updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "saunamo-admin-config") {
        loadConfigFromStorageAndMerge();
      }
    };

    // Listen for custom events (same-tab updates)
    // But ignore if we're the one who just saved (to prevent reload loops)
    const handleCustomStorage = () => {
      if (!isSavingRef.current) {
        loadConfigFromStorageAndMerge();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("adminConfigUpdated", handleCustomStorage);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("adminConfigUpdated", handleCustomStorage);
    };
  }, [loadConfigFromStorageAndMerge]);

  // Auto-save whenever config changes (debounced)
  useEffect(() => {
    if (!config || !isDirty) return;

    setSaveStatus("saving");
    const timeoutId = setTimeout(async () => {
      isSavingRef.current = true; // Mark that we're saving
      try {
        await saveConfigToStorage(config);
        setIsDirty(false);
        setSaveStatus("saved");
        // Clear the "saved" status after 2 seconds
        setTimeout(() => setSaveStatus(null), 2000);
      } finally {
        // Reset the flag after a short delay to allow the event to be processed
        setTimeout(() => {
          isSavingRef.current = false;
        }, 100);
      }
    }, 500); // Debounce: save 500ms after last change

    return () => clearTimeout(timeoutId);
  }, [config, isDirty]);

  const updateConfig = useCallback((updates: Partial<AdminConfig>) => {
    setConfig((prev) => {
      if (!prev) return prev;
      
      // Deep merge for globalSettings to preserve all nested properties
      let updated: AdminConfig = { ...prev };
      
      if (updates.globalSettings) {
        const prevGlobalSettings = prev.globalSettings || {};
        const updatesGlobalSettings = updates.globalSettings;
        
        updated = {
          ...prev,
          ...updates,
          globalSettings: {
            // Preserve all existing properties
            stepNames: {
              ...(prevGlobalSettings.stepNames || {}),
              ...(updatesGlobalSettings.stepNames || {}),
            },
            stepSubheaders: {
              ...(prevGlobalSettings.stepSubheaders || {}),
              ...(updatesGlobalSettings.stepSubheaders || {}),
            },
            stepImages: {
              ...(prevGlobalSettings.stepImages || {}),
              ...(updatesGlobalSettings.stepImages || {}),
            },
            optionImages: {
              ...(prevGlobalSettings.optionImages || {}),
              ...(updatesGlobalSettings.optionImages || {}),
            },
            optionTitles: {
              ...(prevGlobalSettings.optionTitles || {}),
              ...(updatesGlobalSettings.optionTitles || {}),
            },
            optionPipedriveProducts: {
              ...(prevGlobalSettings.optionPipedriveProducts || {}),
              ...(updatesGlobalSettings.optionPipedriveProducts || {}),
            },
            optionIncluded: {
              ...(prevGlobalSettings.optionIncluded || {}),
              ...(updatesGlobalSettings.optionIncluded || {}),
            },
          },
        };
      } else {
        updated = { ...prev, ...updates };
      }
      
      setIsDirty(true);
      return updated;
    });
  }, []);

  const saveConfig = useCallback(async () => {
    if (config) {
      setSaveStatus("saving");
      await saveConfigToStorage(config);
      setIsDirty(false);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 2000);
    }
  }, [config]);

  const loadConfig = useCallback(async () => {
    const loaded = await loadConfigFromStorage();
    if (loaded) {
      setConfig(loaded);
      setIsDirty(false);
    } else {
      setConfig(getDefaultConfig());
      setIsDirty(false);
    }
  }, []);

  const resetConfig = useCallback(() => {
    clearConfigFromStorage();
    setConfig(getDefaultConfig());
    setIsDirty(false);
  }, []);

  const exportConfig = useCallback(() => {
    if (config) {
      const json = JSON.stringify(config, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "saunamo-config.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [config]);

  const importConfig = useCallback((configJson: string) => {
    try {
      const parsed = JSON.parse(configJson) as AdminConfig;
      setConfig(parsed);
      saveConfigToStorage(parsed);
      setIsDirty(false);
    } catch (e) {
      console.error("Failed to import config:", e);
      throw new Error("Invalid configuration JSON");
    }
  }, []);

  return (
    <AdminConfigContext.Provider
      value={{
        config,
        updateConfig,
        saveConfig,
        loadConfig,
        resetConfig,
        exportConfig,
        importConfig,
        isDirty,
        saveStatus,
      }}
    >
      {children}
    </AdminConfigContext.Provider>
  );
}

export function useAdminConfig() {
  const context = useContext(AdminConfigContext);
  if (context === undefined) {
    throw new Error("useAdminConfig must be used within an AdminConfigProvider");
  }
  return context;
}

