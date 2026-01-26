# Partner Dashboard Setup Guide

Since you're using the Partner Dashboard (`dev.shopify.com`), follow these steps:

## Step 1: Configure Scopes in Partner Dashboard

1. **Go to your app in Partner Dashboard**:
   - Navigate to: `dev.shopify.com/dashboard/.../apps/pconfig`
   - Click **"Versions"** tab
   - Click **"App setup"** (or create a new version)

2. **Configure Scopes**:
   - In the **"Scopes"** section, click **"Select scopes"**
   - OR manually enter in the text area:
     ```
     read_products,read_product_listings
     ```
   - Click **"Save"**

## Step 2: Set App URL and Redirect URLs

1. **App URL** (in Versions → Create a version):
   - For local development: You'll need **ngrok** or similar
   - Install ngrok: `brew install ngrok`
   - Start your dev server: `npm run dev`
   - In another terminal: `ngrok http 3000`
   - Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
   - Paste it in **"App URL"** field
   - ✅ Check **"Embed app in Shopify admin"**

2. **Redirect URLs** (in App setup):
   - Add your OAuth callback URL:
     ```
     https://your-ngrok-url.ngrok.io/api/auth/shopify/callback
     ```
   - Click **"Save"**

## Step 3: Install the App

1. **In your admin panel** (`/admin`):
   - Make sure **"Shopify"** is selected as price source
   - Click **"Install Shopify App"** button in the header
   - This will redirect you to Shopify to authorize

2. **Authorize the app**:
   - You'll be redirected to Shopify
   - Review the permissions
   - Click **"Install app"**

3. **Get redirected back**:
   - You'll be redirected back to your admin panel
   - The access token will be stored automatically
   - Price sync will now work!

## Step 4: Test the Connection

1. **Test in admin panel**:
   - Go to **"Steps & Options"** tab
   - Add a Shopify Product ID to an option
   - Click **"Sync"** button
   - The price should update from Shopify

2. **Test API directly**:
   ```bash
   curl http://localhost:3000/api/shopify/products?limit=5
   ```

## Environment Variables

Your `.env.local` should have:
```env
SHOPIFY_STORE_URL=saunamo-usa.myshopify.com
SHOPIFY_CLIENT_ID=a07bdd1740f0cd6e8417b5b54afe1fc8
SHOPIFY_CLIENT_SECRET=shpss_YOUR_CLIENT_SECRET_HERE
SHOPIFY_API_VERSION=2024-01
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Using ngrok for Local Development

1. **Install ngrok**:
   ```bash
   brew install ngrok
   ```

2. **Start your app**:
   ```bash
   npm run dev
   ```

3. **Start ngrok** (in another terminal):
   ```bash
   ngrok http 3000
   ```

4. **Copy the HTTPS URL**:
   - You'll see something like: `https://abc123.ngrok.io`
   - Use this in Partner Dashboard → App URL
   - Use `https://abc123.ngrok.io/api/auth/shopify/callback` for Redirect URL

5. **Update Partner Dashboard**:
   - App URL: `https://abc123.ngrok.io`
   - Redirect URL: `https://abc123.ngrok.io/api/auth/shopify/callback`

## Troubleshooting

**"Invalid redirect_uri" error:**
- Make sure the redirect URL in Partner Dashboard matches exactly
- Include the full path: `/api/auth/shopify/callback`
- Use HTTPS (ngrok provides this)

**"App not installed" error:**
- Click "Install Shopify App" button in admin panel
- Make sure you authorized the app in Shopify

**Token not working:**
- The token is stored in a cookie after OAuth
- Clear cookies and reinstall if needed
- Check browser console for errors

**ngrok URL changes:**
- Free ngrok URLs change each time you restart
- Update Partner Dashboard URLs each time
- Or get a free ngrok account for a static domain

## Next Steps

Once installed:
1. ✅ Map your options to Shopify Product IDs
2. ✅ Click "Sync" to fetch prices
3. ✅ Prices will auto-update from Shopify

The OAuth flow is now set up! Just install the app and you're ready to go.



