# Using Partner Dashboard for Shopify Integration

## Current Setup
You're working in the **Partner Dashboard** (`dev.shopify.com`) with:
- App name: `pconfig`
- Client ID: `a07bdd1740f0cd6e8417b5b54afe1fc8`
- Client Secret: `shpss_YOUR_CLIENT_SECRET_HERE`

## Steps to Complete Setup

### Step 1: Configure Scopes

In the Partner Dashboard → Versions → App setup:

1. **Scopes Section**:
   - Click "Select scopes" button
   - OR manually enter in the text area:
     ```
     read_products,read_product_listings
     ```
   - These scopes allow reading products and prices

2. **Optional Scopes** (if needed):
   - Leave empty for now, or add:
     ```
     read_inventory
     ```

### Step 2: Set App URL

In Versions → Create a version:

1. **App URL**: 
   - For local development with ngrok: `https://your-ngrok-url.ngrok.io`
   - For production: Your deployed URL
   - ⚠️ Cannot use `localhost` directly

2. **Redirect URLs** (in App setup):
   - Add your OAuth callback URL:
     ```
     https://your-ngrok-url.ngrok.io/api/auth/callback
     ```

### Step 3: Install App to Your Store

To get an access token, you need to:

1. **Get Installation URL**:
   - In Partner Dashboard → Versions
   - You'll see an installation URL like:
     ```
     https://admin.shopify.com/store/saunamo-usa/oauth/authorize?client_id=...
     ```

2. **Install to Your Store**:
   - Visit the installation URL
   - Authorize the app
   - You'll be redirected back with a `code`

3. **Exchange Code for Token**:
   - Use the `code` to get an access token via OAuth
   - This requires implementing OAuth flow in your app

## Alternative: Simpler Approach

If you just need to sync prices from your own store, **Private App is much simpler**:

1. Go to: `https://admin.shopify.com/store/saunamo-usa/settings/apps`
2. Click "Develop apps" → "Create an app"
3. Configure scopes → Install → Get token immediately

No OAuth flow needed!

## Which Should You Use?

**Use Partner Dashboard if:**
- ✅ You want to build a public app
- ✅ You'll install on multiple stores
- ✅ You want to distribute the app

**Use Private App if:**
- ✅ You only need it for your own store
- ✅ You want it working immediately
- ✅ You want simpler setup (no OAuth)

## Recommendation

For your price sync use case, **Private App is recommended** because:
- Simpler setup (5 minutes vs 30+ minutes)
- No OAuth implementation needed
- Works immediately
- Perfect for internal tools

But if you want to continue with Partner Dashboard, I can help you implement the OAuth flow!



