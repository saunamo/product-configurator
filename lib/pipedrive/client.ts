/**
 * Pipedrive API Client
 * Handles authentication and API requests to Pipedrive
 */

const PIPEDRIVE_API_TOKEN = process.env.PIPEDRIVE_API_TOKEN;
const PIPEDRIVE_COMPANY_DOMAIN = process.env.PIPEDRIVE_COMPANY_DOMAIN || "saunamo";

if (!PIPEDRIVE_API_TOKEN) {
  console.warn("Pipedrive API token not configured. Pipedrive integration will be disabled.");
}

/**
 * Get the base URL for Pipedrive API requests
 */
export function getPipedriveApiUrl(endpoint: string = ""): string {
  return `https://${PIPEDRIVE_COMPANY_DOMAIN}.pipedrive.com/api/v1${endpoint}`;
}

/**
 * Make an authenticated request to Pipedrive API
 */
export async function pipedriveRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!PIPEDRIVE_API_TOKEN) {
    throw new Error("PIPEDRIVE_API_TOKEN is not configured");
  }

  const url = getPipedriveApiUrl(endpoint);
  
  // Add API token to query params (Pipedrive uses query params, not headers)
  const separator = endpoint.includes("?") ? "&" : "?";
  const urlWithToken = `${url}${separator}api_token=${PIPEDRIVE_API_TOKEN}`;
  
  const response = await fetch(urlWithToken, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Pipedrive API error (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();
  
  // Pipedrive wraps responses in a 'data' field
  if (data.success === false) {
    throw new Error(data.error || "Pipedrive API error");
  }

  return data;
}

/**
 * Get a deal by ID
 */
export async function getDeal(dealId: number) {
  return pipedriveRequest<{ data: any }>(`/deals/${dealId}`);
}

/**
 * Create a new deal
 */
export async function createDeal(dealData: {
  title: string;
  value?: number;
  currency?: string;
  person_id?: number;
  org_id?: number;
  stage_id?: number;
  [key: string]: any; // For custom fields
}) {
  return pipedriveRequest<{ data: any }>("/deals", {
    method: "POST",
    body: JSON.stringify(dealData),
  });
}

/**
 * Update a deal
 */
export async function updateDeal(dealId: number, dealData: Record<string, any>) {
  return pipedriveRequest<{ data: any }>(`/deals/${dealId}`, {
    method: "PUT",
    body: JSON.stringify(dealData),
  });
}

/**
 * Get all deals
 */
export async function getDeals(filters?: {
  stage_id?: number;
  status?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.stage_id) params.append("stage_id", filters.stage_id.toString());
  if (filters?.status) params.append("status", filters.status);
  if (filters?.limit) params.append("limit", filters.limit.toString());
  
  const query = params.toString();
  return pipedriveRequest<{ data: any[] }>(`/deals${query ? `?${query}` : ""}`);
}

/**
 * Get custom fields
 */
export async function getCustomFields(fieldType: "deal" | "person" | "organization" = "deal") {
  return pipedriveRequest<{ data: any[] }>(`/dealFields`);
}

/**
 * Get pipeline stages
 */
export async function getStages(pipelineId?: number) {
  const params = pipelineId ? `?pipeline_id=${pipelineId}` : "";
  return pipedriveRequest<{ data: any[] }>(`/stages${params}`);
}

/**
 * Get pipelines
 */
export async function getPipelines() {
  return pipedriveRequest<{ data: any[] }>("/pipelines");
}

/**
 * Create a person (contact)
 */
export async function createPerson(personData: {
  name: string;
  email?: string[];
  phone?: string[];
  [key: string]: any;
}) {
  return pipedriveRequest<{ data: any }>("/persons", {
    method: "POST",
    body: JSON.stringify(personData),
  });
}

/**
 * Search for a person by email
 */
export async function findPersonByEmail(email: string) {
  return pipedriveRequest<{ data: { items: any[] } }>(
    `/persons/search?term=${encodeURIComponent(email)}&fields=email`
  );
}

/**
 * Get all products
 */
export async function getProducts(filters?: {
  limit?: number;
  start?: number;
  term?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.limit) params.append("limit", filters.limit.toString());
  if (filters?.start) params.append("start", filters.start.toString());
  if (filters?.term) params.append("term", filters.term);
  
  const query = params.toString();
  return pipedriveRequest<{ data: any[] }>(`/products${query ? `?${query}` : ""}`);
}

/**
 * Get a product by ID
 */
export async function getProduct(productId: number) {
  return pipedriveRequest<{ data: any }>(`/products/${productId}`);
}

/**
 * Update a product in Pipedrive
 */
export async function updateProduct(productId: number, productData: {
  name?: string;
  code?: string;
  unit?: string;
  tax?: number;
  prices?: Array<{
    price: number;
    currency?: string;
    cost?: number;
    overhead_cost?: number;
  }>;
  [key: string]: any; // For custom fields
}) {
  return pipedriveRequest<{ data: any }>(`/products/${productId}`, {
    method: "PUT",
    body: JSON.stringify(productData),
  });
}

/**
 * Delete a product in Pipedrive
 */
export async function deleteProduct(productId: number) {
  return pipedriveRequest<{ data: { id: number } }>(`/products/${productId}`, {
    method: "DELETE",
  });
}

/**
 * Create a new product in Pipedrive
 */
export async function createProduct(productData: {
  name: string;
  code?: string;
  unit?: string;
  tax?: number;
  prices?: Array<{
    price: number;
    currency?: string;
    cost?: number;
    overhead_cost?: number;
  }>;
  [key: string]: any; // For custom fields
}) {
  return pipedriveRequest<{ data: any }>("/products", {
    method: "POST",
    body: JSON.stringify(productData),
  });
}

/**
 * Get all products with pagination (fetches all pages)
 * This handles large product catalogs by fetching in batches
 */
export async function getAllProductsPaginated(term?: string): Promise<any[]> {
  const allProducts: any[] = [];
  let start = 0;
  const limit = 500; // Pipedrive API max limit per request
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("start", start.toString());
    if (term) params.append("term", term);
    
    const response = await pipedriveRequest<{ 
      data: any[]; 
      additional_data?: { 
        pagination?: { 
          more_items_in_collection?: boolean; 
          next_start?: number 
        } 
      } 
    }>(`/products?${params.toString()}`);
    
    if (response.data && response.data.length > 0) {
      allProducts.push(...response.data);
    }
    
    // Check if there are more items
    hasMore = response.additional_data?.pagination?.more_items_in_collection === true;
    if (hasMore && response.additional_data?.pagination?.next_start !== undefined) {
      start = response.additional_data.pagination.next_start;
    } else {
      hasMore = false;
    }
  }

  return allProducts;
}

/**
 * Search products by name
 */
export async function searchProducts(term: string, limit: number = 100) {
  return getProducts({ term, limit });
}

/**
 * Add products to a deal
 * @param dealId The ID of the deal
 * @param products Array of products to add, each with product_id, item_price, and quantity
 */
export async function addProductsToDeal(
  dealId: number,
  products: Array<{
    product_id: number;
    item_price: number;
    quantity: number;
  }>
) {
  // Pipedrive API endpoint for adding products to a deal
  // Note: This may require the Products add-on in Pipedrive
  // The endpoint format is: POST /deals/{id}/products
  // For bulk add, we can send multiple products in one request
  const results = await Promise.all(
    products.map((product) =>
      pipedriveRequest<{ data: any }>(`/deals/${dealId}/products`, {
        method: "POST",
        body: JSON.stringify(product),
      })
    )
  );
  
  return { data: results };
}

/**
 * Create a note in Pipedrive
 */
export async function createNote(noteData: {
  content: string;
  deal_id?: number;
  person_id?: number;
  org_id?: number;
  pinned_to_deal_flag?: number;
  pinned_to_person_flag?: number;
  pinned_to_organization_flag?: number;
}) {
  return pipedriveRequest<{ data: any }>("/notes", {
    method: "POST",
    body: JSON.stringify(noteData),
  });
}

/**
 * Get notes for a deal
 */
export async function getDealNotes(dealId: number) {
  return pipedriveRequest<{ data: any[] }>(`/notes?deal_id=${dealId}`);
}