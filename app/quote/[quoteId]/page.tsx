"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
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
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 sm:gap-0 mb-6">
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#303337] mb-2">Quote</h1>
              <p className="text-gray-600 text-sm sm:text-base">Quote ID: {quote.id}</p>
            </div>
            <div className="sm:ml-4 flex-shrink-0 relative h-10 sm:h-14 w-[160px] sm:w-[230px]">
              <Image 
                src="/saunamo-logo.png" 
                alt="Saunamo Logo" 
                fill
                sizes="230px"
                className="object-contain"
                priority
              />
            </div>
          </div>
          
          {/* Company Information */}
          <div className="border-t border-gray-200 pt-4 text-sm text-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <p className="font-semibold text-gray-900">Arbor Eco Lda</p>
                <p>Rua Bombeiros Voluntários de Ourém</p>
                <p>2490-755 Vilar dos Prazeres</p>
                <p>Ourém, Portugal</p>
              </div>
              <div className="sm:text-right">
                <p>E-mail: <a href="mailto:info@saunamo.pt" className="text-[#303337] hover:underline">info@saunamo.pt</a></p>
                <p>NIF: 517939126</p>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information - Combined with Quote Details */}
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
            <div>
              <p className="text-sm text-gray-600">Product</p>
              <p className="font-medium text-gray-900">{quote.productName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Quote Date</p>
              <p className="font-medium text-gray-900">{formatDate(quote.createdAt)}</p>
            </div>
            {quote.expiresAt && (
              <div>
                <p className="text-sm text-gray-600">Valid Until</p>
                <p className="font-medium text-gray-900">{formatDate(quote.expiresAt)}</p>
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
                    // Check if this is a POA (Price to be confirmed) item
                    const isPOA = (item as any).priceLabel === "Price to be confirmed" || 
                                  (item as any).priceLabel?.toLowerCase() === "price to be confirmed" ||
                                  (item as any).priceLabel === "POA" || 
                                  (item as any).priceLabel?.toLowerCase() === "poa";
                    
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
                              <div className="text-sm text-gray-500 mt-1">
                                {item.optionDescription.split('\n').map((line, idx) => {
                                  const isLocationLine = line.startsWith("Delivery Location:");
                                  return (
                                    <p key={idx} className={
                                      line === "Included" ? "font-medium text-green-700" : 
                                      line === "Price to be confirmed" ? "font-medium text-red-600" :
                                      isLocationLine ? "font-medium text-blue-600" : ""
                                    }>
                                      {line}
                                    </p>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="text-right py-4 px-4 font-medium text-gray-900">
                          {isPOA ? "POA" : formatCurrency(priceExclVat)}
                        </td>
                        <td className="text-right py-4 px-4 text-gray-700">
                          {isPOA ? "-" : `${(vatRate * 100).toFixed(0)}%`}
                        </td>
                        <td className="text-right py-4 px-4 text-gray-700">
                          {quantity}
                        </td>
                        <td className="text-right py-4 px-4 font-medium text-gray-900">
                          {isPOA ? "POA" : formatCurrency(totalInclVat)}
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
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-lg font-bold text-[#303337]">
                  {quote.discount && quote.discount > 0 
                    ? `Total${quote.discountDescription ? ` (${quote.discountDescription} applied)` : " (discount applied)"}:`
                    : "Total:"}
                </span>
                <span className="text-lg font-bold text-[#303337]">{formatCurrency(quote.total)}</span>
              </div>
              {quote.discount && quote.discount > 0 && (
                <div className="text-sm text-gray-500 mt-1 text-right">
                  (Includes discount of {formatCurrency(quote.discount)})
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bank Transfer Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-[#303337] mb-4">Bank transfer information:</h2>
          <div className="space-y-2 text-gray-700">
            <div>
              <span className="font-semibold">Iban:</span> PT50 0010 0000 6297 8400 0010 5
            </div>
            <div>
              <span className="font-semibold">Swift/BIC:</span> BBPIPTPL
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-[#303337] mb-4">Terms:</h2>
          <ul className="space-y-2 text-gray-700 list-disc list-inside">
            <li>A 50% deposit is required to confirm production.</li>
            <li>The remaining balance must be paid before the product is delivered.</li>
            <li>The deposit is non-refundable if the customer cancels the order.</li>
            <li>Transportation costs are subject to change.</li>
            <li>If an installation service is contracted with Arbor Eco LDA, it is limited to product assembly.</li>
            <li>Electrical installations are not included.</li>
          </ul>
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
                  // PDF filename: "Product name Quote + Name"
                  const customerName = quote.customerName || quote.customerEmail.split('@')[0];
                  const sanitizedName = customerName.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, ' ');
                  const sanitizedProductName = quote.productName.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, ' ');
                  a.download = `${sanitizedProductName} Quote ${sanitizedName}.pdf`;
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

      </div>
    </div>
  );
}
