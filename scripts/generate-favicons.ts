/**
 * Re-runnable script to (re)generate all favicon raster derivatives from
 * public/favicon/favicon.svg.
 *
 * Usage:
 *   pnpm exec tsx scripts/generate-favicons.ts
 *
 * Outputs (all in public/favicon/):
 *   - favicon-96x96.png
 *   - apple-touch-icon.png            (180x180)
 *   - web-app-manifest-192x192.png
 *   - web-app-manifest-512x512.png
 *   - favicon.ico                     (multi-size: 16, 32, 48)
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const FAVICON_DIR = resolve(process.cwd(), 'public/favicon');
const SVG_PATH = resolve(FAVICON_DIR, 'favicon.svg');

const out = (name: string) => resolve(FAVICON_DIR, name);

async function main() {
  const svg = await readFile(SVG_PATH);

  // Render the SVG at a high density so downscaling stays sharp at small icon sizes.
  const png = (size: number) =>
    sharp(svg, { density: 384 })
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer();

  const targets: Array<[string, number]> = [
    ['favicon-96x96.png', 96],
    ['apple-touch-icon.png', 180],
    ['web-app-manifest-192x192.png', 192],
    ['web-app-manifest-512x512.png', 512],
  ];

  for (const [name, size] of targets) {
    const buf = await png(size);
    await writeFile(out(name), buf);
    console.log(`  [OK]  ${name.padEnd(34)} ${size}x${size}  ${buf.byteLength} bytes`);
  }

  const icoBuf = await pngToIco([await png(16), await png(32), await png(48)]);
  await writeFile(out('favicon.ico'), icoBuf);
  console.log(`  [OK]  favicon.ico                        16/32/48  ${icoBuf.byteLength} bytes`);

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
