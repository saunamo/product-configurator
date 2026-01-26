import { AdminConfig } from "@/types/admin";

const CONFIG_STORAGE_KEY = "saunamo-admin-config";

/**
 * Save config to server (primary) and localStorage (backup)
 */
export async function saveConfigToStorage(config: AdminConfig): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    // Save to server (primary storage)
    const response = await fetch("/api/admin/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ config }),
    });

    if (response.ok) {
      console.log("✅ Config saved to server");
    } else {
      console.warn("⚠️ Failed to save config to server, using localStorage backup");
    }
  } catch (error) {
    console.warn("⚠️ Server save failed, using localStorage backup:", error);
  }

  // Always save to localStorage as backup
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event("adminConfigUpdated"));
    console.log("✅ Config saved to localStorage (backup)");
  } catch (e: any) {
    console.error("❌ Failed to save to localStorage:", e);
    if (e.name === "QuotaExceededError") {
      console.error("💡 localStorage quota exceeded!");
    }
  }
}

/**
 * Load config from server (primary) or localStorage (fallback)
 */
export async function loadConfigFromStorage(): Promise<AdminConfig | null> {
  if (typeof window === "undefined") return null;

  try {
    // Try to load from server first
    const response = await fetch("/api/admin/config", {
      method: "GET",
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.config) {
        console.log("✅ Config loaded from server");
        
        // Also sync to localStorage as backup
        try {
          localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(data.config));
        } catch (e) {
          console.warn("⚠️ Could not sync server config to localStorage:", e);
        }
        
        return data.config;
      }
    }
  } catch (error) {
    console.warn("⚠️ Server load failed, trying localStorage:", error);
  }

  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      try {
        const config = JSON.parse(stored) as AdminConfig;
        console.log("✅ Config loaded from localStorage (fallback)");
        return config;
      } catch (e) {
        console.error("❌ Failed to parse stored config:", e);
        return null;
      }
    }
  } catch (e) {
    console.error("❌ Failed to access localStorage:", e);
  }

  console.log("ℹ️ No config found (server or localStorage)");
  return null;
}

/**
 * Clear config from both server and localStorage
 */
export async function clearConfigFromStorage(): Promise<void> {
  if (typeof window === "undefined") return;

  // Clear from localStorage
  try {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    console.log("✅ Config cleared from localStorage");
  } catch (e) {
    console.error("❌ Failed to clear localStorage:", e);
  }

  // Note: Server-side clear would require a DELETE endpoint
  // For now, we'll just clear localStorage
}


