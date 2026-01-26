/**
 * Shopify OAuth Utilities
 * For Partner Dashboard apps using OAuth flow
 */

export function getShopifyAuthUrl(shop: string, clientId: string, redirectUri: string, scopes: string = "read_products,read_product_listings"): string {
  const state = Math.random().toString(36).substring(7);
  
  const params = new URLSearchParams({
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    state,
  });

  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(
  shop: string,
  code: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}



