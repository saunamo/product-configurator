"use client";

import { useState, useRef } from "react";
import { isImageFile, getFileSizeMB } from "@/utils/imageUpload";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
}

export default function ImageUpload({
  value,
  onChange,
  label = "Image",
  placeholder = "Enter URL or upload from computer",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      // Validate file type
      if (!isImageFile(file)) {
        throw new Error("Please select an image file (JPG, PNG, GIF, etc.)");
      }

      // Validate file size (max 5MB)
      const sizeMB = getFileSizeMB(file);
      if (sizeMB > 5) {
        throw new Error("Image size must be less than 5MB");
      }

      // Upload to server instead of converting to base64
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload image");
      }

      const data = await response.json();
      console.log("📤 ImageUpload: Image uploaded to server, URL:", data.url);
      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
      console.error("Image upload error:", err);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              console.log("📤 ImageUpload: Text input changed, value length:", e.target.value.length);
              onChange(e.target.value);
            }}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-800 focus:border-green-800 text-sm"
            style={{ color: "#ffffff" }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!uploading) handleUploadClick();
            }}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !uploading) {
                e.preventDefault();
                handleUploadClick();
              }
            }}
            className={`px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium whitespace-nowrap cursor-pointer ${
              uploading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            style={{ userSelect: "none", pointerEvents: uploading ? "none" : "auto" }}
          >
            {uploading ? "Uploading..." : "📁 Upload"}
          </div>
        </div>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
        {value && (
          <div className="mt-2">
            <img
              src={value}
              alt="Preview"
              className="max-w-xs h-24 object-cover rounded border"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            {value.startsWith("/images/") && (
              <p className="text-xs text-gray-500 mt-1">
                ✓ Image uploaded to server: {value}
              </p>
            )}
            {value.startsWith("data:image") && (
              <p className="text-xs text-yellow-600 mt-1">
                ⚠ Old format (base64) - consider re-uploading to save space
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

