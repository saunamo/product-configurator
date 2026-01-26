# Admin Configuration Interface

The admin interface allows you to configure everything in the configurator without editing code files.

## 🚀 Accessing the Admin Interface

Navigate to: **http://localhost:3000/admin**

## 📋 Features

### 1. **General Settings**
- **Product Name**: Change the product name displayed at the top
- **Main Product Image**: Set the large product image shown on the left side

### 2. **Step Configuration**
For each of the 7 steps, you can edit:

- **Step Name**: The name shown in the horizontal stepper
- **Step Title**: The title shown in the configuration panel
- **Step Description**: Description text for the step
- **Selection Type**: Single select or multi-select
- **Required**: Whether users must select an option to proceed

### 3. **Option Management**
For each option within a step, you can:

- **Edit Title**: Option name
- **Edit Description**: Option description text
- **Set Price**: Option price (0 = "Included")
- **Set Image URL**: Image path or URL
- **Add New Options**: Click "+ Add Option" button
- **Remove Options**: Click "Remove Option" link

### 4. **Import/Export**
- **Export**: Download your configuration as JSON
- **Import**: Paste JSON to restore a configuration
- **Reset**: Restore default configuration

## 💾 Saving Changes

1. Make your edits in the admin interface
2. Click **"Save Changes"** button (top right)
3. Changes are saved to browser localStorage
4. The configurator will immediately use your new settings

## 🔄 How It Works

- Configuration is stored in **browser localStorage**
- The configurator automatically loads saved configuration
- Falls back to default data if no admin config exists
- All changes are client-side (no backend required)

## 📝 Tips

1. **Image URLs**: Use either:
   - Local paths: `/images/photo.jpg` (place files in `/public/images/`)
   - External URLs: `https://example.com/image.jpg`

2. **Preview Images**: The admin shows image previews when you enter URLs

3. **Unsaved Changes**: The interface shows "Unsaved changes" when you have edits that haven't been saved

4. **Backup**: Use Export to backup your configuration before making major changes

5. **Testing**: Click "View Configurator" to see your changes in action

## 🔧 Future Enhancements

The current system uses localStorage, but the structure is designed to easily swap to:
- Database storage
- API endpoints
- File-based configuration
- CMS integration

Just replace the storage functions in `/utils/configStorage.ts` and `/contexts/AdminConfigContext.tsx`.



