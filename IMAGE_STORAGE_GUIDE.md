# Image Storage System

## ✅ Problem Solved

Previously, uploaded images were stored as base64 data URLs in localStorage, which could quickly fill the 5-10MB localStorage quota with tens of images.

## 🎯 New Solution

Images are now uploaded to the server and stored in `/public/images/` folder. Only the URL path (e.g., `/images/1234567890-abc123.jpg`) is saved in localStorage, not the full image data.

### Benefits:
- **Saves localStorage space**: URLs are only ~50-100 bytes vs base64 which can be 100KB-2MB per image
- **Better performance**: Images load faster from server files
- **Persistent storage**: Images are saved to disk, not just browser storage
- **Can store unlimited images**: No localStorage quota concerns

## 📤 How It Works

### When You Upload an Image:

1. **Select image file** → Click "📁 Upload" button in admin panel
2. **File is uploaded** → Sent to `/api/upload-image` endpoint
3. **Saved to server** → File saved to `/public/images/` folder with unique filename
4. **URL returned** → Path like `/images/1234567890-abc123.jpg` is stored in localStorage
5. **Config updated** → Only the small URL string is saved, not the image data

### Image Storage Location:
```
/public/images/
  ├── 1234567890-abc123.jpg
  ├── 1234567891-def456.png
  └── ...
```

## 🔄 Migration from Base64

If you have existing base64 images in your config:

1. **Old format** (base64): `data:image/jpeg;base64,/9j/4AAQSkZJRg...` (very large)
2. **New format** (URL): `/images/1234567890-abc123.jpg` (small)

The system will show a warning for old base64 images. To migrate:
1. Open admin panel
2. Find options with base64 images (they'll show a warning)
3. Re-upload those images using the "📁 Upload" button
4. The new URL will replace the base64 data

## 💾 Storage Details

### localStorage (Admin Config):
- **Before**: Stored full base64 image data (100KB-2MB per image)
- **After**: Stores only URL path (~50-100 bytes per image)
- **Savings**: ~99% reduction in localStorage usage

### Server Storage:
- **Location**: `/public/images/` folder
- **Format**: Original file format (JPG, PNG, etc.)
- **Naming**: `{timestamp}-{random}.{extension}`
- **Max size**: 5MB per image
- **Persistence**: Files persist on server, not tied to browser

## 🚀 Usage

### In Admin Panel:
1. Navigate to any option's image field
2. Enter a URL directly, OR
3. Click "📁 Upload" to select a file from your computer
4. Image is uploaded and URL is automatically filled in

### Supported Formats:
- JPG/JPEG
- PNG
- GIF
- WebP
- Other image formats

## ⚠️ Important Notes

1. **Server restart**: Images in `/public/images/` persist across server restarts
2. **Git commits**: Images in `/public/images/` are committed to git (part of project)
3. **Deployment**: Images will be deployed with your app
4. **Backup**: Export your config regularly - it now contains small URLs instead of large base64 data

## 🔧 Technical Details

### API Endpoint:
- **Route**: `/api/upload-image`
- **Method**: POST
- **Body**: FormData with `file` field
- **Response**: `{ success: true, url: "/images/...", filename: "...", size: ... }`

### File Validation:
- ✅ Must be an image file
- ✅ Max size: 5MB
- ✅ Unique filename generated automatically

### Error Handling:
- Invalid file type → Error message
- File too large → Error message
- Upload failure → Error message with details
