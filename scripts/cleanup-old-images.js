#!/usr/bin/env node

/**
 * Cleanup Script - Remove original PNG files after WebP conversion
 * 
 * Run this ONLY after verifying all images work correctly!
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function findPngFiles(dir) {
  const pngFiles = [];
  
  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walk(filePath);
      } else if (file.endsWith('.png') || file.endsWith('.PNG')) {
        // Check if a WebP version exists
        const webpPath = filePath.replace(/\.png$/i, '.webp');
        if (fs.existsSync(webpPath)) {
          pngFiles.push(filePath);
        }
      }
    }
  }
  
  walk(dir);
  return pngFiles;
}

function main() {
  console.log('\n🗑️  PNG Cleanup Script\n');
  console.log('=' .repeat(50));
  
  const pngFiles = findPngFiles(PUBLIC_DIR);
  
  if (pngFiles.length === 0) {
    console.log('\n✅ No PNG files with WebP versions found. Nothing to clean up.\n');
    return;
  }
  
  console.log(`\nFound ${pngFiles.length} PNG files with WebP replacements:\n`);
  
  let totalSaved = 0;
  for (const file of pngFiles) {
    const stats = fs.statSync(file);
    const sizeKB = (stats.size / 1024).toFixed(1);
    totalSaved += stats.size;
    console.log(`  🗑️  ${path.basename(file)} (${sizeKB} KB)`);
  }
  
  console.log(`\n📊 Total space to be freed: ${(totalSaved / 1024 / 1024).toFixed(2)} MB\n`);
  
  // Ask for confirmation
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('⚠️  Are you sure you want to delete these files? (yes/no): ', (answer) => {
    if (answer.toLowerCase() === 'yes') {
      console.log('\n🗑️  Deleting files...\n');
      
      for (const file of pngFiles) {
        try {
          fs.unlinkSync(file);
          console.log(`  ✅ Deleted: ${path.basename(file)}`);
        } catch (e) {
          console.log(`  ❌ Failed to delete: ${path.basename(file)}`);
        }
      }
      
      console.log(`\n✅ Cleanup complete! Freed ${(totalSaved / 1024 / 1024).toFixed(2)} MB\n`);
    } else {
      console.log('\n❌ Cleanup cancelled.\n');
    }
    
    rl.close();
  });
}

main();
