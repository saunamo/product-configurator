# Architecture Plan: Shopify/Pipedrive Integration & Multi-Product Support

## Overview
This document outlines the architecture for integrating external price sources, quote generation, and multi-product support.

---

## 1. Price Sync Architecture

### Recommended Approach: Next.js API Routes with Caching

#### Structure:
```
/app/api/
  /prices/
    /sync.ts          # Manual sync endpoint (admin)
    /[productId].ts    # Get prices for a product
  /shopify/
    /products.ts       # Fetch Shopify products
    /prices.ts         # Fetch Shopify prices
  /pipedrive/
    /deals.ts          # Fetch Pipedrive deals
    /prices.ts          # Fetch Pipedrive prices
```

#### Data Flow:
1. **Admin Panel**: Map each option to external ID
   - Option ID: `"frosted-glass-wall"`
   - Shopify Product ID: `"123456789"` OR
   - Pipedrive Deal Field: `"custom_field_123"`

2. **Price Fetching**:
   - Configurator calls `/api/prices/[productId]` on load
   - API checks cache (Redis or in-memory with TTL)
   - If stale, fetches from Shopify/Pipedrive
   - Returns prices mapped to option IDs

3. **Caching Strategy**:
   - Cache prices for 5-15 minutes
   - Invalidate on admin price mapping changes
   - Fallback to stored prices if API fails

#### Implementation Steps:
1. Add `externalPriceId` field to `Option` type
2. Add `priceSource` field to `AdminConfig` (shopify | pipedrive | manual)
3. Create API routes for Shopify/Pipedrive integration
4. Update `OptionCard` to fetch prices dynamically
5. Add price sync status indicator in admin panel

---

## 2. Quote Generation & Email

### Flow:
```
User completes configurator
  ↓
Click "Generate Quote" button
  ↓
Collect all selections + calculate total
  ↓
Generate quote (PDF or HTML email)
  ↓
Send email via SendGrid/Resend
  ↓
(Optional) Create deal in Pipedrive
```

#### Structure:
```
/app/api/
  /quotes/
    /generate.ts       # Generate quote PDF/HTML
    /send.ts           # Send quote via email
  /pipedrive/
    /create-deal.ts    # Create deal from quote
```

#### Quote Data Structure:
```typescript
type Quote = {
  id: string;
  productId: string;
  productName: string;
  customerEmail: string;
  customerName?: string;
  selections: {
    stepId: string;
    stepName: string;
    options: {
      id: string;
      title: string;
      price: number;
    }[];
  }[];
  subtotal: number;
  tax?: number;
  total: number;
  createdAt: Date;
  expiresAt?: Date;
};
```

#### Email Template:
- HTML email with quote summary
- PDF attachment (optional)
- Link to view quote online
- CTA to contact sales

---

## 3. Multi-Product Support

### Recommended Approach: Product-Based Routing

#### New Routing Structure:
```
/configurator/
  /[product]/           # Product selection page (if needed)
  /[product]/[step]/    # Configurator step for specific product
  /[product]/quote      # Quote generation for product

/admin/
  /products/            # List all products
  /products/[productId] # Admin config for specific product
```

#### Data Structure Changes:

**Product Model:**
```typescript
type Product = {
  id: string;              // e.g., "skuare", "barrel", "cube"
  name: string;            // "The Skuare", "Barrel Sauna", etc.
  slug: string;            // URL-friendly: "skuare"
  adminConfig: AdminConfig; // Current config structure
  priceSource: "shopify" | "pipedrive" | "manual";
  createdAt: Date;
  updatedAt: Date;
};
```

**Storage Options:**
1. **Database (Recommended)**: PostgreSQL/MongoDB
   - Store products and configs
   - Better for production
   - Requires backend setup

2. **File System**: JSON files per product
   - `/data/products/[productId].json`
   - Simpler, no database needed
   - Good for MVP

3. **Hybrid**: Database for products, files for configs
   - Best of both worlds

#### Implementation Steps:
1. Create product model and storage
2. Update routing to include `[product]` parameter
3. Update admin panel to select/manage products
4. Update configurator to use product-specific configs
5. Add product selection page (if needed)

---

## 4. Technology Stack Recommendations

### Required Additions:
- **API Integration**: 
  - `@shopify/shopify-api` or `shopify-api-node`
  - `pipedrive` npm package
- **Email Service**:
  - `@sendgrid/mail` or `resend` (recommended)
- **PDF Generation**:
  - `puppeteer` or `@react-pdf/renderer`
- **Caching**:
  - `node-cache` (in-memory) or Redis
- **Database** (if using):
  - `prisma` + PostgreSQL (recommended)
  - OR `mongoose` + MongoDB

### Environment Variables:
```env
# Shopify
SHOPIFY_STORE_URL=
SHOPIFY_ACCESS_TOKEN=
SHOPIFY_API_VERSION=2024-01

# Pipedrive
PIPEDRIVE_API_TOKEN=
PIPEDRIVE_COMPANY_DOMAIN=

# Email
SENDGRID_API_KEY=
# OR
RESEND_API_KEY=

# Database (if using)
DATABASE_URL=
```

---

## 5. Implementation Priority

### Phase 1: Multi-Product Support (Foundation)
1. ✅ Add product model and routing
2. ✅ Update admin to manage multiple products
3. ✅ Update configurator to use product-specific configs
4. ✅ Add product selection/management UI

### Phase 2: Price Sync (Shopify/Pipedrive)
1. ✅ Add external price ID mapping in admin
2. ✅ Create API routes for price fetching
3. ✅ Implement caching strategy
4. ✅ Update configurator to use live prices
5. ✅ Add price sync status/controls in admin

### Phase 3: Quote Generation
1. ✅ Create quote data structure
2. ✅ Build quote generation API
3. ✅ Create email templates
4. ✅ Integrate email service
5. ✅ Add quote preview/download in configurator

### Phase 4: Pipedrive Integration (Optional)
1. ✅ Create deal from quote
2. ✅ Sync customer information
3. ✅ Update deal status

---

## 6. File Structure (Proposed)

```
/app/
  /api/
    /prices/
      /sync.ts
      /[productId].ts
    /quotes/
      /generate.ts
      /send.ts
    /shopify/
      /products.ts
      /prices.ts
    /pipedrive/
      /deals.ts
      /prices.ts
      /create-deal.ts
  /configurator/
    /[product]/
      /[step]/
        /page.tsx
      /quote/
        /page.tsx
  /admin/
    /products/
      /page.tsx
      /[productId]/
        /page.tsx

/lib/
  /shopify/
    /client.ts
    /products.ts
  /pipedrive/
    /client.ts
    /deals.ts
  /email/
    /templates/
      /quote.tsx
    /send.ts
  /quotes/
    /generate.ts
    /pdf.ts

/types/
  /product.ts
  /quote.ts
  /price-sync.ts
```

---

## 7. Next Steps

**Questions to Answer:**
1. Do you have Shopify/Pipedrive API credentials ready?
2. Which email service do you prefer? (SendGrid, Resend, AWS SES)
3. Do you want to use a database or file-based storage for products?
4. How many products do you expect to have? (affects storage choice)
5. Do you need real-time price updates or is 5-15 min cache acceptable?

**Ready to Start?**
I can begin implementing any of these phases. Recommended order:
1. Multi-product support (enables scaling)
2. Price sync (ensures accurate pricing)
3. Quote generation (completes the flow)

Let me know which phase you'd like to start with!



