import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { createClient } from '@/lib/server';

const bodySchema = z.object({
  fileName: z.string().min(1).max(500),
  hint: z.string().max(2000).optional(),
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

  const { data: cats } = await supabase
    .from('eisf_document_categories')
    .select('id, name')
    .eq('company_id', profile.company_id)
    .order('name')
    .limit(40);

  const openai = new OpenAI({ apiKey: key });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Pick the best document category id from the list for an uploaded investigator-site file. JSON: {"category_id":"uuid|null","confidence":"low|medium|high","title_suggestion":"short human title"}. If unsure, category_id null.',
      },
      {
        role: 'user',
        content: `File name: ${parsed.data.fileName}\nHint: ${parsed.data.hint ?? 'none'}\nCategories:\n${JSON.stringify(cats ?? [])}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return Response.json({ category_id: null, confidence: 'low', title_suggestion: '' });
  try {
    return Response.json(JSON.parse(raw));
  } catch {
    return Response.json({ category_id: null, confidence: 'low', title_suggestion: '' });
  }
}
