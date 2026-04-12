import { NextRequest } from 'next/server';
import archiver from 'archiver';
import { Readable, PassThrough } from 'stream';

import { createClient } from '@/lib/server';
import { svgToPng } from '@/lib/brand-forge/svg-pipeline';
import { FONT_PAIRINGS } from '@/lib/brand-forge/font-pairings';
import { generateBrandGuidePdf } from '@/lib/brand-forge/pdf-generator';
import type { BFColorSwatch, BFFontPairingSelection, BFBrandKit, BFBrandDirection } from '@/lib/types/brand-forge';

export const runtime = 'nodejs';
export const maxDuration = 120;

async function downloadFromStorage(supabase: Awaited<ReturnType<typeof createClient>>, path: string): Promise<Buffer | null> {
  const { data, error } = await supabase.storage.from('brandforge-assets').download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return Response.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return Response.json({ error: 'No company' }, { status: 400 });
    }

    const { data: project } = await supabase
      .from('bf_projects')
      .select('id, name, company_id')
      .eq('id', projectId)
      .eq('company_id', profile.company_id)
      .single();

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const { data: kit } = await supabase
      .from('bf_brand_kits')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    const conceptIds = [
      kit?.primary_logo_concept_id,
      kit?.secondary_logo_concept_id,
      kit?.icon_mark_concept_id,
    ].filter(Boolean) as string[];

    let concepts: { id: string; svg_storage_path: string | null; png_storage_path: string | null }[] = [];
    if (conceptIds.length > 0) {
      const { data } = await supabase
        .from('bf_logo_concepts')
        .select('id, svg_storage_path, png_storage_path')
        .in('id', conceptIds);
      concepts = data ?? [];
    }

    const roleMap: Record<string, string> = {};
    if (kit?.primary_logo_concept_id) roleMap[kit.primary_logo_concept_id as string] = 'primary-logo';
    if (kit?.secondary_logo_concept_id) roleMap[kit.secondary_logo_concept_id as string] = 'secondary-logo';
    if (kit?.icon_mark_concept_id) roleMap[kit.icon_mark_concept_id as string] = 'icon-mark';

    const passthrough = new PassThrough();
    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(passthrough);

    const PNG_SIZES = [1024, 512, 256];
    const FAVICON_SIZES = [16, 32, 48, 180, 192];

    for (const concept of concepts) {
      const roleName = roleMap[concept.id] ?? concept.id.slice(0, 8);

      if (concept.svg_storage_path) {
        const svgBuf = await downloadFromStorage(supabase, concept.svg_storage_path);
        if (svgBuf) {
          archive.append(svgBuf, { name: `logos/${roleName}.svg` });

          for (const size of PNG_SIZES) {
            try {
              const png = await svgToPng(svgBuf.toString('utf-8'), size);
              archive.append(png, { name: `logos/${roleName}-${size}.png` });
            } catch { /* skip failed size */ }
          }

          if (roleName === 'icon-mark' || roleName === 'primary-logo') {
            for (const size of FAVICON_SIZES) {
              try {
                const png = await svgToPng(svgBuf.toString('utf-8'), size);
                const name = size === 180 ? 'apple-touch-icon-180.png'
                  : size === 192 ? 'android-chrome-192.png'
                  : `favicon-${size}.png`;
                archive.append(png, { name: `icons/${name}` });
              } catch { /* skip failed size */ }
            }
          }
        }
      }
    }

    const colorPalette = (kit?.color_palette as BFColorSwatch[]) ?? [];
    archive.append(JSON.stringify(colorPalette, null, 2), { name: 'brand-kit/color-palette.json' });

    const fontPairingId = (kit?.font_pairing as BFFontPairingSelection)?.pairing_id;
    const fontPairing = FONT_PAIRINGS.find((p) => p.id === fontPairingId);
    archive.append(JSON.stringify(fontPairing ?? {}, null, 2), { name: 'brand-kit/fonts.json' });

    const guidelines = [
      `# ${project.name} Brand Guidelines`,
      '',
      '## Brand Voice',
      kit?.brand_voice_summary ?? 'Not yet defined.',
      '',
      '## Usage Guidance',
      kit?.usage_guidance ?? 'Not yet defined.',
    ].join('\n');
    archive.append(guidelines, { name: 'brand-kit/brand-guidelines.txt' });

    archive.finalize();

    supabase.from('bf_exports').insert({
      project_id: projectId,
      brand_kit_id: kit?.id ?? null,
      export_type: 'zip',
      file_name: `brandkit-${project.name.replace(/[^a-zA-Z0-9]/g, '-')}.zip`,
    }).then(() => { /* fire-and-forget */ });

    const readableStream = Readable.toWeb(passthrough) as ReadableStream;

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="brandkit-${project.name.replace(/[^a-zA-Z0-9]/g, '-')}.zip"`,
      },
    });
  } catch (err) {
    console.error('Export route error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response('Unauthorized', { status: 401 });

    const { projectId } = await request.json();
    if (!projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 });

    const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single();
    if (!profile?.company_id) return Response.json({ error: 'No company' }, { status: 400 });

    const { data: project } = await supabase
      .from('bf_projects')
      .select('id, name, company_id')
      .eq('id', projectId)
      .eq('company_id', profile.company_id)
      .single();
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    const { data: inputs } = await supabase.from('bf_brand_inputs').select('*').eq('project_id', projectId).single();
    const { data: kit } = await supabase.from('bf_brand_kits').select('*').eq('project_id', projectId).maybeSingle();
    const { data: direction } = await supabase.from('bf_brand_directions').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(1).maybeSingle();

    const pdfBuffer = await generateBrandGuidePdf({
      studyName: project.name,
      protocolNumber: inputs?.protocol_number as string | undefined,
      sponsor: inputs?.sponsor as string | undefined,
      therapeuticArea: inputs?.therapeutic_area as string | undefined,
      brandKit: kit as unknown as BFBrandKit | null,
      brandDirection: direction as unknown as BFBrandDirection | null,
    });

    await supabase.from('bf_exports').insert({
      project_id: projectId,
      brand_kit_id: kit?.id ?? null,
      export_type: 'pdf',
      file_name: `brand-guide-${project.name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
    });

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="brand-guide-${project.name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf"`,
      },
    });
  } catch (err) {
    console.error('PDF export error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
