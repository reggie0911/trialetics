import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

import type { EcrfPdfLogo } from '@/lib/exporters/ecrf-pdf';

/**
 * Default Trialetics logo used when a company has not uploaded its own.
 * Lives in the Next.js `public/` folder, but we read it from disk because the
 * PDF route runs in Node and cannot rely on the Next.js HTTP layer.
 */
const DEFAULT_LOGO_PATH = path.join(
  process.cwd(),
  'public',
  'Trialetics_Logo_Black.svg'
);

/**
 * Convert any source bytes (SVG, PNG, JPG, WebP, ...) into a PNG buffer that
 * `@react-pdf/renderer` `<Image>` can render reliably. We render at 2x the
 * display size so the logo stays crisp on print.
 */
async function toPng(input: Buffer): Promise<Buffer> {
  return await sharp(input, { density: 300 })
    .resize({
      width: 280,
      height: 70,
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function fetchLogoBytes(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

async function loadDefaultLogoBytes(): Promise<Buffer | null> {
  try {
    return await fs.readFile(DEFAULT_LOGO_PATH);
  } catch {
    return null;
  }
}

/**
 * Resolve the header logo for the eCRF PDF. Tries the company logo first;
 * silently falls back to the default Trialetics logo on any error or when no
 * company logo is configured. Returns `null` only if both sources fail (the
 * PDF still renders without a logo in that case).
 */
export async function resolveEcrfPdfLogo(
  companyLogoUrl: string | null | undefined
): Promise<EcrfPdfLogo | null> {
  if (companyLogoUrl) {
    const bytes = await fetchLogoBytes(companyLogoUrl);
    if (bytes) {
      try {
        const png = await toPng(bytes);
        return { data: png, format: 'png' };
      } catch {
        // fall through to the default logo
      }
    }
  }

  const defaultBytes = await loadDefaultLogoBytes();
  if (!defaultBytes) return null;
  try {
    const png = await toPng(defaultBytes);
    return { data: png, format: 'png' };
  } catch {
    return null;
  }
}
