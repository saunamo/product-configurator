# How to Create a Shopify Private App

## ⚠️ Important: Use Shopify Admin, NOT Partner Dashboard

- ❌ **Partner Dashboard** (`dev.shopify.com`) = For building apps others can install
- ✅ **Shopify Admin** (`admin.shopify.com`) = For managing your own store and creating private apps

## Step-by-Step Guide

### Step 1: Go to Your Shopify Admin

**Direct Link:**
```
https://admin.shopify.com/store/saunamo-usa/settings/apps
```

**Or Navigate Manually:**
1. Go to `https://admin.shopify.com/store/saunamo-usa`
2. Click **Settings** (bottom left)
3. Click **Apps and sales channels**
4. Scroll down and click **Develop apps**

### Step 2: Create a Private App

1. Click the **"Create an app"** button
2. Enter a name: `Product Configurator` or `Price Sync`
3. Click **"Create app"**

### Step 3: Configure API Scopes

1. Click **"Configure Admin API scopes"**
2. Scroll down to find and enable these scopes:
   - ✅ `read_products` - To read product information
   - ✅ `read_product_listings` - To read product listings
   - ✅ `read_inventory` (optional) - If you need stock info
3. Click **"Save"** at the bottom

### Step 4: Install the App

1. Click **"Install app"** button
2. You'll see a confirmation screen
3. **Copy the Admin API access token** - it starts with `shpat_`
   - ⚠️ **IMPORTANT**: You can only see this token once!
   - Copy it immediately and save it somewhere safe

### Step 5: Update Your Configuration

Update `.env.local` with the new token:

```env
SHOPIFY_STORE_URL=saunamo-usa.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_your_new_token_here
SHOPIFY_CLIENT_SECRET=a07bdd1740f0cd6e8417b5b54afe1fc8
SHOPIFY_API_VERSION=2024-01
```

### Step 6: Restart Your Dev Server

```bash
# Stop the server (Ctrl+C) and restart:
npm run dev
```

## Visual Guide

```
Shopify Admin (admin.shopify.com)
  └── Settings
      └── Apps and sales channels
          └── Develop apps
              └── Create an app
                  └── Configure Admin API scopes
                      └── Install app
                          └── Copy Admin API access token (shpat_...)
```

## What You'll See

After installing, you'll see:
- **App name**: Your app name
- **Admin API access token**: `shpat_xxxxxxxxxxxxxxxxxxxxx` ← **Copy this!**
- **API version**: Usually `2024-01` or similar

## Troubleshooting

**Can't find "Develop apps"?**
- Make sure you're in **Shopify Admin** (`admin.shopify.com`), not Partner Dashboard
- You need to be the store owner or have admin permissions

**Don't see "Create an app" button?**
- Some stores might have it under "Private apps" or "Custom apps"
- Look for "Develop apps" or "Manage private apps"

**Token doesn't work?**
- Make sure you copied the **entire** token (they're long!)
- Check for extra spaces in `.env.local`
- Restart your dev server after updating

## Why Private App vs Partner Dashboard?

- **Private App**: 
  - ✅ Simple setup
  - ✅ Works immediately
  - ✅ Perfect for your own store
  - ✅ No OAuth needed

- **Partner Dashboard**:
  - ❌ More complex (OAuth flow)
  - ❌ For apps that install on multiple stores
  - ❌ Requires more setup
  - ✅ Only needed if building a public app

For your use case (syncing prices from your own store), **Private App is the way to go!**



