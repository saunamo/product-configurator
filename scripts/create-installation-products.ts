/**
 * Script to create installation products in Pipedrive
 * Run this to add the installation products from the spreadsheet
 */

// Products from the spreadsheet
const products = [
  {
    name: "Instalaciones fuera de PT (SIN IVA)",
    price: 1033.05,
    originalName: "Installations outside PT (WITHOUT VAT)",
  },
  {
    name: "Montaje de Sauna España",
    price: 1100.00,
    originalName: "Sauna Assembly Spain",
  },
  {
    name: "Montaje de Sauna Islas",
    price: 1500.00,
    originalName: "Sauna Assembly Islands",
  },
  {
    name: "Instalación de Bañera de Hidromasaje de Leña",
    price: 350.00,
    originalName: "Woodburning Hot Tub Installation",
  },
  {
    name: "Instalación Eléctrica (solo conexiones)",
    price: 750.00,
    originalName: "Electrical installation (connections only)",
  },
  {
    name: "Instalación Eléctrica (instalación completa)",
    price: 1300.00,
    originalName: "Electrical installation (full installation)",
  },
  {
    name: "Tratamiento de Madera",
    price: 345.53,
    originalName: "Wood treatment",
  },
];

/**
 * Generate SKU from product name
 * Logic: Take first letters of key words, make it uppercase, add numbers if needed
 */
function generateSKU(name: string): string {
  // Remove common words and special characters
  const words = name
    .toLowerCase()
    .replace(/[|]/g, '') // Remove pipe
    .replace(/\([^)]*\)/g, '') // Remove parentheses content
    .split(/\s+/)
    .filter(word => 
      word.length > 2 && 
      !['de', 'del', 'la', 'el', 'las', 'los', 'y', 'e', 'o', 'u', 'sin', 'con'].includes(word)
    );

  // Take first 2-3 letters of first 2-3 significant words
  let sku = '';
  const maxWords = Math.min(3, words.length);
  
  for (let i = 0; i < maxWords && sku.length < 6; i++) {
    const word = words[i];
    if (word.length >= 3) {
      sku += word.substring(0, 2).toUpperCase();
    } else if (word.length === 2) {
      sku += word.toUpperCase();
    }
  }

  // If SKU is too short, add more characters
  if (sku.length < 4) {
    const firstWord = words[0] || '';
    if (firstWord.length >= 4) {
      sku = firstWord.substring(0, 4).toUpperCase();
    }
  }

  return sku || 'PROD';
}

// Generate products with SKUs and format
const productsToCreate = products.map((product) => {
  const sku = generateSKU(product.name);
  const fullName = `${product.name} | ${sku}`;
  
  return {
    name: fullName,
    code: `ES-${sku}`,
    prices: [
      {
        price: product.price,
        currency: "EUR",
      },
    ],
    tax: 21,
    unit: "piece",
  };
});

// Export for use
export const installationProducts = productsToCreate;

// Log for verification
console.log("Products to create:");
productsToCreate.forEach((p, i) => {
  console.log(`${i + 1}. ${p.name} - €${p.prices[0].price} - Code: ${p.code}`);
});



