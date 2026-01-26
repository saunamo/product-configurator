# Cube 125 - Pipedrive Product Setup Guide

This guide shows you how to add Pipedrive products to the Cube 125 configuration for testing.

## Steps to Add Pipedrive Products

1. **Go to Admin Panel**: Navigate to `/admin/products/cube-125`
2. **Open Steps & Options Tab**: Click on the "Steps & Options" tab
3. **Expand Each Step**: Click on each step to expand it
4. **For Each Option**: Use the Pipedrive Product Selector to search and select products

## Recommended Pipedrive Products by Step

### 1. Rear Glass Wall
- Search for: `glass` or `wall`
- Or use any relevant product from your catalog

### 2. Lighting
- **Search**: `Hiki`
- **Select**: "Sauna Exterior Hiki L" (ID: 6689)
- **Price**: €8,902.44

### 3. Heater
- **Search**: `heater` or `sauna`
- **Select**: Any sauna heater product from your catalog
- Or use: "Sauna Exterior Hiki L" (ID: 6689) as placeholder

### 4. Aromas & Sauna Accessories
- **Option 1 - Search**: `Whisk` or `Oak`
- **Select**: "Ramo de Carvalho Natural para Sauna (Natural Oak Sauna Whisk)" (ID: 6688)
- **Price**: €22.72

- **Option 2 - Search**: `Birch` or `Whisk`
- **Select**: "Ramo de Bétula Orgânico para Sauna (Organic Birch Sauna Whisk)" (ID: 6690)
- **Price**: €22.72

### 5. Electrical Installation & Sauna Assembly
- **Search**: `Installation` or `Ice`
- **Select**: "Instalação de banheira de gelo | ICE-BATH-INSTALLATION" (ID: 6677)
- **Price**: €162.60

### 6. Delivery
- **Search**: `delivery` or use installation product
- **Select**: "Instalação de banheira de gelo | ICE-BATH-INSTALLATION" (ID: 6677) as placeholder
- Or add a dedicated delivery product if available

### 7. Cold Plunge
- **Search**: `Chiller` or `Cooling`
- **Select**: "Unidade de Arrefecimento e Aquecimento (com Mangueiras e Conetores) | ACC-AV-CHILLER" (ID: 6692)
- **Price**: €2,642.28

## Quick Reference - Product IDs

| Step | Product Name | Pipedrive ID | Price (EUR) |
|------|-------------|--------------|-------------|
| Lighting | Sauna Exterior Hiki L | 6689 | 8,902.44 |
| Aromas (Option 1) | Natural Oak Sauna Whisk | 6688 | 22.72 |
| Aromas (Option 2) | Organic Birch Sauna Whisk | 6690 | 22.72 |
| Electrical | Ice Bath Installation | 6677 | 162.60 |
| Cold Plunge | Cooling and Heating Unit | 6692 | 2,642.28 |

## How It Works

1. When you select a Pipedrive product for an option, the product ID is saved
2. When a quote is generated, prices are automatically synced from Pipedrive
3. The latest prices from your Pipedrive catalog will be used in the quote
4. A Pipedrive deal is automatically created with the quote details

## Testing

After adding products:
1. Go to `/products/cube-125/configurator/rear-glass-wall`
2. Make selections through all steps
3. Generate a quote
4. Check that prices match your Pipedrive catalog
5. Verify that a deal was created in Pipedrive



