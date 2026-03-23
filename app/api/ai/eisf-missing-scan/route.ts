import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { createClient } from '@/lib/server';

const bodySchema = z.object({
  studyId: z.string().uuid(),
  siteId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key || key === 'sk-REPLACE_WITH_YOUR_KEY') {
    return Response.json({ error: 'OpenAI not configured' }, { status: 500 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single();
  if (!profile?.company_id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  let q = supabase
    .from('eisf_documents')
    .select('id, title, status, folder_id')
    .eq('company_id', profile.company_id)
    .eq('study_id', parsed.data.studyId)
    .eq('status', 'missing');

  if (parsed.data.siteId) {
    const { data: folders } = await supabase
      .from('eisf_site_folders')
      .select('id')
      .eq('study_site_id', parsed.data.siteId);
    const ids = (folders ?? []).map((f) => f.id);
    if (ids.length === 0) {
      return Response.json({ items: [] });
    }
    q = q.in('folder_id', ids);
  }

  const { data: missing } = await q.limit(80);

  const openai = new OpenAI({ apiKey: key });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You prioritize investigator site file gaps for monitors. JSON: {"items":[{"title":"string","risk":"low|medium|high","rationale":"one sentence"}]}. Max 12 items.',
      },
      {
        role: 'user',
        content: `Missing eISF rows (title and id):\n${JSON.stringify(missing ?? [], null, 2)}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return Response.json({ items: [] });
  try {
    const out = JSON.parse(raw) as { items?: unknown };
    return Response.json({ items: Array.isArray(out.items) ? out.items : [] });
  } catch {
    return Response.json({ items: [] });
  }
}
