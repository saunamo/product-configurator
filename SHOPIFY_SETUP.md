# Shopify API Setup Guide

## Step 1: Get Your API Credentials

1. **In Shopify Dev Dashboard** (where you are now):
   - Click **"Settings"** in the left sidebar
   - You'll find:
     - **Client ID** (also called API Key)
     - **Client Secret** (API Secret Key)
   - Copy these values

2. **Set Your App URL**:
   - In the "URLs" section (where you see `https://example.com`):
     - For local development: `http://localhost:3000`
     - For production: Your deployed URL (e.g., `https://yourdomain.com`)

3. **Configure API Scopes**:
   - In Settings, find "API scopes" or "Scopes"
   - Enable these scopes for price/product access:
     - `read_products`
     - `read_product_listings`
     - `read_inventory` (optional, if you need stock info)

4. **Install App to a Test Store**:
   - You need to install the app to a Shopify store (dev store or real store)
   - This generates an **Access Token** for that store
   - The access token is what you'll use to make API calls

## Step 2: Store Credentials

Create a `.env.local` file in the project root with:

```env
# Shopify Configuration
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your-access-token-here
SHOPIFY_API_VERSION=2024-01

# Optional: If using OAuth flow
SHOPIFY_CLIENT_ID=your-client-id
SHOPIFY_CLIENT_SECRET=your-client-secret
```

**Important**: 
- Never commit `.env.local` to git (it's already in `.gitignore`)
- The `SHOPIFY_STORE_URL` should be just the domain (e.g., `mystore.myshopify.com`)
- The `SHOPIFY_ACCESS_TOKEN` is store-specific and generated when you install the app

## Step 3: Two Approaches for API Access

### Option A: Store-Specific Access Token (Simpler)
- Install your app to a Shopify store
- Get the access token from the installation
- Use this token for all API calls
- **Best for**: Single store, direct integration

### Option B: OAuth Flow (More Flexible)
- Use Client ID + Client Secret
- Implement OAuth to get tokens per store
- **Best for**: Multi-store apps, public apps

## Step 4: Test Your Connection

Once you have credentials, we can:
1. Create API routes to fetch products/prices
2. Test the connection
3. Map configurator options to Shopify products

## What You Need Right Now

From the Shopify Dev Dashboard, get:
- ✅ **Client ID** (from Settings)
- ✅ **Client Secret** (from Settings)
- ⏳ **Access Token** (after installing app to a store)
- ✅ **Store URL** (your test store domain)

---

**Next Steps**: Once you have these, I'll help you:
1. Set up the Shopify API client
2. Create endpoints to fetch products/prices
3. Map configurator options to Shopify products
4. Implement price syncing



