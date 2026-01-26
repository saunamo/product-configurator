# Editing Guide - SaunaMo Product Configurator

This guide shows you exactly where to edit images, text, prices, and other content.

## 📝 Content Editing Locations

### 1. **Option Cards (Titles, Descriptions, Prices, Images)**

Edit the data files in `/data` folder:

- `data/rearGlassWall.ts` - Rear Glass Wall options
- `data/lighting.ts` - Lighting options
- `data/heater.ts` - Heater options
- `data/aromasAccessories.ts` - Aromas & Accessories options
- `data/electricalAssembly.ts` - Electrical & Assembly options
- `data/delivery.ts` - Delivery options
- `data/coldPlunge.ts` - Cold Plunge options

**Example structure:**
```typescript
{
  id: "option-id",                    // Unique identifier
  title: "Option Title",              // Card title
  description: "Option description",   // Card description
  imageUrl: "/images/option.jpg",     // Image path or URL
  price: 250,                         // Price (number)
}
```

**To modify:**
- Change `title` for the option name
- Change `description` for the option description
- Change `imageUrl` to point to your image (local path or URL)
- Change `price` for the option price
- Add/remove options by editing the `options` array

### 2. **Step Titles & Descriptions**

In the same data files, edit the step-level properties:

```typescript
{
  stepId: "step-id",
  title: "Step Title",              // Main step title
  description: "Step description",   // Step description text
  selectionType: "single" | "multi", // Selection type
  required: true | false,            // Is selection required?
  options: [...]
}
```

### 3. **Step Names in Stepper**

Edit `/constants/steps.ts` to change step names shown in the horizontal stepper:

```typescript
{
  id: "step-id",
  name: "Step Name",                 // Name shown in stepper
  route: "/configurator/step-id",    // URL route
}
```

### 4. **Product Name**

Edit `/components/ConfiguratorLayout.tsx` line 33:

```typescript
<h1 className="text-3xl font-bold text-gray-900 mb-6">
  The Skuare  {/* Change this */}
</h1>
```

### 5. **Main Product Image (Left Side)**

The main product image uses a default placeholder. To change it:

**Option A:** Pass `productImageUrl` prop in `/app/configurator/[step]/page.tsx`:
```typescript
<ConfiguratorLayout
  productImageUrl="/images/main-product.jpg"  // Add this
  ...
>
```

**Option B:** Edit the default in `/components/ProductImage.tsx` line 13-14:
```typescript
const defaultImageUrl = "your-image-url-here";
```

### 6. **Option Card Images**

Option card images are set in the data files (see #1 above). You can use:

- **Local images:** Place in `/public/images/` and use `/images/filename.jpg`
- **External URLs:** Use full URL like `https://example.com/image.jpg`
- **Placeholder:** Current code uses placeholder images if URL is invalid

### 7. **Adding/Removing Steps**

1. Add step data file in `/data/` folder
2. Export it in `/data/index.ts`
3. Add step definition in `/constants/steps.ts`
4. The routing will automatically work via the dynamic route

### 8. **Styling & Colors**

- **Colors:** Edit `/tailwind.config.ts` for color palette
- **Global styles:** Edit `/app/globals.css`
- **Component styles:** Edit individual component files in `/components/`

## 🖼️ Adding Images

### Method 1: Local Images (Recommended)

1. Create `/public/images/` folder
2. Add your images there
3. Reference as `/images/filename.jpg` in data files

### Method 2: External URLs

Use full URLs directly in `imageUrl` field:
```typescript
imageUrl: "https://example.com/sauna-image.jpg"
```

### Method 3: Next.js Image Optimization

For better performance, you can modify `OptionCard.tsx` to use Next.js `Image` component (currently uses regular `img` tag).

## 💰 Price Formatting

Prices are displayed as:
- `$0` → Shows "Included"
- `$250` → Shows "+$250"

To change formatting, edit `/components/OptionCard.tsx` around line 30-35.

## 🔄 Making Changes

1. Edit the relevant file(s)
2. Save the file
3. The dev server will auto-reload (if running)
4. Refresh your browser to see changes

## 📁 File Structure Summary

```
/data/                    → All content (options, titles, descriptions, prices)
/constants/steps.ts      → Step names in stepper
/components/
  ConfiguratorLayout.tsx → Product name
  ProductImage.tsx       → Main product image default
  OptionCard.tsx         → Option card styling & price display
/public/images/          → Place images here (create if needed)
```

## 🎨 Quick Edits Checklist

- [ ] Option titles → Edit `/data/*.ts` files
- [ ] Option descriptions → Edit `/data/*.ts` files  
- [ ] Option prices → Edit `/data/*.ts` files
- [ ] Option images → Edit `imageUrl` in `/data/*.ts` files
- [ ] Step titles → Edit `/data/*.ts` files
- [ ] Step names in stepper → Edit `/constants/steps.ts`
- [ ] Product name → Edit `/components/ConfiguratorLayout.tsx`
- [ ] Main product image → Edit `/components/ProductImage.tsx` or pass prop



