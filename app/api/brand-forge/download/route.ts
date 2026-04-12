import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import { svgToPng } from '@/lib/brand-forge/svg-pipeline';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return Response.json({ error: 'No company found' }, { status: 400 });
    }

    const conceptId = request.nextUrl.searchParams.get('conceptId');
    const format = request.nextUrl.searchParams.get('format') ?? 'svg';
    const size = parseInt(request.nextUrl.searchParams.get('size') ?? '512', 10);

    if (!conceptId) {
      return Response.json({ error: 'Missing conceptId' }, { status: 400 });
    }

    const { data: concept } = await supabase
      .from('bf_logo_concepts')
      .select('svg_storage_path, png_storage_path, bf_projects!inner(company_id)')
      .eq('id', conceptId)
      .single();

    if (
      !concept ||
      (concept as typeof concept & { bf_projects: { company_id: string } }).bf_projects.company_id !==
        profile.company_id
    ) {
      return Response.json({ error: 'Concept not found' }, { status: 404 });
    }

    const svgPath = concept.svg_storage_path as string | null;
    const pngPath = concept.png_storage_path as string | null;

    // ---- SVG download ----
    if (format === 'svg') {
      if (!svgPath) {
        return Response.json({ error: 'No vector file available for this concept' }, { status: 400 });
      }
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('brandforge-assets')
        .download(svgPath);
      if (downloadError || !fileData) {
        return Response.json({ error: 'SVG file could not be loaded' }, { status: 404 });
      }
      const svgBuffer = Buffer.from(await fileData.arrayBuffer());
      return new Response(new Uint8Array(svgBuffer), {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': `attachment; filename="concept-${conceptId.slice(0, 8)}.svg"`,
        },
      });
    }

    // ---- PNG download ----
    // 1. Prefer stored raster (post-processed BG/HD/B&W result)
    if (pngPath) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('brandforge-assets')
        .download(pngPath);
      if (!downloadError && fileData) {
        const pngBuffer = Buffer.from(await fileData.arrayBuffer());
        return new Response(new Uint8Array(pngBuffer), {
          headers: {
            'Content-Type': 'image/png',
            'Content-Disposition': `attachment; filename="concept-${conceptId.slice(0, 8)}.png"`,
          },
        });
      }
    }

    // 2. Fallback: rasterise from SVG at requested size
    if (svgPath) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('brandforge-assets')
        .download(svgPath);
      if (downloadError || !fileData) {
        return Response.json({ error: 'Image file could not be loaded' }, { status: 404 });
      }
      const svgBuffer = Buffer.from(await fileData.arrayBuffer());
      const pngBuffer = await svgToPng(svgBuffer.toString('utf-8'), size);
      return new Response(new Uint8Array(pngBuffer), {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="concept-${conceptId.slice(0, 8)}-${size}.png"`,
        },
      });
    }

    return Response.json({ error: 'No downloadable image is available for this concept' }, { status: 404 });
  } catch (err) {
    console.error('[brand-forge/download] error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
