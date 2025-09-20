#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '../dist');
const OUTPUT_FILE = path.join(__dirname, '../bundle-analysis.json');

// Size thresholds (in bytes)
const THRESHOLDS = {
  CHUNK_WARNING: 250 * 1024, // 250KB
  CHUNK_ERROR: 500 * 1024,   // 500KB
  TOTAL_WARNING: 1 * 1024 * 1024, // 1MB
  TOTAL_ERROR: 2 * 1024 * 1024,   // 2MB
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (['.js', '.mjs'].includes(ext)) return 'javascript';
  if (['.css'].includes(ext)) return 'stylesheet';
  if (['.woff', '.woff2', '.ttf', '.eot'].includes(ext)) return 'font';
  if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'].includes(ext)) return 'image';
  if (['.html'].includes(ext)) return 'html';
  return 'other';
}

function getChunkType(filename) {
  if (filename.includes('vendor') || filename.includes('node_modules')) return 'vendor';
  if (filename.includes('pages/') || filename.includes('routes/')) return 'route';
  if (filename.endsWith('.css') || filename.includes('assets/')) return 'asset';
  return 'app';
}

async function analyzeBundle() {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error('Build directory not found. Run "npm run build" first.');
  }

  const files = fs.readdirSync(DIST_DIR, { recursive: true })
    .map(file => typeof file === 'string' ? file : file.toString())
    .filter(file => !fs.statSync(path.join(DIST_DIR, file)).isDirectory());

  const chunks = [];
  const assets = [];
  let totalSize = 0;
  let totalGzipSize = 0;

  for (const file of files) {
    const filePath = path.join(DIST_DIR, file);
    const stats = fs.statSync(filePath);
    const size = stats.size;
    totalSize += size;

    // Simple gzip estimation (approximately 70% reduction for text files)
    let gzipSize = 0;
    const fileType = getFileType(file);
    if (['javascript', 'stylesheet', 'html'].includes(fileType)) {
      gzipSize = Math.round(size * 0.3); // Rough gzip estimation
      totalGzipSize += gzipSize;
    } else {
      totalGzipSize += size; // Binary files don't compress much
    }
    
    if (fileType === 'javascript' && size > 1024) { // Only analyze JS chunks > 1KB
      chunks.push({
        name: file,
        size,
        gzipSize,
        type: getChunkType(file)
      });
    } else {
      assets.push({
        name: file,
        size,
        type: fileType
      });
    }
  }

  // Sort chunks by size (largest first)
  chunks.sort((a, b) => b.size - a.size);

  // Generate recommendations
  const recommendations = generateRecommendations(chunks, assets, totalSize);

  return {
    timestamp: new Date().toISOString(),
    totalSize,
    gzipSize: totalGzipSize,
    chunks,
    assets,
    recommendations
  };
}

function generateRecommendations(chunks, assets, totalSize) {
  const recommendations = [];

  // Check total bundle size
  if (totalSize > THRESHOLDS.TOTAL_ERROR) {
    recommendations.push('❌ Bundle size is too large! Consider aggressive code splitting and tree shaking.');
  } else if (totalSize > THRESHOLDS.TOTAL_WARNING) {
    recommendations.push('⚠️ Bundle size is getting large. Monitor and optimize regularly.');
  } else {
    recommendations.push('✅ Bundle size is within acceptable limits.');
  }

  // Check individual chunks
  const largeChunks = chunks.filter(chunk => chunk.size > THRESHOLDS.CHUNK_WARNING);
  if (largeChunks.length > 0) {
    recommendations.push(`⚠️ ${largeChunks.length} chunk(s) are larger than 250KB:`);
    largeChunks.forEach(chunk => {
      recommendations.push(`  • ${chunk.name}: ${formatBytes(chunk.size)} (${formatBytes(chunk.gzipSize)} gzipped)`);
    });
  }

  // Check vendor chunks
  const vendorChunks = chunks.filter(chunk => chunk.type === 'vendor');
  const totalVendorSize = vendorChunks.reduce((sum, chunk) => sum + chunk.size, 0);
  const vendorPercentage = (totalVendorSize / totalSize) * 100;

  if (vendorPercentage > 60) {
    recommendations.push('⚠️ Vendor code makes up >60% of bundle. Consider reducing dependencies.');
  }

  // Check for duplicate chunks
  const chunkNames = chunks.map(chunk => chunk.name.split('.')[0]);
  const duplicates = chunkNames.filter((name, index) => chunkNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    recommendations.push(`⚠️ Potential duplicate chunks detected: ${duplicates.join(', ')}`);
  }

  // Asset recommendations
  const imageAssets = assets.filter(asset => asset.type === 'image');
  const largeImages = imageAssets.filter(asset => asset.size > 100 * 1024); // 100KB
  if (largeImages.length > 0) {
    recommendations.push(`📷 ${largeImages.length} large image(s) detected. Consider optimization.`);
  }

  return recommendations;
}

function printAnalysis(stats) {
  console.log('\n📦 Bundle Analysis Report');
  console.log('========================\n');

  console.log(`📊 Bundle Size: ${formatBytes(stats.totalSize)} (${formatBytes(stats.gzipSize)} gzipped)`);
  console.log(`📅 Generated: ${new Date(stats.timestamp).toLocaleString()}\n`);

  // Chunks breakdown
  console.log('🔍 JavaScript Chunks:');
  console.log('----------------------');
  stats.chunks.forEach((chunk, index) => {
    const sizeStr = formatBytes(chunk.size).padEnd(12);
    const gzipStr = formatBytes(chunk.gzipSize).padEnd(12);
    const typeIcon = chunk.type === 'vendor' ? '📦' : chunk.type === 'route' ? '📄' : '⚙️';
    console.log(`${index + 1}. ${typeIcon} ${chunk.name}`);
    console.log(`   Size: ${sizeStr} (${gzipStr} gzipped)`);
  });

  // Asset breakdown
  if (stats.assets.length > 0) {
    console.log('\n📁 Other Assets:');
    console.log('----------------');
    const assetsByType = stats.assets.reduce((acc, asset) => {
      acc[asset.type] = (acc[asset.type] || 0) + asset.size;
      return acc;
    }, {});

    Object.entries(assetsByType).forEach(([type, size]) => {
      console.log(`${type.padEnd(12)}: ${formatBytes(size)}`);
    });
  }

  // Recommendations
  console.log('\n💡 Recommendations:');
  console.log('-------------------');
  stats.recommendations.forEach(rec => console.log(rec));

  console.log('\n');
}

async function main() {
  try {
    console.log('🔍 Analyzing bundle...');
    const stats = await analyzeBundle();
    
    // Save to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(stats, null, 2));
    console.log(`📁 Analysis saved to: ${OUTPUT_FILE}`);
    
    // Print to console
    printAnalysis(stats);
    
    // Exit with error code if bundle is too large
    if (stats.totalSize > THRESHOLDS.TOTAL_ERROR) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message);
    process.exit(1);
  }
}

main();