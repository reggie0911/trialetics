import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { createClient } from '@/lib/server';

const bodySchema = z.object({
  draft: z.string().min(1).max(2000),
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

  const openai = new OpenAI({ apiKey: key });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Improve sponsor/CRO document request wording for clinical sites. JSON: {"title":"max 120 chars","instructions":"clear polite instructions, max 800 chars"}. No internal database field names.',
      },
      {
        role: 'user',
        content: parsed.data.draft,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return Response.json({ title: '', instructions: '' });
  try {
    return Response.json(JSON.parse(raw));
  } catch {
    return Response.json({ title: '', instructions: '' });
  }
}
