/**
 * Browser Console Script to Add Pipedrive Products to Cube 125
 * 
 * Run this in your browser console while on /admin/products/cube-125
 * 
 * This script will automatically add Pipedrive products to each step of Cube 125
 */

(function setupCube125Pipedrive() {
  // Pipedrive product mappings
  const pipedriveMappings = {
    "rear-glass-wall": {
      // Add glass wall products if available
    },
    "lighting": {
      // Sauna Exterior Hiki L
      defaultOption: 6689
    },
    "heater": {
      // Use a sauna product as placeholder
      defaultOption: 6689
    },
    "aromas-accessories": {
      // Natural Oak Sauna Whisk
      option1: 6688,
      // Organic Birch Sauna Whisk  
      option2: 6690
    },
    "electrical-assembly": {
      // Ice Bath Installation
      defaultOption: 6677
    },
    "delivery": {
      // Use installation as placeholder
      defaultOption: 6677
    },
    "cold-plunge": {
      // Cooling and Heating Unit
      defaultOption: 6692
    }
  };

  // Get product config from localStorage
  const productId = "cube-125";
  const configKey = `saunamo-product-config-${productId}`;
  const configStr = localStorage.getItem(configKey);
  
  if (!configStr) {
    console.error("Cube 125 configuration not found. Please create the product first.");
    return;
  }

  const config = JSON.parse(configStr);
  let updated = 0;

  // Update each step with Pipedrive products
  Object.entries(pipedriveMappings).forEach(([stepId, mappings]) => {
    const stepData = config.stepData[stepId];
    if (!stepData) {
      console.warn(`Step ${stepId} not found`);
      return;
    }

    // Update options with Pipedrive product IDs
    stepData.options.forEach((option, index) => {
      const mappingKey = `option${index + 1}`;
      const productId = mappings[mappingKey] || mappings.defaultOption;
      
      if (productId && !option.pipedriveProductId) {
        option.pipedriveProductId = productId;
        updated++;
        console.log(`Added Pipedrive product ${productId} to ${stepId} - ${option.title}`);
      }
    });
  });

  // Save updated config
  localStorage.setItem(configKey, JSON.stringify(config));
  
  console.log(`✅ Setup complete! Updated ${updated} options with Pipedrive products.`);
  console.log("Please refresh the page to see the changes.");
})();



