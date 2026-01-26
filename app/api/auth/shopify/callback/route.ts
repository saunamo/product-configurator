import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * GET /api/auth/shopify/callback
 * Handles OAuth callback from Shopify
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const shop = searchParams.get("shop");

  // Verify state
  const cookieStore = await cookies();
  const storedState = cookieStore.get("shopify_oauth_state")?.value;
  
  if (!state || state !== storedState) {
    return NextResponse.json(
      { error: "Invalid state parameter" },
      { status: 400 }
    );
  }

  if (!code || !shop) {
    return NextResponse.json(
      { error: "Missing code or shop parameter" },
      { status: 400 }
    );
  }

  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Shopify credentials not configured" },
      { status: 500 }
    );
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error("No access token received");
    }

    // Clear the state cookie
    const response = NextResponse.redirect(`${APP_URL}/admin?shopify_token=${accessToken}`);
    response.cookies.delete("shopify_oauth_state");

    // Store the access token in a secure cookie (or you could save it to database)
    response.cookies.set("shopify_access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return response;
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      `${APP_URL}/admin?error=${encodeURIComponent(error.message)}`
    );
  }
}



