import { optimize } from 'svgo';
import sharp from 'sharp';

/**
 * Detect whether a buffer is an SVG (text/XML starting with <svg or <?xml)
 * or a raster image.
 */
export function isSvgBuffer(buf: Buffer): boolean {
  const head = buf.subarray(0, 256).toString('utf-8').trim();
  return head.startsWith('<svg') || head.startsWith('<?xml');
}

/**
 * Clean / normalize an SVG string using SVGO.
 */
export function cleanSvg(svgString: string): string {
  const result = optimize(svgString, {
    multipass: true,
    plugins: [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { name: 'preset-default', params: { overrides: { removeViewBox: false } } } as any,
      { name: 'removeDimensions' },
    ],
  });
  return result.data;
}

/**
 * Wrap a raster PNG buffer in an SVG <image> element (base64 embedded).
 * Produces a valid SVG that renders the image at the original resolution.
 * This avoids native module issues with potrace under Turbopack.
 */
export async function rasterToEmbeddedSvg(pngBuffer: Buffer): Promise<string> {
  const { width, height } = await sharp(pngBuffer).metadata();
  const w = width ?? 512;
  const h = height ?? 512;
  const b64 = pngBuffer.toString('base64');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`,
    `     width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    `  <image x="0" y="0" width="${w}" height="${h}"`,
    `         xlink:href="data:image/png;base64,${b64}" />`,
    `</svg>`,
  ].join('\n');
}

/**
 * Rasterize an SVG string to a PNG buffer at the given size.
 */
export async function svgToPng(svgString: string, size: number): Promise<Buffer> {
  return sharp(Buffer.from(svgString))
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();
}

export interface PipelineResult {
  svgString: string;
  pngThumbnail: Buffer;
  source: 'native-svg' | 'embedded-raster';
}

/**
 * Run the full pipeline:
 * - Native SVG: clean with SVGO, render thumbnail via sharp.
 * - Raster PNG: embed as <image> inside SVG, use a sharp-resized PNG for thumbnail.
 */
/** Render size for stored PNG thumbnails. 1024 px gives Flux Kontext a crisp reference. */
const PNG_THUMBNAIL_SIZE = 1024;

export async function processGeneratedAsset(rawBuffer: Buffer): Promise<PipelineResult> {
  if (isSvgBuffer(rawBuffer)) {
    const svgString = cleanSvg(rawBuffer.toString('utf-8'));
    const pngThumbnail = await svgToPng(svgString, PNG_THUMBNAIL_SIZE);
    return { svgString, pngThumbnail, source: 'native-svg' };
  }

  const svgString = await rasterToEmbeddedSvg(rawBuffer);
  const pngThumbnail = await sharp(rawBuffer)
    .resize(PNG_THUMBNAIL_SIZE, PNG_THUMBNAIL_SIZE, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();

  return { svgString, pngThumbnail, source: 'embedded-raster' };
}
