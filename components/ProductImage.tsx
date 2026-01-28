"use client";

import { useMemo, useEffect } from "react";

interface ProductImageProps {
  imageUrl?: string;
  alt?: string;
  selectedOptionLabel?: string;
  isOptionImage?: boolean; // Whether this is an option image (vs main product image)
  useContainScaling?: boolean; // Force object-contain for main images with portrait aspect ratio
}

export default function ProductImage({
  imageUrl,
  alt = "Sauna product",
  selectedOptionLabel,
  isOptionImage = false,
  useContainScaling = false,
}: ProductImageProps) {
  // Log image URL changes for debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !isOptionImage) {
      console.log("🖼️ ProductImage: Main product image URL changed:", {
        imageUrl: imageUrl || "Not set",
        imageUrlLength: imageUrl?.length || 0,
        isOptionImage: false,
      });
    }
  }, [imageUrl, isOptionImage]);
  // Placeholder image if none provided
  const defaultImageUrl =
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=600&fit=crop";

  // Capitalize first letter of the badge text
  const capitalizedLabel = selectedOptionLabel 
    ? selectedOptionLabel.charAt(0).toUpperCase() + selectedOptionLabel.slice(1)
    : undefined;

  // For option images or portrait main images, use object-contain to show the full image without cropping
  // For main product images (by default), use object-cover for a filled look
  const shouldUseContain = isOptionImage || useContainScaling;
  const objectFitClass = shouldUseContain ? "object-contain" : "object-cover";
  
  // For option images or portrait main images, add a subtle gradient background
  const backgroundClass = shouldUseContain 
    ? "bg-gradient-to-br from-gray-50 to-gray-100" 
    : "bg-gray-100";
  
  // Add padding container for option images to give them breathing room
  // For portrait main images using contain scaling, also add some padding for a cleaner look
  const containerClass = shouldUseContain 
    ? "relative w-full aspect-video sm:aspect-square md:aspect-square lg:aspect-auto lg:h-[600px] rounded-lg overflow-hidden flex items-center justify-center p-4 sm:p-6 md:p-8"
    : "relative w-full aspect-video sm:aspect-square md:aspect-square lg:aspect-auto lg:h-[600px] rounded-lg overflow-hidden";

  // Create cache-busting URL that changes when imageUrl changes
  // Use a hash of the URL + timestamp to ensure it updates when the URL changes
  // For main product images, we want to force refresh when URL changes
  const cachedImageUrl = useMemo(() => {
    if (!imageUrl) return defaultImageUrl;
    
    // Create a cache-busting parameter based on the URL itself
    // This ensures the image refreshes when the URL changes
    const separator = imageUrl.includes('?') ? '&' : '?';
    // Use a combination of URL hash and current time to ensure uniqueness
    const urlHash = imageUrl.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    const cacheBuster = `t=${Date.now()}&v=${Math.abs(urlHash)}`;
    const finalUrl = `${imageUrl}${separator}${cacheBuster}`;
    
    if (process.env.NODE_ENV === 'development' && !isOptionImage) {
      console.log("🖼️ ProductImage: Generated cache-busted URL:", {
        originalUrl: imageUrl.substring(0, 100),
        cacheBustedUrl: finalUrl.substring(0, 150),
        urlHash: Math.abs(urlHash),
      });
    }
    
    return finalUrl;
  }, [imageUrl, isOptionImage]);

  return (
    <div className={`${containerClass} ${backgroundClass}`}>
      <img
        src={cachedImageUrl}
        alt={alt}
        className={`w-full h-full ${objectFitClass} ${shouldUseContain ? 'max-w-full max-h-full' : ''}`}
        style={shouldUseContain ? {
          // Ensure images using contain scaling are centered and don't stretch
          objectPosition: 'center',
          maxWidth: '100%',
          maxHeight: '100%',
        } : undefined}
        key={imageUrl} // Force re-render when image URL changes
        onError={(e) => {
          // Fallback to default image if the image fails to load
          if (e.currentTarget.src !== defaultImageUrl) {
            console.warn(`⚠️ Failed to load image: ${imageUrl}, falling back to default`);
            e.currentTarget.src = defaultImageUrl;
          }
        }}
      />
      {capitalizedLabel && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded text-sm font-medium">
          {capitalizedLabel}
        </div>
      )}
    </div>
  );
}


