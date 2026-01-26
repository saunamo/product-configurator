# Shopify Local Development Setup

## The Problem
Shopify doesn't accept `localhost` URLs directly. You need a public URL that tunnels to your local server.

## Solution: Use ngrok

### Step 1: Install ngrok

**macOS (using Homebrew):**
```bash
brew install ngrok
```

**Or download from:** https://ngrok.com/download

### Step 2: Start Your Next.js Dev Server
```bash
npm run dev
```

### Step 3: Start ngrok Tunnel
In a **new terminal window**, run:
```bash
ngrok http 3000
```

This will give you a URL like:
```
https://abc123.ngrok.io
```

### Step 4: Use ngrok URL in Shopify
1. Copy the `https://` URL from ngrok (e.g., `https://abc123.ngrok.io`)
2. Paste it in Shopify Dev Dashboard → URLs → App URL
3. **Important**: Remove any trailing spaces!

### Step 5: Update ngrok URL When It Changes
- Free ngrok URLs change each time you restart ngrok
- You'll need to update the Shopify App URL each time
- **Pro tip**: Get a free ngrok account to get a static domain

---

## Alternative: Use a Placeholder URL (For Now)

If you want to set up the integration code first without ngrok:

1. Use a placeholder URL in Shopify: `https://example.com` (or your future production URL)
2. We'll configure the actual endpoints later
3. For testing, you can use ngrok or deploy to a staging environment

---

## Quick Start Commands

```bash
# Terminal 1: Start Next.js
npm run dev

# Terminal 2: Start ngrok (after installing)
ngrok http 3000
```

Then use the ngrok HTTPS URL in Shopify!



