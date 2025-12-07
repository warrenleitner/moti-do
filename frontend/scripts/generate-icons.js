/**
 * Script to generate PWA icons from the source SVG.
 *
 * Usage: node scripts/generate-icons.js
 *
 * Requires: npm install --save-dev sharp
 */

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ICONS_DIR = join(__dirname, '../public/icons');
const SVG_SOURCE = join(ICONS_DIR, 'icon.svg');

// Icon sizes needed for PWA
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  console.log('Generating PWA icons from SVG...');

  // Ensure icons directory exists
  if (!existsSync(ICONS_DIR)) {
    mkdirSync(ICONS_DIR, { recursive: true });
  }

  for (const size of SIZES) {
    const outputPath = join(ICONS_DIR, `icon-${size}x${size}.png`);

    await sharp(SVG_SOURCE)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`  Generated: icon-${size}x${size}.png`);
  }

  // Also generate favicon
  const faviconPath = join(__dirname, '../public/favicon.ico');
  await sharp(SVG_SOURCE)
    .resize(32, 32)
    .png()
    .toFile(faviconPath.replace('.ico', '.png'));
  console.log('  Generated: favicon.png');

  console.log('Done! All icons generated successfully.');
}

generateIcons().catch(console.error);
