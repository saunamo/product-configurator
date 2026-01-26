"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveProduct, getAllProducts } from "@/utils/productStorage";
import { Product } from "@/types/product";
import { STEPS } from "@/constants/steps";
import { stepDataMap } from "@/data";
import { defaultDesignConfig } from "@/constants/defaultDesign";
import { saveProductConfig } from "@/utils/productStorage";
import { ProductConfig } from "@/types/product";

export default function NewProductPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSlugChange = (value: string) => {
    // Auto-generate slug from name
    const autoSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(autoSlug);
  };

  const handleCreate = () => {
    if (!name.trim() || !slug.trim()) {
      alert("Please enter a product name");
      return;
    }

    // Check if slug is unique
    const existingProducts = getAllProducts();
    if (existingProducts.some((p) => p.slug === slug)) {
      alert("This slug is already taken. Please use a different one.");
      return;
    }

    setIsCreating(true);

    // Create product
    const productId = slug;
    const product: Product = {
      id: productId,
      name: name.trim(),
      slug: slug.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    saveProduct(product);

    // Create default config for this product
    const defaultConfig: ProductConfig = {
      productId,
      productName: name.trim(),
      steps: STEPS,
      stepData: stepDataMap,
      design: defaultDesignConfig,
      priceSource: "pipedrive",
    };

    saveProductConfig(defaultConfig);

    // Redirect to product admin
    router.push(`/admin/products/${productId}`);
  };

  return (
    <div className="min-h-screen bg-[#faf9f7] p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Product</h1>
          <p className="text-gray-600 mt-2">Set up a new product configurator</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                handleSlugChange(e.target.value);
              }}
              placeholder="e.g., The Skuare, Barrel Sauna, Cube Sauna"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g., skuare, barrel-sauna, cube-sauna"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800"
            />
            <p className="text-xs text-gray-500 mt-1">
              Used in URLs: /configurator/{slug}/step-name
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating || !name.trim() || !slug.trim()}
              className="px-6 py-3 bg-green-800 text-white rounded-lg hover:bg-green-900 font-medium disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              {isCreating ? "Creating..." : "Create Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



