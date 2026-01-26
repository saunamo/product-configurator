# Shopify Access Token Setup Guide

## The Problem
You're getting a 401 error because the access token format `shpss_` is a **session token**, not an **API access token**. 

Shopify API access tokens typically start with:
- `shpat_` - Private app access token
- Long alphanumeric strings - OAuth app access token

## Solution: Get a Proper Access Token

### Option 1: Create a Private App (Easiest)

1. **Go to your Shopify Admin**:
   - Navigate to: `https://admin.shopify.com/store/saunamo-usa/settings/apps`

2. **Click "Develop apps"** (or "Manage private apps" in older stores)

3. **Click "Create an app"**:
   - Name it: "Product Configurator" or "Price Sync"
   - Click "Create app"

4. **Configure API Scopes**:
   - Click "Configure Admin API scopes"
   - Enable these scopes:
     - ✅ `read_products`
     - ✅ `read_product_listings`
     - ✅ `read_inventory` (optional)
   - Click "Save"

5. **Install the App**:
   - Click "Install app"
   - This will generate an **Admin API access token**

6. **Copy the Access Token**:
   - You'll see a token that starts with `shpat_`
   - **Copy this token immediately** (you can only see it once!)

7. **Update `.env.local`**:
   ```env
   SHOPIFY_ACCESS_TOKEN=shpat_your_actual_token_here
   ```

### Option 2: Use OAuth (For Public Apps)

If you're building a public app that will be installed on multiple stores, you'll need to use OAuth. This is more complex and requires:
- OAuth flow implementation
- Client ID and Client Secret
- Redirect URLs

For now, **Option 1 (Private App) is recommended** for your use case.

## Verify Your Token

After updating `.env.local`, restart your dev server and test:

```bash
# Test the connection
curl http://localhost:3000/api/shopify/products?limit=1
```

You should get a successful response with products.

## Important Notes

- **Private App tokens** (`shpat_`) are store-specific and don't expire
- **Session tokens** (`shpss_`) are temporary and expire
- **OAuth tokens** are for multi-store apps
- Never commit your access token to git (`.env.local` is already in `.gitignore`)

## Troubleshooting

**Still getting 401?**
- Make sure you copied the entire token (they're long!)
- Check there are no extra spaces in `.env.local`
- Restart your dev server after updating `.env.local`
- Verify the token starts with `shpat_`

**403 Forbidden?**
- Check that you enabled the required API scopes
- Make sure you installed the app after configuring scopes

**Token not working?**
- Create a new private app and generate a fresh token
- Make sure you're using the Admin API access token, not the Storefront API token



