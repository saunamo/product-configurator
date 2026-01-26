"use client";

import { QuoteSettings } from "@/types/admin";
import { Quote } from "@/types/quote";

interface QuotePreviewProps {
  quoteSettings: QuoteSettings;
}

/**
 * Preview component for quote template
 * Shows a preview of how the quote will look with current settings
 */
export default function QuotePreview({ quoteSettings }: QuotePreviewProps) {
  // Create a sample quote for preview
  const sampleQuote: Quote = {
    id: "quote-preview-001",
    productName: "Sample Product",
    customerEmail: "customer@example.com",
    customerName: "John Doe",
    customerPhone: "+1 (555) 123-4567",
    items: [
      {
        stepId: "rear-glass-wall" as any,
        stepName: "Rear Glass Wall",
        optionId: "option-1",
        optionTitle: "Premium Glass Wall",
        optionDescription: "High-quality tempered glass",
        price: 1250.00,
        vatRate: 0.23, // 23% VAT example
        quantity: 1,
      },
      {
        stepId: "lighting" as any,
        stepName: "Lighting",
        optionId: "option-2",
        optionTitle: "LED Under Bench Lighting",
        optionDescription: "Energy-efficient LED strips",
        price: 450.00,
        vatRate: 0.23, // 23% VAT example
        quantity: 1,
      },
      {
        stepId: "heater" as any,
        stepName: "Heater",
        optionId: "option-3",
        optionTitle: "Premium Sauna Heater",
        optionDescription: "8kW electric heater with digital controls",
        price: 1899.00,
        vatRate: 0.0, // 0% VAT example
        quantity: 1,
      },
    ],
    subtotal: 3599.00,
    tax: undefined, // Tax is calculated per item now
    taxRate: undefined, // Tax rate is per item now
    total: 3599.00 + (1250.00 * 0.23) + (450.00 * 0.23) + (1899.00 * 0.0), // Calculate total with item-specific VAT
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + quoteSettings.quoteValidityDays * 24 * 60 * 60 * 1000),
    notes: quoteSettings.notes || "Thank you for your interest!",
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: quoteSettings.currency || "USD",
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Build full company address
  const addressParts = [
    quoteSettings.companyAddress,
    quoteSettings.companyCity,
    quoteSettings.companyState,
    quoteSettings.companyZip,
    quoteSettings.companyCountry,
  ].filter(Boolean);
  const fullAddress = addressParts.join(", ");

  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg p-8 max-w-4xl mx-auto" style={{ minHeight: "800px" }}>
      {/* Header */}
      <div className="border-b-2 border-[#303337] pb-4 mb-6" style={{ borderColor: "#303337" }}>
        {quoteSettings.companyLogoUrl && (
          <img
            src={quoteSettings.companyLogoUrl}
            alt="Company Logo"
            className="h-12 mb-4 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <h1 className="text-2xl font-bold mb-2" style={{ color: "#303337" }}>
          {quoteSettings.companyName || "Company Name"}
        </h1>
        {fullAddress && (
          <p className="text-sm text-gray-600">{fullAddress}</p>
        )}
        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
          {quoteSettings.companyPhone && (
            <span>Phone: {quoteSettings.companyPhone}</span>
          )}
          {quoteSettings.companyEmail && (
            <span>Email: {quoteSettings.companyEmail}</span>
          )}
          {quoteSettings.companyWebsite && (
            <span>Website: {quoteSettings.companyWebsite}</span>
          )}
        </div>
      </div>

      {/* Title */}
      <h2 className="text-xl font-bold mb-6" style={{ color: "#303337" }}>Quote</h2>

      {/* Customer Information */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600 mb-1">Customer:</p>
            <p className="font-medium text-gray-900">{sampleQuote.customerName}</p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Email:</p>
            <p className="font-medium text-gray-900">{sampleQuote.customerEmail}</p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Phone:</p>
            <p className="font-medium text-gray-900">{sampleQuote.customerPhone}</p>
          </div>
        </div>
      </div>

      {/* Quote Details */}
      <div className="mb-6 text-sm">
        <div className="flex gap-4">
          <div>
            <p className="text-gray-600 mb-1">Quote Date:</p>
            <p className="font-medium">{formatDate(sampleQuote.createdAt)}</p>
          </div>
          {sampleQuote.expiresAt && (
            <div>
              <p className="text-gray-600 mb-1">Valid Until:</p>
              <p className="font-medium">{formatDate(sampleQuote.expiresAt)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: "#303337", color: "#ffffff" }}>
              <th className="text-left p-3 text-sm font-semibold">Description</th>
              <th className="text-right p-3 text-sm font-semibold">VAT %</th>
              <th className="text-right p-3 text-sm font-semibold">Qty</th>
            </tr>
          </thead>
          <tbody>
            {sampleQuote.items.map((item, index) => {
              const itemVatRate = item.vatRate || (sampleQuote.taxRate || 0);
              const quantity = item.quantity || 1;
              
              return (
                <tr key={index} className="border-b border-gray-200">
                  <td className="p-3">
                    <p className="font-medium text-sm">{item.optionTitle}</p>
                    <p className="text-xs text-gray-600">{item.stepName}</p>
                    {item.optionDescription && (
                      <p className="text-xs text-gray-500 mt-1">{item.optionDescription}</p>
                    )}
                  </td>
                  <td className="text-right p-3 text-sm">{itemVatRate > 0 ? `${(itemVatRate * 100).toFixed(0)}%` : "0%"}</td>
                  <td className="text-right p-3 text-sm">{quantity}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="border-t-2 pt-4 mb-6" style={{ borderColor: "#303337" }}>
        {sampleQuote.discount && sampleQuote.discount > 0 && (
          <div className="flex justify-between items-center mb-2 text-sm">
            <span className="text-gray-600">
              Discount{sampleQuote.discountDescription ? ` (${sampleQuote.discountDescription})` : ""}:
            </span>
            <span className="font-medium text-red-600">-{formatCurrency(sampleQuote.discount)}</span>
          </div>
        )}
        {sampleQuote.tax && sampleQuote.tax > 0 && (
          <div className="flex justify-between items-center mb-2 text-sm">
            <span className="text-gray-600">
              Tax ({sampleQuote.taxRate ? `${(sampleQuote.taxRate * 100).toFixed(2)}%` : ""}):
            </span>
            <span className="font-medium">{formatCurrency(sampleQuote.tax)}</span>
          </div>
        )}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
          <span className="text-lg font-bold" style={{ color: "#303337" }}>Total:</span>
          <span className="text-lg font-bold" style={{ color: "#303337" }}>{formatCurrency(sampleQuote.total)}</span>
        </div>
      </div>

      {/* Notes */}
      {(sampleQuote.notes || quoteSettings.notes) && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="font-semibold text-sm mb-2">Notes:</p>
          <p className="text-sm text-gray-700">{sampleQuote.notes || quoteSettings.notes}</p>
        </div>
      )}

      {/* Terms & Conditions */}
      {quoteSettings.termsAndConditions && (
        <div className="mb-6">
          <p className="font-semibold text-sm mb-2">Terms and Conditions:</p>
          <p className="text-xs text-gray-700 whitespace-pre-wrap">{quoteSettings.termsAndConditions}</p>
        </div>
      )}

      {/* Payment Terms */}
      {quoteSettings.paymentTerms && (
        <div className="mb-6">
          <p className="font-semibold text-sm mb-2">Payment Terms:</p>
          <p className="text-xs text-gray-700 whitespace-pre-wrap">{quoteSettings.paymentTerms}</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-200 pt-4 mt-8 text-center">
        <p className="text-xs text-gray-600 mb-2">
          {quoteSettings.footerText || `Thank you for your interest in ${sampleQuote.productName}!`}
        </p>
        <p className="text-xs text-gray-500">Quote ID: {sampleQuote.id}</p>
      </div>
    </div>
  );
}

