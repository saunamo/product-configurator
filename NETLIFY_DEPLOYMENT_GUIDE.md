# Netlify Deployment Guide

## Step 1: Choose Git Provider

**Choose GitHub** (recommended) or your preferred Git provider:
- Click the **GitHub** button on Netlify
- Authorize Netlify to access your repositories
- Select your repository: `saunamo-product-configurator`

## Step 2: Netlify Auto-Detection

Netlify will automatically detect:
- ✅ Framework: Next.js
- ✅ Build command: `npm run build`
- ✅ Publish directory: `.next`

The `netlify.toml` file is already configured for Next.js.

## Step 3: Configure Environment Variables

Go to **Site settings → Environment variables** and add:

### Required Variables:

```bash
# Pipedrive Integration
PIPEDRIVE_API_TOKEN=your_pipedrive_api_token
PIPEDRIVE_COMPANY_DOMAIN=saunamo

# Zapier Webhook (for email)
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/20439045/uqqvl5a/

# App URLs
NEXT_PUBLIC_APP_URL=https://your-site-name.netlify.app
QUOTE_PORTAL_URL=https://your-site-name.netlify.app/quote

# Company Info
COMPANY_NAME=Saunamo, Arbor Eco LDA
```

### Optional Variables:

```bash
# If you have a custom domain
NEXT_PUBLIC_APP_URL=https://saunamo.co.uk
QUOTE_PORTAL_URL=https://saunamo.co.uk/quote
```

## Step 4: Deploy

1. Click **"Deploy site"**
2. Netlify will:
   - Install dependencies (`npm install`)
   - Build the project (`npm run build`)
   - Deploy to a unique URL (e.g., `https://random-name-123.netlify.app`)

## Step 5: Update Environment Variables After First Deploy

After the first deploy, you'll get your actual Netlify URL. Update:

```bash
NEXT_PUBLIC_APP_URL=https://your-actual-site.netlify.app
QUOTE_PORTAL_URL=https://your-actual-site.netlify.app/quote
```

Then **trigger a new deploy** (or it will auto-deploy on next git push).

## Step 6: Custom Domain (Optional)

1. Go to **Domain settings**
2. Add your custom domain: `saunamo.co.uk`
3. Update DNS records as instructed
4. Update environment variables with your custom domain

## Important Notes:

### ✅ What Works on Netlify:
- Next.js API routes (serverless functions)
- Quote generation and PDF creation
- Pipedrive integration
- Zapier webhooks
- Quote portal (quotes stored in Pipedrive)

### ⚠️ What Doesn't Work:
- File system storage (we use Pipedrive instead)
- Local file uploads (use external storage or Pipedrive)

### 🔄 Auto-Deploy:
- Every push to your main branch will trigger a new deploy
- You can disable this in **Build & deploy settings**

## Troubleshooting:

### Build Fails:
- Check build logs in Netlify dashboard
- Ensure all environment variables are set
- Check Node version (should be 20)

### API Routes Not Working:
- Ensure `@netlify/plugin-nextjs` is installed (it's in `netlify.toml`)
- Check function logs in Netlify dashboard

### Environment Variables Not Working:
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)

## Next Steps After Deployment:

1. Test quote generation
2. Test Zapier webhook (generate a test quote)
3. Test quote portal (`/quote/{quoteId}`)
4. Set up custom domain if needed
