import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('PWA install assets', () => {
  it('uses the branded install icons in the public manifest', () => {
    const manifestPath = resolve(import.meta.dirname, '../../public/manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
      icons: Array<{ src: string; purpose: string }>;
    };

    expect(manifest.icons).toEqual([
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ]);
  });

  it('keeps the Vite PWA manifest aligned with the public install assets', () => {
    const viteConfigPath = resolve(import.meta.dirname, '../../vite.config.ts');
    const viteConfig = readFileSync(viteConfigPath, 'utf-8');

    expect(viteConfig).toContain("src: '/pwa-192x192.png'");
    expect(viteConfig).toContain("src: '/pwa-512x512.png'");
    expect(viteConfig).toContain("src: '/pwa-maskable-192x192.png'");
    expect(viteConfig).toContain("src: '/pwa-maskable-512x512.png'");
    expect(viteConfig).not.toContain("src: '/icons/icon-192x192.png'");
    expect(viteConfig).not.toContain("src: '/icons/icon-512x512.png'");
  });

  it('uses the ICO favicon instead of the outdated SVG favicon', () => {
    const htmlPath = resolve(import.meta.dirname, '../../index.html');
    const html = readFileSync(htmlPath, 'utf-8');

    expect(html).toContain('<link rel="icon" href="/favicon.ico" sizes="any" />');
    expect(html).not.toContain('/icons/icon.svg');
  });
});
