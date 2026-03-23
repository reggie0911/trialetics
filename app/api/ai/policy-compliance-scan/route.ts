import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

import { createClient } from '@/lib/server';

const bodySchema = z.object({
  policyNotes: z.string().max(8000).optional(),
  context: z.string().min(1).max(12000),
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

  const { policyNotes, context } = parsed.data;
  const openai = new OpenAI({ apiKey: key });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Flag possible policy issues for time/expense drafts. JSON: {"warnings":[{"severity":"low|medium|high","message":"..."}]}. Max 8 warnings. Non-binding hints only.',
      },
      {
        role: 'user',
        content: `Organization policy (may be empty):\n${policyNotes ?? 'None provided.'}\n\nDraft data:\n${context}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return Response.json({ warnings: [] });
  try {
    const out = JSON.parse(raw) as { warnings?: { severity: string; message: string }[] };
    return Response.json({ warnings: Array.isArray(out.warnings) ? out.warnings.slice(0, 8) : [] });
  } catch {
    return Response.json({ warnings: [] });
  }
}
