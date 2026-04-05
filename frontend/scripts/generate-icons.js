/**
 * Generate PWA shortcut icons plus Android install icons.
 *
 * Usage: node scripts/generate-icons.js
 */

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PUBLIC_DIR = join(__dirname, '../public');
const ICONS_DIR = join(PUBLIC_DIR, 'icons');
const SHORTCUT_ICON_SOURCE = join(ICONS_DIR, 'icon.svg');
const INSTALL_ICON_SOURCE = join(PUBLIC_DIR, 'logo-large.png');
// Match the app theme so Android maskable icons keep a branded background when cropped.
const MASKABLE_BACKGROUND = '#0B0E17';

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const INSTALL_ICON_SIZES = [192, 512];
const MASKABLE_SAFE_ZONE = 0.8;

async function generateIcons() {
  console.log('Generating shortcut and install icons...');

  if (!existsSync(ICONS_DIR)) {
    mkdirSync(ICONS_DIR, { recursive: true });
  }

  for (const size of SIZES) {
    const outputPath = join(ICONS_DIR, `icon-${size}x${size}.png`);

    await sharp(SHORTCUT_ICON_SOURCE)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`  Generated: icon-${size}x${size}.png`);
  }

  for (const size of INSTALL_ICON_SIZES) {
    const installIconPath = join(PUBLIC_DIR, `pwa-${size}x${size}.png`);
    await sharp(INSTALL_ICON_SOURCE)
      .resize(size, size, { fit: 'contain' })
      .png()
      .toFile(installIconPath);
    console.log(`  Generated: pwa-${size}x${size}.png`);

    const foregroundSize = Math.round(size * MASKABLE_SAFE_ZONE);
    const inset = Math.round((size - foregroundSize) / 2);
    const foreground = await sharp(INSTALL_ICON_SOURCE)
      .resize(foregroundSize, foregroundSize, { fit: 'contain' })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: MASKABLE_BACKGROUND,
      },
    })
      .composite([{ input: foreground, top: inset, left: inset }])
      .png()
      .toFile(join(PUBLIC_DIR, `pwa-maskable-${size}x${size}.png`));

    console.log(`  Generated: pwa-maskable-${size}x${size}.png`);
  }

  console.log('Done! All icons generated successfully.');
}

generateIcons().catch(console.error);
