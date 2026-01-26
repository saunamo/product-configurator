/**
 * Script to create installation products in Pipedrive
 * This will actually create the products via the API
 */

const products = [
  {
    name: "Instalaciones fuera de PT (SIN IVA)",
    price: 1033.05,
    sku: "INSFPT",
  },
  {
    name: "Montaje de Sauna España",
    price: 1100.00,
    sku: "MONSES",
  },
  {
    name: "Montaje de Sauna Islas",
    price: 1500.00,
    sku: "MONSIS",
  },
  {
    name: "Instalación de Bañera de Hidromasaje de Leña",
    price: 350.00,
    sku: "INSBHL",
  },
  {
    name: "Instalación Eléctrica (solo conexiones)",
    price: 750.00,
    sku: "INSELE",
  },
  {
    name: "Instalación Eléctrica (instalación completa)",
    price: 1300.00,
    sku: "INSEIC",
  },
  {
    name: "Tratamiento de Madera",
    price: 345.53,
    sku: "TRAMAD",
  },
];

// Format products for Pipedrive
const productsToCreate = products.map((product) => {
  const fullName = `${product.name} | ${product.sku}`;
  
  return {
    name: fullName,
    code: `ES-${product.sku}`,
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

// Export for API call
export default productsToCreate;



