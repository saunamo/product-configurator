import type { Metadata } from "next";
import "./globals.css";
import { ConfiguratorProvider } from "@/contexts/ConfiguratorContext";
import { AdminConfigProvider } from "@/contexts/AdminConfigContext";

export const metadata: Metadata = {
  title: {
    template: "%s | Saunamo",
    default: "Saunamo Product Configurator - Design Your Perfect Sauna",
  },
  description: "Customize your dream sauna with Saunamo's interactive product configurator. Choose from outdoor saunas, infrared saunas, indoor saunas, and more. Get an instant quote.",
  keywords: ["sauna", "outdoor sauna", "indoor sauna", "infrared sauna", "sauna configurator", "custom sauna", "Saunamo"],
  openGraph: {
    title: "Saunamo Product Configurator",
    description: "Design and customize your perfect sauna. Choose heaters, lighting, accessories, and delivery options.",
    type: "website",
    siteName: "Saunamo",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Questrial&display=swap" rel="stylesheet" />
      </head>
      <body
        className="antialiased"
        style={{ fontFamily: "'Questrial', sans-serif" }}
      >
        <AdminConfigProvider>
          <ConfiguratorProvider>{children}</ConfiguratorProvider>
        </AdminConfigProvider>
      </body>
    </html>
  );
}
