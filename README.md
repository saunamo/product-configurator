This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Deployment

⚠️ **IMPORTANT: Automatic deployments are DISABLED to save Netlify build credits.**

### How to Disable Automatic Deployments (One-Time Setup)

1. **Go to Netlify Dashboard:**
   - Visit https://app.netlify.com
   - Select your site (saunamo-product-configurator)

2. **Disable Auto-Deploy:**
   - Navigate to: **Site settings** → **Build & deploy** → **Continuous Deployment**
   - Under "Deploy settings", find **"Automatic deploys"**
   - Change it to **"None"** (this stops all automatic builds)
   - Click **"Save"**

3. **Verify:**
   - After disabling, pushing to GitHub will NOT trigger builds
   - You'll see "Automatic deploys: None" in the settings

### Manual Deployment (When You're Ready)

When you want to deploy changes:

1. **Push to GitHub** (as normal):
   ```bash
   git push origin main
   ```

2. **Deploy Manually in Netlify:**
   - Go to Netlify Dashboard → Your Site → **Deploys** tab
   - Click **"Trigger deploy"** → **"Deploy site"**
   - Or use Netlify CLI: `netlify deploy --prod`

3. **Build will start manually** (uses credits only when you trigger it)

### Environment Variables

Environment variables are configured in Netlify Dashboard → Site settings → Environment variables.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
