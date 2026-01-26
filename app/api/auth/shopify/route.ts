import { NextRequest, NextResponse } from "next/server";

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * GET /api/auth/shopify
 * Initiates OAuth flow - redirects to Shopify authorization
 */
export async function GET(request: NextRequest) {
  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_STORE_URL) {
    return NextResponse.json(
      { error: "Shopify credentials not configured" },
      { status: 500 }
    );
  }

  const shop = SHOPIFY_STORE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const redirectUri = `${APP_URL}/api/auth/shopify/callback`;
  const scopes = "read_products,read_product_listings";
  const state = Math.random().toString(36).substring(7); // Simple state for CSRF protection

  const authUrl = `https://${shop}/admin/oauth/authorize?` +
    `client_id=${SHOPIFY_CLIENT_ID}&` +
    `scope=${scopes}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${state}`;

  // Store state in a cookie for verification
  const response = NextResponse.redirect(authUrl);
  response.cookies.set("shopify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
  });

  return response;
}



