# Production Setup Guide

## Current Status

The app currently uses **localStorage** (client-side browser storage) for all product data. This works for development but **won't work in production** because:
- Data is stored per browser/device
- Data is lost when browser cache is cleared
- Data doesn't sync across devices
- Not suitable for multi-user scenarios

## Solution: Server-Side Storage

I've created a server-side storage system that stores products in JSON files on the server. This can be easily upgraded to a database later.

### What's Been Added

1. **Server-Side Storage** (`/lib/database/products.ts`)
   - Stores products in `/data-store/products.json`
   - Stores product configs in `/data-store/product-configs/[productId].json`
   - Can be upgraded to PostgreSQL/MongoDB later

2. **API Routes** (`/app/api/products/`)
   - `GET /api/products` - Get all products
   - `POST /api/products` - Create/update products
   - `GET /api/products/[productId]` - Get single product
   - `PUT /api/products/[productId]` - Update product
   - `DELETE /api/products/[productId]` - Delete product
   - `GET /api/products/[productId]/config` - Get product config
   - `PUT /api/products/[productId]/config` - Save product config

3. **Client API** (`/utils/productStorageApi.ts`)
   - Client-side functions that call the API instead of localStorage

## Migration Options

### Option 1: Use API in Production Only (Recommended)

Keep localStorage for development, use API in production:

1. Add environment variable to switch:
   ```env
   NEXT_PUBLIC_USE_API_STORAGE=true
   ```

2. Update `utils/productStorage.ts` to check the env var and use API when enabled

### Option 2: Switch Everything to API Now

Replace all `productStorage.ts` imports with `productStorageApi.ts` throughout the app.

### Option 3: Upgrade to Database

Replace `lib/database/products.ts` with database calls:
- **PostgreSQL + Prisma** (recommended)
- **MongoDB + Mongoose**
- **Supabase** (PostgreSQL with auth built-in)

## Quick Start (Using API Storage)

1. **The API routes are already set up** - they'll work automatically when deployed

2. **For local development with API:**
   - The server will create `/data-store/` folder automatically
   - Products will be stored in JSON files on the server
   - Data persists across browser sessions

3. **To switch to API storage:**
   - Update imports in `app/admin/products/page.tsx` and other files
   - Change `from "@/utils/productStorage"` to `from "@/utils/productStorageApi"`
   - Make functions `async` and add `await` where needed

## Deployment

When you deploy to Vercel/Netlify/etc:
- The `/data-store/` folder will be created automatically
- Products will persist on the server
- All users will see the same products

## Next Steps

1. **For now (development):** Keep using localStorage - it's fine for local work
2. **Before production:** Switch to API storage (Option 1 or 2 above)
3. **For scale:** Upgrade to a database (Option 3)

Would you like me to:
- A) Switch everything to API storage now?
- B) Create a hybrid system (localStorage in dev, API in prod)?
- C) Set up a database (PostgreSQL/MongoDB)?


