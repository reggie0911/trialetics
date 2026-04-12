import type { SupabaseClient } from '@supabase/supabase-js';

import type { BFLogoConcept } from '@/lib/types/brand-forge';

const DEFAULT_SIGNED_TTL_SEC = 60 * 60 * 24;

/**
 * Attach a fresh signed Storage URL for gallery previews. Prefer PNG when present (raster thumbnails),
 * else SVG (native-svg models never had a PNG). Re-signing on each load avoids broken previews when DB
 * `thumbnail_url` is null or an expired signed URL.
 */
export async function withFreshConceptThumbnails(
  supabase: SupabaseClient,
  concepts: BFLogoConcept[],
  signedSeconds: number = DEFAULT_SIGNED_TTL_SEC,
): Promise<BFLogoConcept[]> {
  return Promise.all(
    concepts.map(async (c) => {
      const path = c.png_storage_path ?? c.svg_storage_path;
      if (!path) return c;
      const { data, error } = await supabase.storage
        .from('brandforge-assets')
        .createSignedUrl(path, signedSeconds);
      if (error || !data?.signedUrl) return c;
      return { ...c, thumbnail_url: data.signedUrl };
    }),
  );
}
