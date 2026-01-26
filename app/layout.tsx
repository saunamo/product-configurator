import type { Metadata } from "next";
import "./globals.css";
import { ConfiguratorProvider } from "@/contexts/ConfiguratorContext";
import { AdminConfigProvider } from "@/contexts/AdminConfigContext";

export const metadata: Metadata = {
  title: "Saunamo Product Configurator",
  description: "Saunamo Product Configurator",
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
