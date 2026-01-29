# Pipedrive Integration Guide

Complete guide to Pipedrive integration for the Saunamo Product Configurator.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Environment Setup](#environment-setup)
4. [Product Management](#product-management)
5. [Product Naming Convention](#product-naming-convention)
6. [Tax Rates by Country](#tax-rates-by-country)
7. [Price Synchronization](#price-synchronization)
8. [Deal Creation](#deal-creation)
9. [Product ID Mapping](#product-id-mapping)
10. [API Client Functions](#api-client-functions)
11. [Quote Generation Flow](#quote-generation-flow)
12. [Storage and Configuration](#storage-and-configuration)
13. [Common Workflows](#common-workflows)
14. [Troubleshooting](#troubleshooting)

---

## Overview

The Pipedrive integration enables:
- **Product Management**: Create, update, and manage products in Pipedrive
- **Price Synchronization**: Sync prices from Pipedrive products to the configurator
- **Deal Creation**: Automatically create deals when quotes are generated
- **Tax Handling**: Support for country-specific VAT rates
- **Product Linking**: Map configurator options to Pipedrive products

---

## Architecture

### Key Components

1. **`lib/pipedrive/client.ts`**: Core API client for Pipedrive requests
2. **`lib/pipedrive/quoteSync.ts`**: Quote-to-deal synchronization logic
3. **`app/api/pipedrive/products/`**: Product management API routes
4. **`app/api/quotes/generate/route.ts`**: Quote generation with Pipedrive integration

### Data Flow

```
Configurator Selections
    ↓
Quote Generation API
    ↓
Pipedrive Price Sync (optional)
    ↓
Pipedrive Deal Creation
    ↓
Products Added to Deal
    ↓
Quote Saved to Pipedrive Note
```

---

## Environment Setup

### Required Environment Variables

```bash
PIPEDRIVE_API_TOKEN=your_api_token_here
PIPEDRIVE_COMPANY_DOMAIN=saunamo  # Optional, defaults to "saunamo"
```

### Getting Your API Token

1. Log in to Pipedrive
2. Go to **Settings** → **Personal** → **API**
3. Generate a new API token
4. Copy the token to your `.env` file

### API Base URL

The API base URL is automatically constructed as:
```
https://{PIPEDRIVE_COMPANY_DOMAIN}.pipedrive.com/api/v1
```

---

## Product Management

### Creating a Product

```typescript
import { createProduct } from "@/lib/pipedrive/client";

const productData = {
  name: "Product Name | SKU-001",
  code: "UK", // Country code
  [SKU_FIELD_KEY]: "SKU-001", // SKU in custom field
  prices: [
    {
      price: 1000.00, // VAT-less price
      currency: "GBP",
    },
  ],
  tax: 20, // VAT rate as percentage (20 for 20%)
  unit: "piece",
};

const result = await createProduct(productData);
console.log("Product ID:", result.data.id);
```

### Updating a Product

```typescript
import { updateProduct } from "@/lib/pipedrive/client";

await updateProduct(productId, {
  name: "Updated Product Name | SKU-001",
  prices: [
    {
      price: 1200.00,
      currency: "GBP",
    },
  ],
  tax: 20,
});
```

### Getting Products

```typescript
import { getProducts, getAllProductsPaginated } from "@/lib/pipedrive/client";

// Get products with filters
const products = await getProducts({
  limit: 100,
  term: "search term",
});

// Get all products (handles pagination automatically)
const allProducts = await getAllProductsPaginated();
```

### Searching Products

```typescript
import { searchProducts } from "@/lib/pipedrive/client";

const results = await searchProducts("Cube 125", 50);
```

### Deleting a Product

```typescript
import { deleteProduct } from "@/lib/pipedrive/client";

await deleteProduct(productId);
```

---

## Product Naming Convention

### Format

All products in Pipedrive should follow this naming convention:

```
Product Name | SKU
```

**Example:**
- `Ergo Outdoor Sauna 2200 × 2005 mm | ERGO-220-THE`
- `Sauna hat | SAUNA-HAT-001`
- `Cube 125 | CUBE-125-UK`

### SKU Field

The SKU is stored in **both**:
1. **Product Name**: As part of the name (after the `|` separator)
2. **Custom Field**: In a custom field with key `43a32efde94b5e07af24690d5b8db5dc18f5680a`

### Implementation

```typescript
const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";

const productData = {
  name: "Product Name | SKU-001",
  [SKU_FIELD_KEY]: "SKU-001", // Also store in custom field
  // ... other fields
};
```

### Why This Convention?

- **Searchability**: Easy to search by SKU in Pipedrive
- **Clarity**: Product name and SKU visible together
- **Consistency**: Standard format across all products
- **Integration**: Works well with external systems that need SKU

---

## Tax Rates by Country

### Tax Configuration

Products are created with **VAT-less prices** in Pipedrive. The tax rate is stored separately and applied when calculating totals.

### Country Tax Rates

| Country Code | Country | VAT Rate | Currency |
|-------------|---------|----------|----------|
| `PT` | Portugal | 23% | EUR |
| `UK` | United Kingdom | 20% | GBP |
| `EN` | England | 23% | EUR |
| `FR` | France | 20% | EUR |
| `IT` | Italy | 22% | EUR |
| `ES` | Spain | 21% | EUR |
| `US` | United States | 0% | EUR |

### Price Calculation

#### VAT-Inclusive to VAT-Exclusive

```typescript
const priceWithVAT = 1200.00; // £1,200.00 including VAT
const taxRate = 20; // 20% VAT

const priceWithoutVAT = priceWithVAT / (1 + taxRate / 100);
// Result: £1,000.00 (stored in Pipedrive)
```

#### VAT-Exclusive to VAT-Inclusive

```typescript
const priceWithoutVAT = 1000.00; // £1,000.00 excluding VAT
const taxRate = 20; // 20% VAT

const priceWithVAT = priceWithoutVAT * (1 + taxRate / 100);
// Result: £1,200.00 (displayed to customer)
```

### Creating Products for Multiple Countries

```typescript
const baseProduct = {
  name: "Cube 125 | CUBE-125",
  sku: "CUBE-125",
};

// UK Product
await createProduct({
  ...baseProduct,
  code: "UK",
  prices: [{ price: 4166.67, currency: "GBP" }], // £5,000.00 / 1.2
  tax: 20,
});

// PT Product
await createProduct({
  ...baseProduct,
  code: "PT",
  prices: [{ price: 4065.04, currency: "EUR" }], // €5,000.00 / 1.23
  tax: 23,
});

// FR Product
await createProduct({
  ...baseProduct,
  code: "FR",
  prices: [{ price: 4166.67, currency: "EUR" }], // €5,000.00 / 1.20
  tax: 20,
});
```

---

## Price Synchronization

### How It Works

When a quote is generated with `priceSource: "pipedrive"`:

1. System collects Pipedrive product IDs from:
   - `globalSettings.optionPipedriveProducts` (preferred)
   - `option.pipedriveProductId` (fallback)
   - `mainProductPipedriveId` (for base product)

2. For each product ID, fetches current price from Pipedrive

3. Updates quote items with synced prices

4. Extracts VAT rate from Pipedrive product (if available)

### Implementation

```typescript
// In app/api/quotes/generate/route.ts

const pipedriveProductIds: Record<string, number> = {};

// Add main product
if (productConfig?.mainProductPipedriveId) {
  pipedriveProductIds["main-product"] = productConfig.mainProductPipedriveId;
}

// Add option products
if (globalSettings?.optionPipedriveProducts) {
  Object.entries(globalSettings.optionPipedriveProducts).forEach(([optionId, productId]) => {
    pipedriveProductIds[optionId] = productId;
  });
}

// Sync prices
if (Object.keys(pipedriveProductIds).length > 0) {
  quote = await syncPricesFromPipedrive(quote, pipedriveProductIds);
}
```

### VAT Rate Extraction

The system looks for VAT rate in multiple fields:

1. `product.tax` (percentage, e.g., 20 for 20%)
2. `product.vat` (percentage)
3. `product.vat_rate` (percentage)
4. `product.tax_rate` (percentage)
5. Custom fields containing "vat" or "tax"

```typescript
// In lib/quotes/generate.ts

let vatRate: number | undefined;

if (product.tax !== undefined && product.tax !== null) {
  vatRate = typeof product.tax === 'number' ? product.tax / 100 : parseFloat(product.tax) / 100;
} else if (product.vat !== undefined && product.vat !== null) {
  vatRate = typeof product.vat === 'number' ? product.vat / 100 : parseFloat(product.vat) / 100;
}
// ... check other fields
```

---

## Deal Creation

### Automatic Deal Creation

When a quote is generated, a Pipedrive deal is automatically created if:
- `PIPEDRIVE_API_TOKEN` is configured
- Quote generation succeeds

### Deal Data

```typescript
const dealData = {
  title: `Quote: ${quote.productName} - ${quote.customerEmail}`,
  value: quote.total,
  currency: "GBP",
  person_id: personId, // Created or found by email
};
```

### Person (Contact) Creation

The system automatically:
1. Searches for existing person by email
2. Creates new person if not found
3. Links person to the deal

```typescript
// In lib/pipedrive/quoteSync.ts

if (quote.customerEmail) {
  const searchResult = await findPersonByEmail(quote.customerEmail);
  const existingPerson = searchResult.data?.items?.[0]?.item;
  
  if (existingPerson) {
    personId = existingPerson.id;
  } else {
    const personResult = await createPerson({
      name: quote.customerName || quote.customerEmail.split("@")[0],
      email: [quote.customerEmail],
      phone: quote.customerPhone ? [quote.customerPhone] : undefined,
    });
    personId = personResult.data.id;
  }
}
```

### Adding Products to Deal

Products are added as line items to the deal:

```typescript
const productsToAdd = quote.items.map((item) => {
  const pipedriveProductId = pipedriveProductIds[item.optionId];
  
  return {
    product_id: pipedriveProductId,
    item_price: item.price, // VAT-less price
    quantity: item.quantity || 1,
    tax: item.vatRate ? item.vatRate * 100 : 20, // Convert to percentage
    comments: item.optionDescription || undefined,
  };
});

await addProductsToDeal(dealId, productsToAdd);
```

### Quote Storage in Pipedrive

The full quote JSON is saved as a **note** attached to the deal:

```typescript
// In lib/database/quotes.ts (Netlify mode)

await createNote({
  content: JSON.stringify(quote, null, 2),
  deal_id: pipedriveDealId,
  pinned_to_deal_flag: 1,
});
```

---

## Product ID Mapping

### Configuration Structure

Product IDs are mapped in the admin configuration:

```json
{
  "mainProductPipedriveId": 12345,
  "globalSettings": {
    "optionPipedriveProducts": {
      "heater-standard": 12346,
      "heater-premium": 12347,
      "lighting-under-bench": 12348,
      "aromas-accessories-sauna-hats": 18224
    }
  }
}
```

### Storage Location

- **Local Development**: `data-store/admin-config.json`
- **Netlify**: Stored in Pipedrive notes (retrieved on demand)

### Accessing Product IDs

```typescript
// In app/api/quotes/generate/route.ts

const productConfig = body.productConfig as any;

// Main product
if (productConfig?.mainProductPipedriveId) {
  pipedriveProductIds["main-product"] = productConfig.mainProductPipedriveId;
}

// Option products
const globalSettings = (adminConfig as any).globalSettings;
if (globalSettings?.optionPipedriveProducts) {
  Object.entries(globalSettings.optionPipedriveProducts).forEach(([optionId, productId]) => {
    pipedriveProductIds[optionId] = productId;
  });
}
```

---

## API Client Functions

### Core Functions (`lib/pipedrive/client.ts`)

#### Authentication

```typescript
getPipedriveApiUrl(endpoint: string): string
pipedriveRequest<T>(endpoint: string, options: RequestInit): Promise<T>
```

#### Deals

```typescript
getDeal(dealId: number): Promise<{ data: any }>
createDeal(dealData: {...}): Promise<{ data: any }>
updateDeal(dealId: number, dealData: Record<string, any>): Promise<{ data: any }>
getDeals(filters?: {...}): Promise<{ data: any[] }>
```

#### Persons (Contacts)

```typescript
createPerson(personData: {...}): Promise<{ data: any }>
findPersonByEmail(email: string): Promise<{ data: { items: any[] } }>
```

#### Products

```typescript
getProducts(filters?: {...}): Promise<{ data: any[] }>
getProduct(productId: number): Promise<{ data: any }>
getAllProductsPaginated(term?: string): Promise<any[]>
searchProducts(term: string, limit: number): Promise<{ data: any[] }>
createProduct(productData: {...}): Promise<{ data: any }>
updateProduct(productId: number, productData: {...}): Promise<{ data: any }>
deleteProduct(productId: number): Promise<{ data: { id: number } }>
addProductsToDeal(dealId: number, products: Array<{...}>): Promise<{ data: any }>
```

#### Notes

```typescript
createNote(noteData: {...}): Promise<{ data: any }>
getDealNotes(dealId: number): Promise<{ data: any[] }>
```

#### Utilities

```typescript
getCustomFields(fieldType: "deal" | "person" | "organization"): Promise<{ data: any[] }>
getStages(pipelineId?: number): Promise<{ data: any[] }>
getPipelines(): Promise<{ data: any[] }>
```

### Quote Sync Functions (`lib/pipedrive/quoteSync.ts`)

```typescript
createDealFromQuote(
  quote: Quote,
  config?: PipedriveDealConfig,
  pipedriveProductIds?: Record<string, number>
): Promise<{ dealId: number; personId?: number }>

getPriceFromPipedrive(
  customFieldKey: string,
  dealId?: number
): Promise<number | null>

syncQuoteItemsToDeal(
  dealId: number,
  quoteItems: Quote["items"]
): Promise<void>
```

---

## Quote Generation Flow

### Complete Flow

1. **User submits quote request**
   - Selections from configurator
   - Customer information (email, name, phone)

2. **Quote generation**
   - `generateQuote()` creates quote object
   - Calculates prices, totals, VAT

3. **Pipedrive price sync** (if configured)
   - Fetches current prices from Pipedrive
   - Updates quote items with synced prices
   - Extracts VAT rates from products

4. **Pipedrive deal creation**
   - Creates or finds person by email
   - Creates deal with quote total
   - Links person to deal

5. **Products added to deal**
   - Maps quote items to Pipedrive products
   - Adds products as line items with:
     - Product ID
     - Price (VAT-less)
     - Quantity
     - Tax percentage
     - Comments (description)

6. **Quote saved**
   - **Local**: Saved to `data-store/quotes/`
   - **Netlify**: Saved as Pipedrive note

7. **Webhook sent** (if configured)
   - Sends quote data to Zapier
   - Triggers email to customer

### Code Flow

```typescript
// app/api/quotes/generate/route.ts

// 1. Generate quote
let quote = generateQuote(body, adminConfig);

// 2. Sync prices from Pipedrive
if (adminConfig.priceSource === "pipedrive" && pipedriveToken) {
  quote = await syncPricesFromPipedrive(quote, pipedriveProductIds);
}

// 3. Create Pipedrive deal
if (pipedriveToken) {
  const dealResult = await createDealFromQuote(quote, undefined, pipedriveProductIds);
  pipedriveDealId = dealResult.dealId;
  
  // Update quote ID to use Pipedrive deal ID
  quote.id = pipedriveDealId.toString();
}

// 4. Save quote
await saveQuoteServer(quote, pipedriveDealId);

// 5. Send webhook
if (zapierWebhookUrl && quoteSaved) {
  await fetch(zapierWebhookUrl, { method: "POST", body: JSON.stringify(webhookPayload) });
}
```

---

## Storage and Configuration

### Local Development

- **Config**: `data-store/admin-config.json`
- **Quotes**: `data-store/quotes/{quoteId}.json`
- **Product Configs**: `data-store/product-configs/{productId}.json`

### Netlify (Production)

- **Config**: Stored in Pipedrive notes (retrieved on demand)
- **Quotes**: Stored as Pipedrive notes (attached to deals)
- **Product Configs**: Stored in Pipedrive notes

### Configuration Structure

```typescript
type AdminConfig = {
  productName: string;
  mainProductPipedriveId?: number;
  priceSource?: "pipedrive" | "manual";
  globalSettings?: {
    optionPipedriveProducts?: Record<string, number>;
  };
  // ... other fields
};
```

---

## Common Workflows

### 1. Creating a New Product in Pipedrive

```typescript
// Example: Create "Sauna hat" product for UK

const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";
const priceWithVAT = 24.99; // £24.99 including VAT
const taxRate = 20; // UK VAT rate
const priceWithoutVAT = priceWithVAT / (1 + taxRate / 100); // £20.83

const result = await createProduct({
  name: "Sauna hat | SAUNA-HAT-001",
  code: "UK",
  [SKU_FIELD_KEY]: "SAUNA-HAT-001",
  prices: [
    {
      price: priceWithoutVAT,
      currency: "GBP",
    },
  ],
  tax: taxRate,
  unit: "piece",
});

console.log("Product ID:", result.data.id); // Use this in admin-config.json
```

### 2. Linking a Configurator Option to Pipedrive Product

1. Get the Pipedrive product ID (from step 1)
2. Update `data-store/admin-config.json`:

```json
{
  "globalSettings": {
    "optionPipedriveProducts": {
      "aromas-accessories-sauna-hats": 18224
    }
  }
}
```

3. Restart the dev server or reload config

### 3. Updating Product Prices

```typescript
// Update price for existing product

const productId = 18224;
const newPriceWithVAT = 29.99; // New price with VAT
const taxRate = 20;
const newPriceWithoutVAT = newPriceWithVAT / (1 + taxRate / 100);

await updateProduct(productId, {
  prices: [
    {
      price: newPriceWithoutVAT,
      currency: "GBP",
    },
  ],
});
```

### 4. Creating Products for Multiple Countries

```typescript
const baseProduct = {
  name: "Cube 125 | CUBE-125",
  sku: "CUBE-125",
};

const countries = [
  { code: "UK", tax: 20, currency: "GBP", priceWithVAT: 5000 },
  { code: "PT", tax: 23, currency: "EUR", priceWithVAT: 5000 },
  { code: "FR", tax: 20, currency: "EUR", priceWithVAT: 5000 },
  { code: "IT", tax: 22, currency: "EUR", priceWithVAT: 5000 },
  { code: "ES", tax: 21, currency: "EUR", priceWithVAT: 5000 },
];

for (const country of countries) {
  const priceWithoutVAT = country.priceWithVAT / (1 + country.tax / 100);
  
  await createProduct({
    ...baseProduct,
    code: country.code,
    prices: [{ price: priceWithoutVAT, currency: country.currency }],
    tax: country.tax,
  });
  
  // Small delay to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 200));
}
```

### 5. Finding a Product by SKU

```typescript
import { getAllProductsPaginated } from "@/lib/pipedrive/client";

const SKU_FIELD_KEY = "43a32efde94b5e07af24690d5b8db5dc18f5680a";
const allProducts = await getAllProductsPaginated();

const product = allProducts.find((p: any) => {
  const sku = p[SKU_FIELD_KEY] || p.sku || "";
  return sku.toUpperCase() === "SAUNA-HAT-001";
});

if (product) {
  console.log("Product ID:", product.id);
  console.log("Product Name:", product.name);
  console.log("Price:", product.prices?.[0]?.price);
}
```

---

## Troubleshooting

### Issue: Products Not Syncing to Deals

**Symptoms**: Deal is created but products are not added.

**Solutions**:
1. Check `pipedriveProductIds` object contains all required IDs
2. Verify product IDs exist in Pipedrive
3. Check console logs for "Skipping item" messages
4. Ensure `mainProductPipedriveId` is included in the mapping

### Issue: Prices Not Updating from Pipedrive

**Symptoms**: Quote shows old prices even after updating Pipedrive.

**Solutions**:
1. Verify `priceSource: "pipedrive"` in config
2. Check `PIPEDRIVE_API_TOKEN` is set
3. Verify product IDs are correctly mapped
4. Check Pipedrive product has valid price in correct currency

### Issue: VAT Not Calculating Correctly

**Symptoms**: VAT amount is wrong or missing.

**Solutions**:
1. Check VAT rate is set on Pipedrive product (`tax` field)
2. Verify VAT rate format (percentage, not decimal: 20 for 20%)
3. Check quote items have `vatRate` property after sync
4. Verify tax calculation in `lib/quotes/generate.ts`

### Issue: Deal Creation Fails

**Symptoms**: Error when creating deal in Pipedrive.

**Solutions**:
1. Verify `PIPEDRIVE_API_TOKEN` is valid
2. Check API token has correct permissions
3. Verify `PIPEDRIVE_COMPANY_DOMAIN` is correct
4. Check Pipedrive API status

### Issue: Person Not Found/Created

**Symptoms**: Deal created but not linked to person.

**Solutions**:
1. Verify customer email is provided
2. Check email format is valid
3. Verify person creation API call succeeds
4. Check person search is working correctly

### Issue: Quote Not Saved on Netlify

**Symptoms**: Quote generated but not retrievable.

**Solutions**:
1. **Critical**: Ensure `PIPEDRIVE_API_TOKEN` is set in Netlify
2. Verify deal is created (check `pipedriveDealId` in response)
3. Check note creation succeeds (quote is saved as note)
4. Wait 2-3 seconds after quote generation before accessing URL (Pipedrive indexing delay)

### Issue: Product Name Format Incorrect

**Symptoms**: Products don't follow "Name | SKU" format.

**Solutions**:
1. Use `updateProduct()` to fix names
2. Ensure SKU is in both name and custom field
3. Verify `SKU_FIELD_KEY` is correct: `43a32efde94b5e07af24690d5b8db5dc18f5680a`

### Debugging Tips

1. **Enable Console Logs**: Check server logs for detailed Pipedrive API calls
2. **Test API Directly**: Use Postman/curl to test Pipedrive API endpoints
3. **Check Product IDs**: Verify product IDs exist in Pipedrive
4. **Verify Token**: Test API token with a simple `getProducts()` call
5. **Check Rate Limits**: Pipedrive has rate limits; add delays between requests

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `PIPEDRIVE_API_TOKEN is not configured` | Missing env variable | Set `PIPEDRIVE_API_TOKEN` |
| `Pipedrive API error (401)` | Invalid token | Regenerate API token |
| `Pipedrive API error (404)` | Product/Deal not found | Verify ID exists |
| `Pipedrive API error (429)` | Rate limit exceeded | Add delays between requests |
| `No products to add to deal` | Missing product IDs | Check `pipedriveProductIds` mapping |

---

## Summary

This guide covers all aspects of Pipedrive integration:

- ✅ Product creation and management
- ✅ Product naming convention ("Name | SKU")
- ✅ Tax rates for different countries
- ✅ Price synchronization
- ✅ Deal creation and product linking
- ✅ Quote storage in Pipedrive
- ✅ Common workflows and troubleshooting

For additional help, check the code in:
- `lib/pipedrive/client.ts` - API client
- `lib/pipedrive/quoteSync.ts` - Quote synchronization
- `app/api/quotes/generate/route.ts` - Quote generation flow
- `app/api/pipedrive/products/` - Product management examples
