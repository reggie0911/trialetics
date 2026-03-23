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

  const { data: stats } = await supabase.rpc('eisf_get_dashboard_stats', {
    p_study_id: parsed.data.studyId ?? null,
  });

  const openai = new OpenAI({ apiKey: key });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content:
          'Write a concise monitor-facing readiness brief (max 180 words) from eISF dashboard JSON. Neutral tone, no legal guarantees.',
      },
      {
        role: 'user',
        content: JSON.stringify(stats ?? {}),
      },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? '';
  return Response.json({ brief: text });
}
