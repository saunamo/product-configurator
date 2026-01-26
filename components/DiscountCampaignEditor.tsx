"use client";

import { DiscountCampaign } from "@/types/admin";
import { useState } from "react";

interface DiscountCampaignEditorProps {
  campaign: DiscountCampaign;
  onSave: (campaign: DiscountCampaign) => void;
  onCancel: () => void;
  allOptions?: Array<{ id: string; title: string; stepName: string }>;
  allProducts?: Array<{ id: string; name: string }>;
}

export default function DiscountCampaignEditor({
  campaign,
  onSave,
  onCancel,
  allOptions,
  allProducts = [],
}: DiscountCampaignEditorProps) {
  const [editedCampaign, setEditedCampaign] = useState<DiscountCampaign>(campaign);

  const handleSave = () => {
    onSave({
      ...editedCampaign,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="border border-gray-300 rounded-lg p-6 bg-white">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">Edit Discount Campaign</h4>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Campaign Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={editedCampaign.name}
            onChange={(e) => setEditedCampaign({ ...editedCampaign, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={editedCampaign.description || ""}
            onChange={(e) => setEditedCampaign({ ...editedCampaign, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
            placeholder="Optional description..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discount Type
            </label>
            <select
              value={editedCampaign.discountType}
              onChange={(e) => setEditedCampaign({ 
                ...editedCampaign, 
                discountType: e.target.value as "percentage" | "fixed" 
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discount Value
            </label>
            <input
              type="number"
              value={editedCampaign.discountValue}
              onChange={(e) => setEditedCampaign({ 
                ...editedCampaign, 
                discountValue: parseFloat(e.target.value) || 0 
              })}
              min="0"
              max={editedCampaign.discountType === "percentage" ? 100 : undefined}
              step={editedCampaign.discountType === "percentage" ? 1 : 0.01}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              {editedCampaign.discountType === "percentage" 
                ? "Enter percentage (0-100)"
                : "Enter fixed amount"}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Applies To
          </label>
          <select
            value={editedCampaign.appliesTo}
            onChange={(e) => setEditedCampaign({ 
              ...editedCampaign, 
              appliesTo: e.target.value as "all" | "specific",
              productIds: e.target.value === "all" ? undefined : [],
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
          >
            <option value="all">All Products</option>
            <option value="specific">Specific Products/Options</option>
          </select>
        </div>

        {editedCampaign.appliesTo === "specific" && (
          <div>
            {allProducts && allProducts.length > 0 ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Products
                </label>
                <div className="max-h-64 overflow-y-auto border border-gray-300 rounded p-2 bg-white">
                  {allProducts.map((product) => (
                    <label key={product.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editedCampaign.productIds?.includes(product.id) || false}
                        onChange={(e) => {
                          const productIds = editedCampaign.productIds || [];
                          if (e.target.checked) {
                            setEditedCampaign({
                              ...editedCampaign,
                              productIds: [...productIds, product.id],
                            });
                          } else {
                            setEditedCampaign({
                              ...editedCampaign,
                              productIds: productIds.filter((id) => id !== product.id),
                            });
                          }
                        }}
                        className="w-4 h-4 text-green-800 border-gray-300 rounded focus:ring-green-800"
                      />
                      <span className="text-sm text-gray-700 font-medium">{product.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {editedCampaign.productIds?.length || 0} product(s) selected
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  No products found. Create products in the Products section first.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date (Optional)
            </label>
            <input
              type="date"
              value={editedCampaign.startDate || ""}
              onChange={(e) => setEditedCampaign({ 
                ...editedCampaign, 
                startDate: e.target.value || undefined 
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date (Optional)
            </label>
            <input
              type="date"
              value={editedCampaign.endDate || ""}
              onChange={(e) => setEditedCampaign({ 
                ...editedCampaign, 
                endDate: e.target.value || undefined 
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={editedCampaign.isActive}
            onChange={(e) => setEditedCampaign({ 
              ...editedCampaign, 
              isActive: e.target.checked 
            })}
            className="w-4 h-4 text-green-800 border-gray-300 rounded focus:ring-green-800"
          />
          <label className="text-sm font-medium text-gray-700">
            Active Campaign
          </label>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-900 font-medium text-sm"
          >
            Save Campaign
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

