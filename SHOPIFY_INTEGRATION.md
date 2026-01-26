# Shopify Integration Setup

## ✅ What's Been Set Up

1. **Shopify API Client** (`lib/shopify/client.ts`)
   - Handles authentication and API requests
   - Functions to fetch products, prices, and search

2. **API Routes**:
   - `/api/shopify/products` - Fetch products from Shopify
   - `/api/prices/[productId]` - Get price for a specific product
   - `/api/prices/sync` - Sync multiple prices at once

3. **Admin Panel Updates**:
   - Price source selector (Manual/Shopify/Pipedrive)
   - Shopify Product ID field for each option
   - "Sync" button to fetch latest price from Shopify

4. **Type Updates**:
   - Added `shopifyProductId` to `Option` type
   - Added `priceSource` and `shopifyStoreUrl` to `AdminConfig`

## 🔧 Configuration Required

### Step 1: Update `.env.local`

You need to add your Shopify store URL. Open `.env.local` and update:

```env
SHOPIFY_STORE_URL=your-store.myshopify.com
```

Replace `your-store` with your actual Shopify store name.

**Example:**
```env
SHOPIFY_STORE_URL=saunamo.myshopify.com
```

### Step 2: Configure in Admin Panel

1. Go to `/admin`
2. Click the **"General"** tab
3. Under **"Price Source Configuration"**:
   - Select **"Shopify"** as the price source
   - Enter your Shopify store URL (e.g., `saunamo.myshopify.com`)

### Step 3: Map Options to Shopify Products

1. Go to **"Steps & Options"** tab
2. For each option that should sync with Shopify:
   - Find the option
   - Enter the **Shopify Product ID** in the "Shopify Product ID" field
   - Click **"Sync"** to fetch the latest price
   - The price will update automatically

## 🔍 Finding Shopify Product IDs

### Method 1: From Shopify Admin
1. Go to your Shopify admin
2. Navigate to Products
3. Click on a product
4. The URL will be: `https://admin.shopify.com/store/your-store/products/123456789`
5. The number at the end (`123456789`) is the Product ID

### Method 2: Using the API
1. Go to `/admin` → General tab
2. Use the API test endpoint (coming soon) to search for products

### Method 3: From Product JSON
- In Shopify admin, products have an ID field in their JSON data

## 🧪 Testing the Integration

### Test 1: Fetch a Product
```bash
curl http://localhost:3000/api/shopify/products?id=YOUR_PRODUCT_ID
```

### Test 2: Get Price
```bash
curl http://localhost:3000/api/prices/YOUR_PRODUCT_ID
```

### Test 3: Sync Prices
```bash
curl -X POST http://localhost:3000/api/prices/sync \
  -H "Content-Type: application/json" \
  -d '{"productIds": ["123456789", "987654321"]}'
```

## 📝 How It Works

1. **Admin Configuration**:
   - You set the price source to "Shopify"
   - You map each option to a Shopify Product ID

2. **Price Syncing**:
   - Click "Sync" button in admin panel → Fetches latest price from Shopify
   - Prices are stored in the config (with auto-save)
   - Configurator displays the synced prices

3. **Future Enhancement**:
   - Automatic price sync on configurator load
   - Scheduled background sync
   - Price change notifications

## ⚠️ Important Notes

- **Access Token**: The token you provided is stored in `.env.local` (never commit this!)
- **Store URL**: Must be just the domain (e.g., `store.myshopify.com`), no `https://`
- **Product IDs**: These are numeric strings, not handles/slugs
- **Price Format**: Shopify prices are in the store's currency (default: USD)

## 🚀 Next Steps

1. ✅ Add your store URL to `.env.local`
2. ✅ Configure price source in admin panel
3. ✅ Map your options to Shopify products
4. ⏳ (Future) Add automatic price sync on configurator load
5. ⏳ (Future) Add price caching to reduce API calls

## 🐛 Troubleshooting

**Error: "SHOPIFY_STORE_URL is not configured"**
- Check `.env.local` has `SHOPIFY_STORE_URL` set
- Restart your dev server after changing `.env.local`

**Error: "SHOPIFY_ACCESS_TOKEN is not configured"**
- Check `.env.local` has `SHOPIFY_ACCESS_TOKEN` set
- Verify the token is correct (starts with `shpss_` or `shpat_`)

**Error: "Shopify API error (401)"**
- Your access token might be invalid or expired
- Check the token in Shopify Dev Dashboard

**Error: "Product not found"**
- Verify the Product ID is correct
- Check the product exists in your Shopify store
- Ensure the product has variants with prices



