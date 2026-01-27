# How to Disable Automatic Netlify Deployments

## Quick Steps

1. **Go to Netlify Dashboard:**
   - Visit: https://app.netlify.com
   - Login and select your site

2. **Navigate to Build Settings:**
   - Click on your site name
   - Go to: **Site settings** (gear icon in top right)
   - Click: **Build & deploy** in the left sidebar
   - Click: **Continuous Deployment**

3. **Disable Automatic Deploys:**
   - Scroll to **"Deploy settings"** section
   - Find **"Automatic deploys"** dropdown
   - Change from **"All branches"** or **"Production branch only"** to **"None"**
   - Click **"Save"** button

4. **Verify:**
   - You should see: **"Automatic deploys: None"**
   - Future pushes to GitHub will NOT trigger builds automatically

## Manual Deployment

After disabling auto-deploy, you can still deploy manually:

### Option 1: Netlify Dashboard
- Go to **Deploys** tab
- Click **"Trigger deploy"** → **"Deploy site"**

### Option 2: Netlify CLI
```bash
netlify deploy --prod
```

## Benefits

- ✅ Saves build credits (only builds when you want)
- ✅ Full control over when deployments happen
- ✅ Can test locally before deploying
- ✅ Prevents accidental deployments

## Re-enabling Auto-Deploy (If Needed)

If you want to re-enable automatic deployments later:
- Go back to the same settings
- Change **"Automatic deploys"** back to **"Production branch only"** or **"All branches"**
