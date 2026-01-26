"use client";

interface ProductImageProps {
  imageUrl?: string;
  alt?: string;
  selectedOptionLabel?: string;
  isOptionImage?: boolean; // Whether this is an option image (vs main product image)
}

export default function ProductImage({
  imageUrl,
  alt = "Sauna product",
  selectedOptionLabel,
  isOptionImage = false,
}: ProductImageProps) {
  // Placeholder image if none provided
  const defaultImageUrl =
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=600&fit=crop";

  // Capitalize first letter of the badge text
  const capitalizedLabel = selectedOptionLabel 
    ? selectedOptionLabel.charAt(0).toUpperCase() + selectedOptionLabel.slice(1)
    : undefined;

  // For option images, use object-contain to show the full image without cropping
  // For main product images, use object-cover for a filled look
  const objectFitClass = isOptionImage ? "object-contain" : "object-cover";
  
  // For option images, add a subtle gradient background and padding to make them look better
  const backgroundClass = isOptionImage 
    ? "bg-gradient-to-br from-gray-50 to-gray-100" 
    : "bg-gray-100";
  
  // Add padding container for option images to give them breathing room
  const containerClass = isOptionImage 
    ? "relative w-full aspect-video sm:aspect-square md:aspect-square lg:aspect-auto lg:h-[600px] rounded-lg overflow-hidden flex items-center justify-center p-4 sm:p-6 md:p-8"
    : "relative w-full aspect-video sm:aspect-square md:aspect-square lg:aspect-auto lg:h-[600px] rounded-lg overflow-hidden";

  return (
    <div className={`${containerClass} ${backgroundClass}`}>
      <img
        src={imageUrl || defaultImageUrl}
        alt={alt}
        className={`w-full h-full ${objectFitClass} ${isOptionImage ? 'max-w-full max-h-full' : ''}`}
        style={isOptionImage ? {
          // Ensure option images are centered and don't stretch
          objectPosition: 'center',
          maxWidth: '100%',
          maxHeight: '100%',
        } : undefined}
      />
      {capitalizedLabel && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded text-sm font-medium">
          {capitalizedLabel}
        </div>
      )}
    </div>
  );
}


