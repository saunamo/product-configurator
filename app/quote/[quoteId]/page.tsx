"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Quote } from "@/types/quote";
import { QuoteSettings } from "@/types/admin";
import { defaultQuoteSettings } from "@/constants/defaultQuoteSettings";

export default function QuotePortalPage() {
  const params = useParams();
  const quoteId = params.quoteId as string;
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteSettings, setQuoteSettings] = useState<QuoteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quoteId) return;

    const loadQuote = async () => {
      try {
        // Add cache-busting timestamp to prevent stale data
        const response = await fetch(`/api/quotes/${quoteId}?t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
          },
        });
        if (!response.ok) {
          if (response.status === 404) {
            setError("Quote not found");
            console.error(`[Quote Portal] Quote ${quoteId} not found (404)`);
          } else {
            setError("Failed to load quote");
            console.error(`[Quote Portal] Failed to load quote ${quoteId}: ${response.status}`);
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        if (data.success && data.quote) {
          setQuote(data.quote);
          // Load quote settings for logo
          try {
            const settingsResponse = await fetch("/api/admin/config");
            if (settingsResponse.ok) {
              const settingsData = await settingsResponse.json();
              if (settingsData.config?.quoteSettings) {
                setQuoteSettings(settingsData.config.quoteSettings);
              } else {
                setQuoteSettings(defaultQuoteSettings);
              }
            } else {
              setQuoteSettings(defaultQuoteSettings);
            }
          } catch (err) {
            console.error("Error loading quote settings:", err);
            setQuoteSettings(defaultQuoteSettings);
          }
        } else {
          setError("Quote not found");
        }
      } catch (err) {
        console.error("Error loading quote:", err);
        setError("Failed to load quote");
      } finally {
        setLoading(false);
      }
    };

    loadQuote();
  }, [quoteId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F0ED] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600 mb-2">Loading quote...</div>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-[#F3F0ED] flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900 mb-2">Quote Not Found</div>
          <div className="text-gray-600">{error || "The quote you're looking for doesn't exist."}</div>
        </div>
      </div>
    );
  }

  const logoUrl = quoteSettings?.companyLogoUrl || process.env.NEXT_PUBLIC_COMPANY_LOGO_URL;

  return (
    <div className="min-h-screen bg-[#F3F0ED] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Quote Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#303337] mb-2">Quote</h1>
              <p className="text-gray-600">Quote ID: {quote.id}</p>
            </div>
            <div className="ml-4 flex-shrink-0">
              <img 
                src="/Saunamo-Logo text only Bold-2.png" 
                alt="Saunamo Logo" 
                className="h-12 w-auto object-contain"
                onError={(e) => {
                  // Try other image formats if PNG doesn't work
                  const img = e.target as HTMLImageElement;
                  const basePath = "/Saunamo-Logo text only Bold-2";
                  const extensions = [".jpg", ".jpeg", ".svg", ".webp"];
                  let currentIndex = 0;
                  const tryNext = () => {
                    if (currentIndex < extensions.length) {
                      img.src = basePath + extensions[currentIndex];
                      currentIndex++;
                    } else {
                      // If all image formats fail, hide the image
                      img.style.display = "none";
                    }
                  };
                  img.onerror = tryNext;
                  tryNext();
                }}
              />
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-[#303337] mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium text-gray-900">{quote.customerName || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium text-gray-900">{quote.customerEmail}</p>
            </div>
            {quote.customerPhone && (
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium text-gray-900">{quote.customerPhone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Quote Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-[#303337] mb-4">Quote Details</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Product:</span>
              <span className="font-medium text-gray-900">{quote.productName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Quote Date:</span>
              <span className="font-medium text-gray-900">{formatDate(quote.createdAt)}</span>
            </div>
            {quote.expiresAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Valid Until:</span>
                <span className="font-medium text-gray-900">{formatDate(quote.expiresAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-[#303337] mb-4">Items</h2>
          {!quote.items || quote.items.length === 0 ? (
            <p className="text-gray-500">No items in this quote.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Price (VAT 0%)</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">VAT %</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">QTY</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Total (incl. VAT)</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item, index) => {
                    // Calculate VAT rate (default to 20% for UK)
                    // item.vatRate is stored as decimal (e.g., 0.20 for 20%)
                    // quote.taxRate is also stored as decimal
                    const vatRate = item.vatRate !== undefined ? item.vatRate : (quote.taxRate !== undefined ? quote.taxRate : 0.20);
                    const quantity = item.quantity || 1;
                    // Price without VAT - item.price should be the base price excluding VAT
                    const priceExclVat = item.price;
                    // VAT amount per unit
                    const vatAmount = priceExclVat * vatRate;
                    // Price including VAT per unit
                    const priceInclVat = priceExclVat + vatAmount;
                    // Total including VAT for the line
                    const totalInclVat = priceInclVat * quantity;
                    
                    return (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{item.optionTitle}</p>
                            <p className="text-sm text-gray-600">{item.stepName}</p>
                            {item.optionDescription && (
                              <p className="text-sm text-gray-500 mt-1">{item.optionDescription}</p>
                            )}
                          </div>
                        </td>
                        <td className="text-right py-4 px-4 font-medium text-gray-900">
                          {formatCurrency(priceExclVat)}
                        </td>
                        <td className="text-right py-4 px-4 text-gray-700">
                          {(vatRate * 100).toFixed(0)}%
                        </td>
                        <td className="text-right py-4 px-4 text-gray-700">
                          {quantity}
                        </td>
                        <td className="text-right py-4 px-4 font-medium text-gray-900">
                          {formatCurrency(totalInclVat)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium text-gray-900">{formatCurrency(quote.subtotal)}</span>
            </div>
            {quote.tax && quote.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tax:</span>
                <span className="font-medium text-gray-900">{formatCurrency(quote.tax)}</span>
              </div>
            )}
            {quote.discount && quote.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount{quote.discountDescription ? ` (${quote.discountDescription})` : ""}:</span>
                <span className="font-medium">-{formatCurrency(quote.discount)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-lg font-bold text-[#303337]">Total:</span>
                <span className="text-lg font-bold text-[#303337]">{formatCurrency(quote.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Download PDF Button */}
        <div className="mt-6 text-center">
          <button
            onClick={async () => {
              try {
                const response = await fetch("/api/quotes/pdf", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ 
                    quote,
                    quoteSettings: quoteSettings || defaultQuoteSettings,
                  }),
                });
                if (response.ok) {
                  const pdfBlob = await response.blob();
                  const pdfUrl = URL.createObjectURL(pdfBlob);
                  const a = document.createElement("a");
                  a.href = pdfUrl;
                  a.download = `quote-${quote.id}.pdf`;
                  a.click();
                  URL.revokeObjectURL(pdfUrl);
                }
              } catch (err) {
                console.error("Failed to download PDF:", err);
              }
            }}
            className="px-6 py-3 bg-[#303337] text-white rounded-lg font-medium hover:bg-[#404040] transition-colors"
          >
            Download PDF
          </button>
        </div>

        {/* Company Information Footer */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <div className="text-sm text-gray-700 space-y-1">
            <p className="font-semibold text-gray-900">Arbor Eco Unipessoal Lda</p>
            <p>Rua Bombeiros Voluntários de Ourém</p>
            <p>2490-755 Vilar dos Prazeres</p>
            <p>Ourém, Portugal</p>
            <p className="mt-2">E-mail: <a href="mailto:info@saunamo.pt" className="text-[#303337] hover:underline">info@saunamo.pt</a></p>
            <p>NIF: 517939126</p>
          </div>
        </div>
      </div>
    </div>
  );
}
