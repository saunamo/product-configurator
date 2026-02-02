import { Metadata } from "next";

// Dynamic metadata for product pages
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = params.slug;
  
  // Convert slug to readable product name
  // e.g., "cube-220" -> "Outdoor Sauna Cube 220"
  // e.g., "barrel-280" -> "Outdoor Sauna Barrel 280"
  // e.g., "aura-150" -> "Infrared Sauna Aura 150"
  // e.g., "hiki-s" -> "Indoor Sauna Hiki S"
  // e.g., "aisti-150" -> "Indoor Sauna Aisti 150"
  
  const productName = formatProductName(slug);
  const productType = getProductType(slug);
  
  return {
    title: `Configure ${productName} | Saunamo Product Configurator`,
    description: `Customize your ${productName} ${productType}. Choose heater, lighting, accessories, and delivery options. Get an instant quote from Saunamo.`,
    openGraph: {
      title: `Configure ${productName} | Saunamo`,
      description: `Customize your ${productName} ${productType}. Choose heater, lighting, accessories, and delivery options.`,
      type: "website",
      siteName: "Saunamo",
    },
  };
}

function formatProductName(slug: string): string {
  // Handle specific product names
  const productMappings: Record<string, string> = {
    "cube-125": "Outdoor Sauna Cube 125",
    "cube-220": "Outdoor Sauna Cube 220",
    "cube-300": "Outdoor Sauna Cube 300",
    "barrel-220": "Outdoor Sauna Barrel 220",
    "barrel-280": "Outdoor Sauna Barrel 280",
    "aura-110": "Infrared Sauna Aura 110",
    "aura-150": "Infrared Sauna Aura 150",
    "hiki-s": "Indoor Sauna Hiki S",
    "hiki-l": "Indoor Sauna Hiki L",
    "aisti-150": "Indoor Sauna Aisti 150",
  };
  
  if (productMappings[slug]) {
    return productMappings[slug];
  }
  
  // Generic formatting: capitalize words and replace hyphens
  return slug
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getProductType(slug: string): string {
  const slugLower = slug.toLowerCase();
  
  if (slugLower.includes("cube") || slugLower.includes("barrel")) {
    return "outdoor sauna";
  }
  if (slugLower.includes("aura")) {
    return "infrared sauna";
  }
  if (slugLower.includes("hiki") || slugLower.includes("aisti")) {
    return "indoor sauna";
  }
  
  return "sauna";
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
