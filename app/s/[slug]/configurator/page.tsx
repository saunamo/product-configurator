"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAllProducts, getProductConfig } from "@/utils/productStorage";

const ATTR_KEYS = [
  "gclid",
  "gbraid",
  "wbraid",
  "gad_source",
  "gad_campaignid",
  "gclsrc",
  "_gl",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_id",
  "utm_term",
  "utm_content",
];
const ATTR_SESSION_KEY = "saunamo_attribution";

function withCurrentSearch(path: string): string {
  if (typeof window === "undefined") return path;

  const current = new URLSearchParams(window.location.search);
  if ([...current.keys()].length > 0) return `${path}?${current.toString()}`;

  try {
    const stored = sessionStorage.getItem(ATTR_SESSION_KEY);
    const attribution = stored ? JSON.parse(stored) as Record<string, string> : {};
    const params = new URLSearchParams();
    ATTR_KEYS.forEach((key) => {
      const value = attribution[key];
      if (value) params.set(key, value);
    });
    const query = params.toString();
    return query ? `${path}?${query}` : path;
  } catch {
    return path;
  }
}

export default function ShortConfiguratorRedirect() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    // Small delay to ensure localStorage is ready
    const timer = setTimeout(async () => {
      // Find the product by slug
      const products = getAllProducts();
      const product = products.find((p) => p.slug === slug);

      if (product) {
        // Get the product config to find the first step
        const config = await getProductConfig(product.id);
        // Filter out rear-glass-wall for Hiki/Aisti models
        const hasNoRearWall = product.slug.toLowerCase().includes("hiki") || 
                              product.slug.toLowerCase().includes("aisti") ||
                              product.slug.toLowerCase().includes("thermo-black") ||
                              product.slug.toLowerCase().includes("aura") ||
                              product.name.toLowerCase().includes("hiki") ||
                              product.name.toLowerCase().includes("aisti") ||
                              product.name.toLowerCase().includes("thermo black") ||
                              product.name.toLowerCase().includes("aura");
        const availableSteps = config?.steps?.filter(s => {
          if (hasNoRearWall && s.id === "rear-glass-wall") return false;
          return true;
        }) || [];
        const firstStep = availableSteps[0];
        
        if (firstStep) {
          // Redirect to the correct route
          window.location.href = withCurrentSearch(`/products/${slug}/configurator/${firstStep.id}`);
        } else {
          // Fallback to heater step
          window.location.href = withCurrentSearch(`/products/${slug}/configurator/heater`);
        }
      } else {
        // Product not found, redirect to products list
        window.location.href = "/products";
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [slug, isClient]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf9f7]">
      <div className="text-center">
        <img 
          src="/saunamo-logo.webp" 
          alt="Saunamo" 
          className="h-10 mx-auto mb-6 animate-pulse"
        />
        <p className="text-gray-500">Loading configurator...</p>
      </div>
    </div>
  );
}
