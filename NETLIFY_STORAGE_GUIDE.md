# Netlify Storage Guide for Quotes

Since Netlify Functions have an **ephemeral file system** (files don't persist), you need to use external storage for quotes. Here are the best options:

## Option 1: Store Quotes in Pipedrive (Recommended - Already Integrated)

**Pros:**
- You're already using Pipedrive
- Quotes are automatically linked to deals
- No additional service needed
- Free with your existing Pipedrive account

**How it works:**
- Store full quote JSON as a note or custom field in the Pipedrive deal
- Retrieve quotes via Pipedrive API when accessing the quote portal
- Quote ID maps to Pipedrive Deal ID

**Implementation:**
- Quotes are saved to Pipedrive deal notes/custom fields
- Quote portal retrieves from Pipedrive using deal ID

## Option 2: Supabase (PostgreSQL Database)

**Pros:**
- Free tier available (500MB database, 2GB bandwidth)
- Easy to set up
- Works great with Netlify
- Fast queries

**Setup:**
1. Sign up at https://supabase.com
2. Create a new project
3. Create a `quotes` table
4. Get your API keys
5. Update quote storage to use Supabase

## Option 3: MongoDB Atlas

**Pros:**
- Free tier (512MB storage)
- NoSQL - flexible schema
- Easy integration

**Setup:**
1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string
4. Update quote storage to use MongoDB

## Option 4: Store via Zapier

**Pros:**
- Already using Zapier for emails
- Can store quotes in Google Sheets, Airtable, or database
- No code changes needed

**How it works:**
- Zapier receives webhook with quote data
- Zapier action stores quote in your chosen storage
- Quote portal retrieves from that storage

## Recommendation

**Use Pipedrive** since you're already:
- Creating deals from quotes
- Using Pipedrive for product management
- Integrated with Pipedrive API

This requires minimal changes and keeps everything in one place.
