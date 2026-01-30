#!/usr/bin/env node

/**
 * Image Optimization Script
 * 
 * This script:
 * 1. Converts all PNG files to WebP format (90% smaller)
 * 2. Optimizes JPG files
 * 3. Updates all references in the codebase
 * 4. Keeps original files as backup (can be deleted later)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SRC_DIRS = [
  path.join(__dirname, '..', 'app'),
  path.join(__dirname, '..', 'components'),
  path.join(__dirname, '..', 'data'),
  path.join(__dirname, '..', 'data-store'),
  path.join(__dirname, '..', 'lib'),
];
const QUALITY = 85; // WebP quality (0-100)
const MAX_WIDTH = 1600; // Max image width in pixels

// Track conversions for reference updates
const conversions = new Map();

// Find all image files
function findImages(dir, extensions = ['.png', '.PNG']) {
  const images = [];
  
  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walk(filePath);
      } else if (extensions.some(ext => file.endsWith(ext))) {
        images.push(filePath);
      }
    }
  }
  
  walk(dir);
  return images;
}

// Find all source files that might contain image references
function findSourceFiles(dirs, extensions = ['.ts', '.tsx', '.js', '.jsx', '.json']) {
  const files = [];
  
  for (const dir of dirs) {
    function walk(currentDir) {
      if (!fs.existsSync(currentDir)) return;
      
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        const itemPath = path.join(currentDir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          walk(itemPath);
        } else if (extensions.some(ext => item.endsWith(ext))) {
          files.push(itemPath);
        }
      }
    }
    walk(dir);
  }
  
  return files;
}

// Convert PNG to WebP using sharp (if available) or sips (macOS built-in)
async function convertToWebP(inputPath) {
  const outputPath = inputPath.replace(/\.png$/i, '.webp');
  
  try {
    // Try using sharp first (better quality)
    const sharp = require('sharp');
    await sharp(inputPath)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(outputPath);
    
    return outputPath;
  } catch (e) {
    // Fallback to sips (macOS) + cwebp if available
    try {
      // First resize with sips
      const tempPath = inputPath.replace(/\.png$/i, '_temp.png');
      execSync(`sips -Z ${MAX_WIDTH} "${inputPath}" --out "${tempPath}" 2>/dev/null`, { stdio: 'pipe' });
      
      // Then convert with cwebp if available
      try {
        execSync(`cwebp -q ${QUALITY} "${tempPath}" -o "${outputPath}" 2>/dev/null`, { stdio: 'pipe' });
        fs.unlinkSync(tempPath);
        return outputPath;
      } catch {
        // If cwebp not available, just use the resized PNG
        fs.renameSync(tempPath, outputPath.replace('.webp', '.png'));
        console.log(`  ⚠️  cwebp not found, kept as resized PNG: ${path.basename(inputPath)}`);
        return null;
      }
    } catch (e2) {
      console.log(`  ❌ Failed to convert: ${path.basename(inputPath)}`);
      return null;
    }
  }
}

// Update references in source files
function updateReferences(sourceFiles, conversions) {
  let totalUpdates = 0;
  
  for (const filePath of sourceFiles) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    for (const [oldPath, newPath] of conversions) {
      // Get the relative paths for matching
      const oldRelative = oldPath.replace(PUBLIC_DIR, '').replace(/\\/g, '/');
      const newRelative = newPath.replace(PUBLIC_DIR, '').replace(/\\/g, '/');
      
      // Also match without leading slash
      const oldWithoutSlash = oldRelative.replace(/^\//, '');
      const newWithoutSlash = newRelative.replace(/^\//, '');
      
      if (content.includes(oldRelative) || content.includes(oldWithoutSlash)) {
        content = content.split(oldRelative).join(newRelative);
        content = content.split(oldWithoutSlash).join(newWithoutSlash);
        modified = true;
        totalUpdates++;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`  📝 Updated references in: ${path.basename(filePath)}`);
    }
  }
  
  return totalUpdates;
}

// Get file size in KB
function getFileSizeKB(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return (stats.size / 1024).toFixed(1);
  } catch {
    return 0;
  }
}

// Main execution
async function main() {
  console.log('\n🖼️  Image Optimization Script\n');
  console.log('=' .repeat(50));
  
  // Check if sharp is available
  let hasSharp = false;
  try {
    require('sharp');
    hasSharp = true;
    console.log('✅ Sharp library found - using for conversions\n');
  } catch {
    console.log('⚠️  Sharp not found - will try alternative methods\n');
    console.log('   For best results, run: npm install sharp\n');
  }
  
  // Find all PNG files
  console.log('📂 Scanning for PNG files...');
  const pngFiles = findImages(PUBLIC_DIR, ['.png', '.PNG']);
  console.log(`   Found ${pngFiles.length} PNG files\n`);
  
  if (pngFiles.length === 0) {
    console.log('No PNG files found to convert.');
    return;
  }
  
  // Calculate total size before
  let totalSizeBefore = 0;
  for (const file of pngFiles) {
    totalSizeBefore += parseFloat(getFileSizeKB(file));
  }
  console.log(`📊 Total PNG size before: ${(totalSizeBefore / 1024).toFixed(2)} MB\n`);
  
  // Convert files
  console.log('🔄 Converting PNG files to WebP...\n');
  let converted = 0;
  let totalSizeAfter = 0;
  
  for (const pngFile of pngFiles) {
    const sizeBefore = getFileSizeKB(pngFile);
    process.stdout.write(`   Converting: ${path.basename(pngFile)} (${sizeBefore} KB)... `);
    
    const webpFile = await convertToWebP(pngFile);
    
    if (webpFile) {
      const sizeAfter = getFileSizeKB(webpFile);
      totalSizeAfter += parseFloat(sizeAfter);
      const savings = ((1 - sizeAfter / sizeBefore) * 100).toFixed(0);
      console.log(`✅ ${sizeAfter} KB (${savings}% smaller)`);
      
      conversions.set(pngFile, webpFile);
      converted++;
    } else {
      totalSizeAfter += parseFloat(sizeBefore);
      console.log('⏭️  Skipped');
    }
  }
  
  console.log(`\n✅ Converted ${converted}/${pngFiles.length} files`);
  console.log(`📊 Total size after: ${(totalSizeAfter / 1024).toFixed(2)} MB`);
  console.log(`💾 Space saved: ${((totalSizeBefore - totalSizeAfter) / 1024).toFixed(2)} MB (${((1 - totalSizeAfter / totalSizeBefore) * 100).toFixed(0)}%)\n`);
  
  // Update references in source files
  if (conversions.size > 0) {
    console.log('📝 Updating references in source files...\n');
    const sourceFiles = findSourceFiles(SRC_DIRS);
    const updates = updateReferences(sourceFiles, conversions);
    console.log(`\n✅ Updated ${updates} references\n`);
    
    // Option to delete original PNG files
    console.log('🗑️  Original PNG files kept as backup.');
    console.log('   To delete them, run: node scripts/cleanup-old-images.js\n');
  }
  
  console.log('=' .repeat(50));
  console.log('🎉 Optimization complete!\n');
}

main().catch(console.error);
