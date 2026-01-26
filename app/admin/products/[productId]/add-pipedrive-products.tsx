"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getProductConfig, saveProductConfig } from "@/utils/productStorage";
import { ProductConfig } from "@/types/product";

/**
 * Component to help add Pipedrive products to Cube 125
 * This is a helper script - you can run this once to populate the product
 */
export default function AddPipedriveProductsHelper() {
  const params = useParams();
  const productId = params.productId as string;
  const [config, setConfig] = useState<ProductConfig | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const productConfig = getProductConfig(productId);
    if (productConfig) {
      setConfig(productConfig);
    }
  }, [productId]);

  // Pipedrive product mappings for Cube 125
  // Based on the products we fetched, mapping them to configurator steps
  const pipedriveMappings: Record<string, Record<string, number>> = {
    "rear-glass-wall": {
      // Add glass wall products here
    },
    lighting: {
      // Add lighting products here - using a sauna product as example
      "option-1": 6689, // Sauna Exterior Hiki L
    },
    heater: {
      // Add heater products here
      "option-1": 6689, // Using sauna as placeholder
    },
    "aromas-accessories": {
      // Add aromas/accessories products
      "option-1": 6688, // Natural Oak Sauna Whisk
      "option-2": 6690, // Organic Birch Sauna Whisk
    },
    "electrical-assembly": {
      // Add electrical/assembly products
      "option-1": 6677, // Ice Bath Installation
    },
    delivery: {
      // Add delivery products
      "option-1": 6677, // Using installation as placeholder
    },
    "cold-plunge": {
      // Add cold plunge products
      "option-1": 6692, // Cooling and Heating Unit
    },
  };

  const handleAddPipedriveProducts = () => {
    if (!config) return;

    const updatedConfig = { ...config };
    let updated = 0;

    Object.entries(pipedriveMappings).forEach(([stepId, optionMappings]) => {
      const stepData = updatedConfig.stepData[stepId];
      if (!stepData) return;

      Object.entries(optionMappings).forEach(([optionId, pipedriveProductId]) => {
        const option = stepData.options.find((opt) => opt.id === optionId);
        if (option) {
          option.pipedriveProductId = pipedriveProductId;
          updated++;
        }
      });
    });

    saveProductConfig(updatedConfig);
    setConfig(updatedConfig);
    setStatus(`Updated ${updated} options with Pipedrive products`);
  };

  if (!config) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="font-bold mb-2">Add Pipedrive Products Helper</h3>
      <p className="text-sm mb-4">
        This will add Pipedrive product IDs to your Cube 125 configuration for testing.
      </p>
      <button
        onClick={handleAddPipedriveProducts}
        className="px-4 py-2 bg-green-800 text-white rounded hover:bg-green-900"
      >
        Add Pipedrive Products
      </button>
      {status && <p className="mt-2 text-sm text-green-600">{status}</p>}
    </div>
  );
}



