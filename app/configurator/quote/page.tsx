"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConfigurator } from "@/contexts/ConfiguratorContext";
import { useAdminConfig } from "@/contexts/AdminConfigContext";
import { STEPS } from "@/constants/steps";
import ConfiguratorLayout from "@/components/ConfiguratorLayout";
import { capitalize } from "@/utils/capitalize";

export default function QuotePage() {
  const router = useRouter();
  const { state } = useConfigurator();
  const { config } = useAdminConfig();
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  // Check if user has made any selections
  const hasSelections = Object.values(state.selections).some(
    (selections) => selections.length > 0
  );

  useEffect(() => {
    if (!hasSelections) {
      router.push("/configurator/rear-glass-wall");
    }
  }, [hasSelections, router]);

  if (!hasSelections) {
    return null;
  }

  // Calculate current total from selections
  const calculateTotal = () => {
    let total = 0;
    Object.entries(state.selections).forEach(([stepId, optionIds]) => {
      const stepData = config?.stepData[stepId];
      if (!stepData) return;

      optionIds.forEach((optionId) => {
        const option = stepData.options.find((opt) => opt.id === optionId);
        if (option) {
          total += option.price;
        }
      });
    });
    return total;
  };

  const handleGenerateQuote = async () => {
    if (!customerEmail) {
      setError("Please enter your email address");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/quotes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selections: state.selections,
          customerEmail,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          notes: notes || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate quote");
      }

      const data = await response.json();
      
      // Generate and open PDF locally
      try {
        // Load config to get quote settings
        const { loadConfigFromStorage } = await import("@/utils/configStorage");
        const adminConfig = loadConfigFromStorage();
        
        const pdfResponse = await fetch("/api/quotes/pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            quote: data.quote,
            quoteSettings: adminConfig?.quoteSettings, // Pass quote settings
          }),
        });

        if (pdfResponse.ok) {
          const pdfBlob = await pdfResponse.blob();
          const pdfUrl = URL.createObjectURL(pdfBlob);
          
          // Open PDF in new tab
          window.open(pdfUrl, "_blank");
          
          // Clean up the URL after a delay
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
          
          alert(`Quote generated successfully! Quote ID: ${data.quoteId}\n\nThe PDF has been opened in a new tab.`);
        } else {
          alert(`Quote generated successfully! Quote ID: ${data.quoteId}\n\nNote: PDF generation failed.`);
        }
      } catch (pdfError) {
        console.error("Failed to generate PDF:", pdfError);
        alert(`Quote generated successfully! Quote ID: ${data.quoteId}\n\nNote: PDF generation failed.`);
      }
      
      // Optionally redirect or reset
    } catch (err: any) {
      setError(err.message || "Failed to generate quote. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const lastStep = STEPS[STEPS.length - 1];
  const lastStepData = config?.stepData[lastStep.id];

  return (
    <ConfiguratorLayout
      currentStepId={lastStep.id}
      stepData={lastStepData || {
        stepId: lastStep.id,
        title: "Generate Quote",
        description: "Review your selections and generate a quote",
        options: [],
        selectionType: "single",
        required: false,
      }}
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quote Summary</h2>
          <p className="text-gray-600">
            Review your selections and provide your contact information to generate a quote.
          </p>
        </div>

        {/* Selections Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Selections</h3>
          {STEPS.map((step) => {
            const stepData = config?.stepData[step.id];
            const selectedIds = state.selections[step.id] || [];
            if (selectedIds.length === 0 || !stepData) return null;

            return (
              <div key={step.id} className="border-b border-gray-200 pb-4 last:border-0">
                <h4 className="font-medium text-gray-900 mb-2">{step.name}</h4>
                <ul className="space-y-1">
                  {selectedIds.map((optionId) => {
                    const option = stepData.options.find((opt) => opt.id === optionId);
                    if (!option) return null;
                    return (
                      <li key={optionId} className="text-sm text-gray-700">
                        {capitalize(option.title)}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Customer Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-800 focus:border-green-800"
              placeholder="Any special requirements or questions..."
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Generate Quote Button */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 rounded-lg font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={handleGenerateQuote}
            disabled={isGenerating || !customerEmail}
            className="px-6 py-3 rounded-lg font-medium bg-green-800 text-white hover:bg-green-900 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            {isGenerating ? "Generating Quote..." : "Generate Quote →"}
          </button>
        </div>
      </div>
    </ConfiguratorLayout>
  );
}

