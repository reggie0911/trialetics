import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { createClient } from '@/lib/server';

const bodySchema = z.object({
  studyId: z.string().uuid().optional(),
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
    .select('id, title, expires_on, status')
    .eq('company_id', profile.company_id)
    .not('expires_on', 'is', null)
    .order('expires_on', { ascending: true })
    .limit(60);

  if (parsed.data.studyId) q = q.eq('study_id', parsed.data.studyId);

  const { data: rows } = await q;

  const openai = new OpenAI({ apiKey: key });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Summarize renewal risk for site documents with expiration dates. JSON: {"items":[{"title":"string","expires_on":"string","risk":"low|medium|high","suggestion":"short"}]}. Max 15.',
      },
      {
        role: 'user',
        content: JSON.stringify(rows ?? []),
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
