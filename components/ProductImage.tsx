"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";

interface ProductImageProps {
  imageUrl?: string;
  alt?: string;
  selectedOptionLabel?: string;
  isOptionImage?: boolean; // Whether this is an option image (vs main product image)
  useContainScaling?: boolean; // Force object-contain for main images with portrait aspect ratio
  priority?: boolean; // Load this image with priority (above the fold)
}

export default function ProductImage({
  imageUrl,
  alt = "Sauna product",
  selectedOptionLabel,
  isOptionImage = false,
  useContainScaling = false,
  priority = false,
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
  
  // Reset loaded state when image URL changes for smooth transition
  useEffect(() => {
    if (imageUrl !== currentImageUrl) {
      setIsLoaded(false);
      setCurrentImageUrl(imageUrl);
      setHasError(false);
    }
  }, [imageUrl, currentImageUrl]);
  
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
  
  // For option images or portrait main images, add a subtle gradient background
  const backgroundClass = shouldUseContain 
    ? "bg-gradient-to-br from-gray-50 to-gray-100" 
    : "bg-gray-100";
  
  // Add padding container for option images to give them breathing room
  // For portrait main images using contain scaling, also add some padding for a cleaner look
  const containerClass = shouldUseContain 
    ? "relative w-full aspect-video sm:aspect-square md:aspect-square lg:aspect-auto lg:h-[600px] rounded-lg overflow-hidden flex items-center justify-center p-4 sm:p-6 md:p-8"
    : "relative w-full aspect-video sm:aspect-square md:aspect-square lg:aspect-auto lg:h-[600px] rounded-lg overflow-hidden";

  // Determine the final image URL
  const finalImageUrl = useMemo(() => {
    if (hasError || !imageUrl) return defaultImageUrl;
    return imageUrl;
  }, [imageUrl, hasError]);

  // Check if it's a local image (starts with / or doesn't have a protocol)
  const isLocalImage = finalImageUrl.startsWith('/') || !finalImageUrl.includes('://');
  
  // Check if it's an external image we support
  const isExternalSupported = finalImageUrl.includes('unsplash.com') || finalImageUrl.includes('cloudinary.com');

  // For external images not in our allowed list, use regular img tag
  const useNextImage = isLocalImage || isExternalSupported;

  return (
    <div className={`${containerClass} ${backgroundClass}`}>
      {useNextImage ? (
        <Image
          src={finalImageUrl}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 70vw"
          className={`${shouldUseContain ? 'object-contain' : 'object-cover'} transition-opacity duration-300 ease-in-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={shouldUseContain ? { objectPosition: 'center' } : undefined}
          priority={priority}
          quality={85}
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            console.warn(`⚠️ Failed to load image: ${imageUrl}, falling back to default`);
            setHasError(true);
            setIsLoaded(true);
          }}
        />
      ) : (
        // Fallback to regular img for unsupported external images
        <img
          src={finalImageUrl}
          alt={alt}
          className={`w-full h-full ${shouldUseContain ? 'object-contain' : 'object-cover'} ${shouldUseContain ? 'max-w-full max-h-full' : ''} transition-opacity duration-300 ease-in-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={shouldUseContain ? {
            objectPosition: 'center',
            maxWidth: '100%',
            maxHeight: '100%',
          } : undefined}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={(e) => {
            if (e.currentTarget.src !== defaultImageUrl) {
              console.warn(`⚠️ Failed to load image: ${imageUrl}, falling back to default`);
              e.currentTarget.src = defaultImageUrl;
            }
            setIsLoaded(true);
          }}
        />
      )}
      {capitalizedLabel && (
        <div className={`absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded text-sm font-medium z-10 transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
          {capitalizedLabel}
        </div>
      )}
    </div>
  );
}
