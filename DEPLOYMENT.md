# Deployment Guide

## Manual Deployment on Netlify

This project uses **manual deployment** to save build minutes and have better control over when changes go live.

## How to Disable Auto-Deploy

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site: `product-configurator` or `saunamo-product-configurator`
3. Go to **Site settings** → **Build & deploy** → **Continuous Deployment**
4. Under **"Deploy settings"**, you'll see:
   - **Automatic deploys**: Change this to **"None"** to disable all auto-deploys
   - Or keep **"Deploy only the production branch"** and uncheck the `main` branch

## How to Deploy Manually

### Option 1: Via Netlify Dashboard (Recommended)

1. Push your changes to GitHub:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push
   ```

2. Go to Netlify Dashboard → Your Site → **Deploys** tab

3. Click **"Trigger deploy"** → **"Deploy site"**

4. Select the branch (usually `main`) and click **"Deploy"**

### Option 2: Via Netlify CLI

1. Install Netlify CLI (if not already installed):
   ```bash
   npm install -g netlify-cli
   ```

2. Login to Netlify:
   ```bash
   netlify login
   ```

3. Link your site (first time only):
   ```bash
   netlify link
   ```

4. Deploy when ready:
   ```bash
   netlify deploy --prod
   ```

## Benefits of Manual Deployment

✅ **Save Build Minutes**: Only deploy when you're ready, not on every commit  
✅ **Better Control**: Test changes locally before deploying  
✅ **Avoid Broken Deploys**: Deploy only when everything is working  
✅ **Cost Effective**: Use your build minutes more efficiently  

## When to Deploy

Deploy when:
- ✅ Features are complete and tested
- ✅ Bug fixes are verified
- ✅ Ready for production use
- ✅ Multiple changes are bundled together

Don't deploy for:
- ❌ Work-in-progress commits
- ❌ Experimental changes
- ❌ Every small fix (batch them together)

## Monitoring Deployments

- Check deployment status in Netlify Dashboard → **Deploys**
- View build logs to see what's happening
- Rollback to previous deploy if needed (click on a previous deploy → **"Publish deploy"**)
