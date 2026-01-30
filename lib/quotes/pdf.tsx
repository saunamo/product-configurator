/**
 * PDF Quote Template
 * Generates a professional PDF quote document
 */

import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";
import { join } from "path";
import { Quote } from "@/types/quote";

// Register Questrial font to match the quote portal
Font.register({
  family: "Questrial",
  src: join(process.cwd(), "public", "fonts", "Questrial-Regular.ttf"),
});

// Define styles for the PDF - matching portal quote page exactly with smaller fonts
// Using Questrial font to match the quote portal
const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 10,
    fontFamily: "Questrial", // Matching the quote portal font
    backgroundColor: "#F3F0ED", // Portal background color
  },
  sectionBox: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    // Shadow effect (simulated with border)
    border: "1 solid #e5e7eb",
    // Prevent page breaks inside sections
    break: false,
  },
  quoteTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#303337",
    marginBottom: 6,
  },
  quoteIdText: {
    fontSize: 11,
    color: "#6b7280",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#303337",
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 3,
  },
  fieldValue: {
    fontSize: 11,
    fontWeight: "500",
    color: "#111827",
  },
  detailLabel: {
    fontSize: 11,
    color: "#6b7280",
  },
  detailValue: {
    fontSize: 11,
    fontWeight: "500",
    color: "#111827",
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeaderText: {
    color: "#374151",
    fontSize: 11,
    fontWeight: "600",
  },
  tableCell: {
    fontSize: 11,
    color: "#111827",
  },
  colDescription: {
    width: "35%",
  },
  colPriceVat0: {
    width: "18%",
    textAlign: "right",
  },
  colVat: {
    width: "12%",
    textAlign: "right",
  },
  colQuantity: {
    width: "10%",
    textAlign: "right",
  },
  colTotal: {
    width: "25%",
    textAlign: "right",
  },
  grandTotal: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#303337",
  },
  notesText: {
    fontSize: 11,
    color: "#374151",
    lineHeight: 1.5,
  },
});

interface QuotePDFProps {
  quote: Quote;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  logoUrl?: string;
  currency?: string;
  termsAndConditions?: string;
  paymentTerms?: string;
  footerText?: string;
  defaultNotes?: string;
}

export function QuotePDFDocument({
  quote,
  companyName = "Saunamo, Arbor Eco LDA",
  companyAddress = "",
  companyPhone = "",
  companyEmail = "",
  companyWebsite = "",
  logoUrl,
  currency = "GBP",
  termsAndConditions = "",
  paymentTerms = "",
  footerText = "",
  defaultNotes = "",
}: QuotePDFProps) {
  const formatCurrency = (amount: number) => {
    // Always use GBP regardless of currency prop
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Quote Header - matching portal layout */}
        <View style={[styles.sectionBox, { marginBottom: 24 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.quoteTitle}>Quote</Text>
              <Text style={styles.quoteIdText}>Quote ID: {quote.id}</Text>
            </View>
            <View style={{ marginLeft: 16 }}>
              <Image
                src={join(process.cwd(), "public", "saunamo-logo.webp")}
                style={{ width: 199, height: 35 }} // 28% smaller: 276 * 0.72 = 199, 48 * 0.72 = 35
              />
            </View>
          </View>
        </View>

        {/* Customer Information - Combined with Quote Details */}
        <View style={[styles.sectionBox, { marginBottom: 24 }]}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 12 }}>
            <View style={{ width: "50%", marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>Name</Text>
              <Text style={styles.fieldValue}>{quote.customerName || "N/A"}</Text>
            </View>
            <View style={{ width: "50%", marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.fieldValue}>{quote.customerEmail}</Text>
            </View>
            {quote.customerPhone && (
              <View style={{ width: "50%", marginBottom: 12 }}>
                <Text style={styles.fieldLabel}>Phone</Text>
                <Text style={styles.fieldValue}>{quote.customerPhone}</Text>
              </View>
            )}
            <View style={{ width: "50%", marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>Product</Text>
              <Text style={styles.fieldValue}>{quote.productName}</Text>
            </View>
            <View style={{ width: "50%", marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>Quote Date</Text>
              <Text style={styles.fieldValue}>{formatDate(quote.createdAt)}</Text>
            </View>
            {quote.expiresAt && (
              <View style={{ width: "50%", marginBottom: 12 }}>
                <Text style={styles.fieldLabel}>Valid Until</Text>
                <Text style={styles.fieldValue}>{formatDate(quote.expiresAt)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Items */}
        <View style={[styles.sectionBox, { marginBottom: 24 }]}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={{ marginTop: 12 }}>
            {/* Table Header */}
            <View style={{ flexDirection: "row", borderBottom: "2 solid #d1d5db", paddingBottom: 12, marginBottom: 12 }}>
              <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
              <Text style={[styles.tableHeaderText, styles.colPriceVat0]}>Price (VAT 0%)</Text>
              <Text style={[styles.tableHeaderText, styles.colVat]}>VAT %</Text>
              <Text style={[styles.tableHeaderText, styles.colQuantity]}>QTY</Text>
              <Text style={[styles.tableHeaderText, styles.colTotal]}>Total (incl. VAT)</Text>
            </View>
            {quote.items.map((item, index) => {
              // Calculate VAT rate (default to 20% for UK)
              const vatRate = item.vatRate !== undefined ? item.vatRate : (quote.taxRate !== undefined ? quote.taxRate : 0.20);
              const quantity = item.quantity || 1;
              // Price without VAT
              const priceExclVat = item.price;
              // VAT amount per unit
              const vatAmount = priceExclVat * vatRate;
              // Price including VAT per unit
              const priceInclVat = priceExclVat + vatAmount;
              // Total including VAT for the line
              const totalInclVat = priceInclVat * quantity;
              
              return (
                <View key={index} style={{ flexDirection: "row", borderBottom: "1 solid #e5e7eb", paddingVertical: 12, break: false }}>
                  <View style={styles.colDescription}>
                    <Text style={[styles.tableCell, { fontWeight: "bold", marginBottom: 4 }]}>
                      {item.optionTitle}
                    </Text>
                    <Text style={[styles.tableCell, { fontSize: 9, color: "#6b7280", marginBottom: 4 }]}>
                      {item.stepName}
                    </Text>
                    {item.optionDescription && (
                      <View style={{ marginTop: 4 }}>
                        {item.optionDescription.split('\n').map((line, idx) => (
                          <Text 
                            key={idx} 
                            style={[
                              styles.tableCell, 
                              { 
                                fontSize: 9, 
                                color: line === "Included" ? "#059669" : "#9ca3af",
                                fontWeight: line === "Included" ? "bold" : "normal"
                              }
                            ]}
                          >
                            {line}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                  <Text style={[styles.tableCell, styles.colPriceVat0, { fontWeight: "bold" }]}>
                    {formatCurrency(priceExclVat)}
                  </Text>
                  <Text style={[styles.tableCell, styles.colVat]}>
                    {(vatRate * 100).toFixed(0)}%
                  </Text>
                  <Text style={[styles.tableCell, styles.colQuantity]}>
                    {quantity}
                  </Text>
                  <Text style={[styles.tableCell, styles.colTotal, { fontWeight: "bold" }]}>
                    {formatCurrency(totalInclVat)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Summary */}
        <View style={[styles.sectionBox, { marginBottom: 24 }]}>
          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={styles.detailLabel}>Subtotal:</Text>
              <Text style={styles.detailValue}>{formatCurrency(quote.subtotal)}</Text>
            </View>
            {quote.tax && quote.tax > 0 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={styles.detailLabel}>Tax:</Text>
                <Text style={styles.detailValue}>{formatCurrency(quote.tax)}</Text>
              </View>
            )}
            <View style={{ borderTop: "1 solid #e5e7eb", paddingTop: 8, marginTop: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={styles.grandTotal}>
                  {quote.discount && quote.discount > 0 
                    ? `Total${quote.discountDescription ? ` (${quote.discountDescription} applied)` : " (discount applied)"}:`
                    : "Total:"}
                </Text>
                <Text style={styles.grandTotal}>{formatCurrency(quote.total)}</Text>
              </View>
              {quote.discount && quote.discount > 0 && (
                <Text style={{ fontSize: 9, color: "#6b7280", textAlign: "right", marginTop: 4 }}>
                  (Includes discount of {formatCurrency(quote.discount)})
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Bank Transfer Information */}
        <View style={[styles.sectionBox, { marginBottom: 24 }]}>
          <Text style={styles.sectionTitle}>Bank transfer information:</Text>
          <View style={{ marginTop: 12 }}>
            <Text style={styles.notesText}>
              <Text style={{ fontWeight: "bold" }}>Iban:</Text> PT50 0010 0000 6297 8400 0010 5
            </Text>
            <Text style={[styles.notesText, { marginTop: 8 }]}>
              <Text style={{ fontWeight: "bold" }}>Swift/BIC:</Text> BBPIPTPL
            </Text>
          </View>
        </View>

        {/* Terms */}
        <View style={[styles.sectionBox, { marginBottom: 24 }]}>
          <Text style={styles.sectionTitle}>Terms:</Text>
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.notesText, { marginBottom: 6 }]}>• A 50% deposit is required to confirm production.</Text>
            <Text style={[styles.notesText, { marginBottom: 6 }]}>• The remaining balance must be paid before the product is delivered.</Text>
            <Text style={[styles.notesText, { marginBottom: 6 }]}>• The deposit is non-refundable if the customer cancels the order.</Text>
            <Text style={[styles.notesText, { marginBottom: 6 }]}>• Transportation costs are subject to change.</Text>
            <Text style={[styles.notesText, { marginBottom: 6 }]}>• If an installation service is contracted with Arbor Eco LDA, it is limited to product assembly.</Text>
            <Text style={styles.notesText}>• Electrical installations are not included.</Text>
          </View>
        </View>

        {/* Company Information Footer */}
        <View style={[styles.sectionBox, { marginTop: 24, break: false }]}>
          <Text style={styles.notesText}>
            <Text style={{ fontWeight: "bold" }}>Arbor Eco Unipessoal Lda</Text>{"\n"}
            Rua Bombeiros Voluntários de Ourém{"\n"}
            2490-755 Vilar dos Prazeres{"\n"}
            Ourém, Portugal{"\n"}
            E-mail: info@saunamo.pt{"\n"}
            NIF: 517939126
          </Text>
        </View>
      </Page>
    </Document>
  );
}

