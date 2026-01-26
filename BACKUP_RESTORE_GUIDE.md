# Configurator Backup & Restore Guide

This guide explains how to backup and restore the **exact current state** of all product configurators.

## ⚠️ Important

The backup system captures the **FINAL RENDERED STATE** of each product configurator - exactly as it appears to users. This includes:
- ✅ All steps in correct order
- ✅ All options with correct images, titles, prices
- ✅ Product-specific settings
- ✅ Global settings applied
- ✅ Filtered options (e.g., delivery options, rear glass wall options)
- ✅ Step names from global settings
- ✅ Pipedrive product links

**This is NOT the same as the raw stored data** - it's the processed, final state that users see.

## 📦 Creating a Backup

### Option 1: Via API (Recommended)

Make a POST request to create a backup:

```bash
curl -X POST http://localhost:3000/api/admin/backup-configurator-state
```

Or use any HTTP client (Postman, etc.)

**Response:**
```json
{
  "success": true,
  "message": "Configurator state backed up successfully",
  "backupFile": "configurator-backup-2026-01-23.json",
  "productsBackedUp": 8,
  "totalProducts": 8,
  "timestamp": "2026-01-23T12:00:00.000Z",
  "backupSize": "2.45 MB"
}
```

### Option 2: Via Browser Console

Open browser console on any page and run:

```javascript
fetch('/api/admin/backup-configurator-state', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

## 📁 Backup Location

Backups are saved to:
- **Latest backup**: `data-store/backups/configurator-backup-latest.json`
- **Timestamped backup**: `data-store/backups/configurator-backup-YYYY-MM-DD.json`

## 🔄 Restoring from Backup

### Option 1: Restore Latest Backup

```bash
curl -X POST http://localhost:3000/api/admin/restore-configurator-state \
  -H "Content-Type: application/json" \
  -d '{"backupFile": "latest"}'
```

### Option 2: Restore Specific Backup

```bash
curl -X POST http://localhost:3000/api/admin/restore-configurator-state \
  -H "Content-Type: application/json" \
  -d '{"backupFile": "configurator-backup-2026-01-23.json"}'
```

### Option 3: Via Browser Console

```javascript
fetch('/api/admin/restore-configurator-state', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ backupFile: 'latest' })
})
  .then(r => r.json())
  .then(console.log);
```

## 📋 Listing Available Backups

```bash
curl http://localhost:3000/api/admin/restore-configurator-state
```

**Response:**
```json
{
  "success": true,
  "backups": [
    {
      "fileName": "configurator-backup-latest.json",
      "isLatest": true
    },
    {
      "fileName": "configurator-backup-2026-01-23.json",
      "isLatest": false
    }
  ],
  "latestBackup": {
    "timestamp": "2026-01-23T12:00:00.000Z",
    "productsCount": 8,
    "configsCount": 8,
    "description": "Complete backup of Saunamo configurator state - FINAL rendered state as shown in configurator"
  }
}
```

## 🎯 Use Cases

### Scenario 1: Before Making Major Changes
```bash
# 1. Create backup
POST /api/admin/backup-configurator-state

# 2. Make your changes
# ... modify configurators ...

# 3. If something goes wrong, restore
POST /api/admin/restore-configurator-state
# Body: { "backupFile": "latest" }
```

### Scenario 2: Restore to Known Good State
```bash
# List available backups
GET /api/admin/restore-configurator-state

# Restore specific backup
POST /api/admin/restore-configurator-state
# Body: { "backupFile": "configurator-backup-2026-01-23.json" }
```

### Scenario 3: Regular Automated Backups
Set up a cron job or scheduled task to run:
```bash
POST /api/admin/backup-configurator-state
```

## 📝 What Gets Backed Up

Each backup includes:

1. **Products List**: All product metadata (id, name, slug, dates)
2. **Product Configs**: Complete final rendered state for each product:
   - `steps`: All steps with correct names and order
   - `stepData`: All step data with:
     - Options with images, titles, prices
     - Pipedrive product links
     - Selection types
     - Required flags
   - `mainProductImageUrl`: Main product image
   - `design`: Design configuration
   - `quoteSettings`: Quote generation settings
   - All other product-specific settings

## 🔒 Safety

- ✅ Backups are **read-only** - they don't modify anything
- ✅ Restores **overwrite** existing configs - use with caution
- ✅ Multiple backups are kept (timestamped)
- ✅ Latest backup is always available
- ✅ Backup files are stored in `data-store/backups/`

## 💡 Best Practices

1. **Create a backup before major changes**
2. **Create regular backups** (daily/weekly)
3. **Test restore process** on a development environment first
4. **Keep multiple backups** - don't rely only on "latest"
5. **Document what changes you made** between backups

## 🚨 Important Notes

- The backup captures the **FINAL RENDERED STATE**, not raw stored data
- This means it includes all processing, filtering, and global settings
- When restored, the configs will be exactly as they were when backed up
- The restore process saves configs directly to the database
- After restore, refresh the admin panel to see changes

## 📞 Quick Reference

**Create Backup:**
```bash
POST /api/admin/backup-configurator-state
```

**Restore Latest:**
```bash
POST /api/admin/restore-configurator-state
Body: { "backupFile": "latest" }
```

**List Backups:**
```bash
GET /api/admin/restore-configurator-state
```

**Restore Specific:**
```bash
POST /api/admin/restore-configurator-state
Body: { "backupFile": "configurator-backup-YYYY-MM-DD.json" }
```
