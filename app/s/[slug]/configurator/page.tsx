"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAllProducts, getProductConfig } from "@/utils/productStorage";

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
        const isHikiOrAisti = product.slug.toLowerCase().includes("hiki") || 
                              product.slug.toLowerCase().includes("aisti") ||
                              product.name.toLowerCase().includes("hiki") ||
                              product.name.toLowerCase().includes("aisti");
        const availableSteps = config?.steps?.filter(s => {
          if (isHikiOrAisti && s.id === "rear-glass-wall") return false;
          return true;
        }) || [];
        const firstStep = availableSteps[0];
        
        if (firstStep) {
          // Redirect to the correct route
          window.location.href = `/products/${slug}/configurator/${firstStep.id}`;
        } else {
          // Fallback to heater step
          window.location.href = `/products/${slug}/configurator/heater`;
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
        <div className="text-lg text-gray-600">Loading product...</div>
      </div>
    </div>
  );
}
