import { NextRequest } from 'next/server';
import archiver from 'archiver';
import { Readable, PassThrough } from 'stream';

import { createClient } from '@/lib/server';
import { MOCKUP_TYPES } from '@/lib/types/brand-forge';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response('Unauthorized', { status: 401 });

    const projectId = request.nextUrl.searchParams.get('projectId');
    const favOnly = request.nextUrl.searchParams.get('favorites') === '1';

    if (!projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();
    if (!profile?.company_id) return Response.json({ error: 'No company' }, { status: 400 });

    const { data: project } = await supabase
      .from('bf_projects')
      .select('id, name')
      .eq('id', projectId)
      .eq('company_id', profile.company_id)
      .single();
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    let query = supabase
      .from('bf_mockups')
      .select('id, mockup_type, storage_path, prompt, custom_hint, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (favOnly) query = query.eq('is_favorite', true);

    const { data: rows } = await query;
    if (!rows || rows.length === 0) {
      return Response.json({ error: 'No mockups to export' }, { status: 404 });
    }

    const passthrough = new PassThrough();
    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(passthrough);

    const typeCounters: Record<string, number> = {};
    const promptLines: string[] = [
      `Project: ${project.name}`,
      'This file lists the image prompt and additional notes saved for each mockup in this ZIP.',
      '',
    ];

    for (const row of rows) {
      if (!row.storage_path) continue;
      const { data: blob, error } = await supabase.storage
        .from('brandforge-assets')
        .download(row.storage_path as string);
      if (error || !blob) continue;

      const typeId = row.mockup_type as string;
      const cfg = MOCKUP_TYPES.find((t) => t.id === typeId);
      const label = cfg?.label ?? typeId;
      const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      typeCounters[typeId] = (typeCounters[typeId] ?? 0) + 1;
      const suffix = typeCounters[typeId] > 1 ? `-${typeCounters[typeId]}` : '';

      const buffer = Buffer.from(await blob.arrayBuffer());
      archive.append(buffer, { name: `mockups/${slug}${suffix}.png` });

      const created = row.created_at ? new Date(row.created_at as string).toLocaleString() : '';
      promptLines.push(`--- ${label}${suffix ? ` (${typeCounters[typeId]})` : ''} — ${created}`);
      promptLines.push(
        (row.prompt as string | null)?.trim()
          ? `Image prompt:\n${String(row.prompt).trim()}`
          : 'Image prompt: (none saved)',
      );
      promptLines.push(
        (row.custom_hint as string | null)?.trim()
          ? `Additional notes:\n${String(row.custom_hint).trim()}`
          : 'Additional notes: (none)',
      );
      promptLines.push('');
    }

    archive.append(Buffer.from(promptLines.join('\n'), 'utf8'), {
      name: 'mockups/prompts-and-notes.txt',
    });

    archive.finalize();

    const readableStream = Readable.toWeb(passthrough) as ReadableStream;
    const safeName = project.name.replace(/[^a-zA-Z0-9]/g, '-');

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="mockups-${safeName}.zip"`,
      },
    });
  } catch (err) {
    console.error('Mockup export error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
