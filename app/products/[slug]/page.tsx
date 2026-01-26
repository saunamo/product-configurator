"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAllProducts, getProductConfig } from "@/utils/productStorage";

export default function ProductPage() {
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
      console.log("🔍 Looking for product with slug:", slug);
      console.log("🔍 Available products:", products.map(p => ({ id: p.id, slug: p.slug, name: p.name })));
      
      const product = products.find((p) => p.slug === slug);

      if (product) {
        console.log("✅ Product found:", product.name);
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
          console.log("✅ Redirecting to first step:", firstStep.id);
          // Use window.location for hard redirect to avoid Next.js 404
          window.location.href = `/products/${slug}/configurator/${firstStep.id}`;
        } else {
          console.log("⚠️ No steps found, using default");
          // Fallback to heater step (step 2, after rear-glass-wall)
          window.location.href = `/products/${slug}/configurator/heater`;
        }
      } else {
        console.log("❌ Product not found, redirecting to products list");
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

