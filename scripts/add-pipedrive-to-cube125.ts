/**
 * Script to add Pipedrive products to Cube 125 configuration
 * Run this script to populate Cube 125 with test Pipedrive products
 */

// This script would need to run in a browser context to access localStorage
// For now, we'll create an admin interface helper instead

export const CUBE125_PIPEDRIVE_MAPPINGS = {
  // Map step IDs to option IDs and their Pipedrive product IDs
  // Based on the products we fetched from Pipedrive
  
  // Rear Glass Wall - using a sauna product as placeholder
  "rear-glass-wall": {
    // Option IDs will be determined by the actual config
  },
  
  // Lighting - Sauna products
  lighting: {
    // Sauna Exterior Hiki L - ID 6689
  },
  
  // Heater - using sauna as placeholder
  heater: {
    // Sauna Exterior Hiki L - ID 6689
  },
  
  // Aromas & Accessories
  "aromas-accessories": {
    // Natural Oak Sauna Whisk - ID 6688
    // Organic Birch Sauna Whisk - ID 6690
  },
  
  // Electrical & Assembly
  "electrical-assembly": {
    // Ice Bath Installation - ID 6677
  },
  
  // Delivery - using installation as placeholder
  delivery: {
    // Ice Bath Installation - ID 6677
  },
  
  // Cold Plunge
  "cold-plunge": {
    // Cooling and Heating Unit - ID 6692
  },
};

/**
 * Note: To add Pipedrive products to Cube 125:
 * 1. Go to /admin/products/cube-125
 * 2. Navigate to "Steps & Options" tab
 * 3. For each option, use the Pipedrive Product Selector
 * 4. Search for and select the appropriate product
 * 
 * Suggested products:
 * - Lighting: Search "Hiki" -> Select "Sauna Exterior Hiki L" (ID: 6689)
 * - Aromas: Search "Whisk" -> Select "Natural Oak Sauna Whisk" (ID: 6688) or "Organic Birch Sauna Whisk" (ID: 6690)
 * - Electrical: Search "Installation" -> Select "Ice Bath Installation" (ID: 6677)
 * - Cold Plunge: Search "Chiller" -> Select "Cooling and Heating Unit" (ID: 6692)
 */



