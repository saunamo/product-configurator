/**
 * PDF Quote Template
 * Generates a professional PDF quote document
 */

import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { Quote } from "@/types/quote";

// Define styles for the PDF - using configurator color palette
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    fontFamily: "Helvetica",
    backgroundColor: "#F3F0ED", // Configurator background color
  },
  header: {
    marginBottom: 30,
    borderBottom: "2 solid #303337", // Configurator accent color
    paddingBottom: 15,
  },
  companyName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#303337", // Configurator accent color
    marginBottom: 5,
  },
  companyInfo: {
    fontSize: 10,
    color: "#908F8D", // Configurator text color
    marginTop: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#303337", // Configurator accent color
    marginTop: 20,
    marginBottom: 10,
  },
  section: {
    marginBottom: 20,
  },
  customerInfo: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 5,
  },
  label: {
    fontSize: 10,
    color: "#666666",
    marginBottom: 3,
  },
  value: {
    fontSize: 12,
    color: "#303337", // Configurator accent color
    marginBottom: 8,
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#303337", // Configurator accent color
    padding: 10,
    borderRadius: 3,
  },
  tableHeaderText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    padding: 10,
    borderBottom: "1 solid #e5e5e5",
  },
  tableCell: {
    fontSize: 10,
    color: "#333333",
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
  totals: {
    marginTop: 20,
    paddingTop: 15,
    borderTop: "2 solid #303337", // Configurator accent color
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  totalLabel: {
    fontSize: 12,
    color: "#666666",
  },
  totalValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#303337", // Configurator accent color
  },
  grandTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#303337", // Configurator accent color
  },
  notes: {
    marginTop: 30,
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 5,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#303337", // Configurator accent color
    marginBottom: 8,
  },
  notesText: {
    fontSize: 10,
    color: "#666666",
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: "#999999",
    borderTop: "1 solid #e5e5e5",
    paddingTop: 10,
  },
  quoteId: {
    fontSize: 9,
    color: "#999999",
    marginTop: 10,
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
  currency = "USD",
  termsAndConditions = "",
  paymentTerms = "",
  footerText = "",
  defaultNotes = "",
}: QuotePDFProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {logoUrl && (
            <Image
              src={logoUrl}
              style={{ width: 100, height: 50, marginBottom: 10 }}
            />
          )}
          <Text style={styles.companyName}>{companyName}</Text>
          {companyAddress && (
            <Text style={styles.companyInfo}>{companyAddress}</Text>
          )}
          {companyPhone && (
            <Text style={styles.companyInfo}>Phone: {companyPhone}</Text>
          )}
          {companyEmail && (
            <Text style={styles.companyInfo}>Email: {companyEmail}</Text>
          )}
          {companyWebsite && (
            <Text style={styles.companyInfo}>Website: {companyWebsite}</Text>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>Quote</Text>

        {/* Customer Information */}
        <View style={styles.customerInfo}>
          <Text style={styles.label}>Customer:</Text>
          <Text style={styles.value}>
            {quote.customerName || quote.customerEmail}
          </Text>
          {quote.customerEmail && (
            <>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{quote.customerEmail}</Text>
            </>
          )}
          {quote.customerPhone && (
            <>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{quote.customerPhone}</Text>
            </>
          )}
        </View>

        {/* Quote Details */}
        <View style={styles.section}>
          <Text style={styles.label}>Quote Date:</Text>
          <Text style={styles.value}>{formatDate(quote.createdAt)}</Text>
          {quote.expiresAt && (
            <>
              <Text style={styles.label}>Valid Until:</Text>
              <Text style={styles.value}>{formatDate(quote.expiresAt)}</Text>
            </>
          )}
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDescription]}>
              Description
            </Text>
            <Text style={[styles.tableHeaderText, styles.colPriceVat0]}>
              Price (VAT 0%)
            </Text>
            <Text style={[styles.tableHeaderText, styles.colVat]}>
              VAT %
            </Text>
            <Text style={[styles.tableHeaderText, styles.colQuantity]}>
              Qty
            </Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>
              Total Including VAT
            </Text>
          </View>
          {quote.items.map((item, index) => {
            const itemVatRate = item.vatRate || 0;
            const quantity = item.quantity || 1;
            const itemVat = item.price * quantity * itemVatRate;
            const itemTotal = (item.price * quantity) + itemVat;
            
            // For heater stones, show quantity in description if not already in title
            const showQuantityInDescription = item.heaterStonesQuantity !== undefined && 
                                             item.heaterStonesQuantity > 0 &&
                                             !item.optionTitle.includes(`${item.heaterStonesQuantity}`);
            
            return (
              <View key={index} style={styles.tableRow}>
                <View style={styles.colDescription}>
                  <Text style={[styles.tableCell, { fontWeight: "bold" }]}>
                    {item.optionTitle}
                  </Text>
                  <Text style={[styles.tableCell, { fontSize: 9, color: "#666666" }]}>
                    {item.stepName}
                  </Text>
                  {showQuantityInDescription && (
                    <Text style={[styles.tableCell, { fontSize: 9, color: "#666666", marginTop: 2 }]}>
                      {item.heaterStonesQuantity} {item.heaterStonesQuantity === 1 ? 'package' : 'packages'} (20kg each)
                    </Text>
                  )}
                  {item.optionDescription && (
                    <Text style={[styles.tableCell, { fontSize: 9, color: "#999999", marginTop: 2 }]}>
                      {item.optionDescription}
                    </Text>
                  )}
                </View>
                <Text style={[styles.tableCell, styles.colPriceVat0]}>
                  {formatCurrency(item.price)}
                </Text>
                <Text style={[styles.tableCell, styles.colVat]}>
                  {itemVatRate > 0 ? `${(itemVatRate * 100).toFixed(0)}%` : "0%"}
                </Text>
                <Text style={[styles.tableCell, styles.colQuantity]}>
                  {quantity}
                </Text>
                <Text style={[styles.tableCell, styles.colTotal]}>
                  {formatCurrency(itemTotal)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(quote.subtotal)}</Text>
          </View>
          {quote.discount && quote.discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Discount{quote.discountDescription ? ` (${quote.discountDescription})` : ""}:
              </Text>
              <Text style={[styles.totalValue, { color: "#d32f2f" }]}>
                -{formatCurrency(quote.discount)}
              </Text>
            </View>
          )}
          {quote.tax && quote.tax > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Tax ({quote.taxRate ? `${(quote.taxRate * 100).toFixed(2)}%` : ""}):
              </Text>
              <Text style={styles.totalValue}>{formatCurrency(quote.tax)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, { marginTop: 10 }]}>
            <Text style={styles.grandTotal}>Total:</Text>
            <Text style={styles.grandTotal}>{formatCurrency(quote.total)}</Text>
          </View>
        </View>

        {/* Notes */}
        {(quote.notes || defaultNotes) && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notes:</Text>
            <Text style={styles.notesText}>{quote.notes || defaultNotes}</Text>
          </View>
        )}

        {/* Terms & Conditions */}
        {termsAndConditions && (
          <View style={[styles.notes, { marginTop: 20 }]}>
            <Text style={styles.notesTitle}>Terms and Conditions:</Text>
            <Text style={styles.notesText}>{termsAndConditions}</Text>
          </View>
        )}

        {/* Payment Terms */}
        {paymentTerms && (
          <View style={[styles.notes, { marginTop: 20 }]}>
            <Text style={styles.notesTitle}>Payment Terms:</Text>
            <Text style={styles.notesText}>{paymentTerms}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>{footerText || `Thank you for your interest in ${quote.productName}!`}</Text>
          <Text style={styles.quoteId}>Quote ID: {quote.id}</Text>
        </View>
      </Page>
    </Document>
  );
}

