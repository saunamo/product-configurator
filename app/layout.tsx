import type { Metadata } from "next";
import Script from "next/script";
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

        {/* Google Tag Manager */}
        <Script id="gtm-script" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-TTGP4SXJ');`}
        </Script>

        {/* Google tag (gtag.js) - GA4 */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-F83JZFWNH2" strategy="afterInteractive" />
        <Script id="ga4-config" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-F83JZFWNH2');`}
        </Script>
      </head>
      <body
        className="antialiased"
        style={{ fontFamily: "'Questrial', sans-serif" }}
      >
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-TTGP4SXJ"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>

        <AdminConfigProvider>
          <ConfiguratorProvider>{children}</ConfiguratorProvider>
        </AdminConfigProvider>
      </body>
    </html>
  );
}
