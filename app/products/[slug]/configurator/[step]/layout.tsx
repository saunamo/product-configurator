import { Metadata } from "next";

// Dynamic metadata for configurator step pages
export async function generateMetadata({ params }: { params: { slug: string; step: string } }): Promise<Metadata> {
  const { slug, step } = params;
  
  const productName = formatProductName(slug);
  const stepName = formatStepName(step);
  const productType = getProductType(slug);
  
  return {
    title: `${stepName} - ${productName} | Saunamo Configurator`,
    description: `Choose ${stepName.toLowerCase()} options for your ${productName}. Customize your ${productType} with Saunamo's product configurator and get an instant quote.`,
    openGraph: {
      title: `${stepName} - ${productName} | Saunamo`,
      description: `Choose ${stepName.toLowerCase()} options for your ${productName}. Customize your ${productType} with Saunamo.`,
      type: "website",
      siteName: "Saunamo",
    },
  };
}

function formatProductName(slug: string): string {
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
  
  return slug
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatStepName(step: string): string {
  const stepMappings: Record<string, string> = {
    "heater": "Heater Selection",
    "rear-glass-wall": "Rear Wall Options",
    "lighting": "Lighting Options",
    "accessories": "Accessories",
    "electrical-assembly": "Installation & Assembly",
    "delivery": "Delivery Options",
    "cold-plunge": "Ice Bath Options",
    "hot-tubs": "Hot Tub Options",
    "quote": "Get Your Quote",
  };
  
  if (stepMappings[step]) {
    return stepMappings[step];
  }
  
  return step
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

export default function ConfiguratorStepLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
