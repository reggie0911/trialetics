import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

import { createClient } from '@/lib/server';

const lineSchema = z.object({
  id: z.string(),
  amount: z.number(),
  expense_date: z.string(),
  description: z.string().nullable().optional(),
  merchant: z.string().nullable().optional(),
});

const bodySchema = z.object({
  lines: z.array(lineSchema).min(1),
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

  const { lines } = parsed.data;

  const dupPairs: { a: string; b: string; reason: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const a = lines[i];
      const b = lines[j];
      if (a.amount === b.amount && a.expense_date === b.expense_date) {
        dupPairs.push({ a: a.id, b: b.id, reason: 'Same amount and date' });
      }
    }
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
          'Review expense lines for unusual patterns. Reply JSON: {"flags":[{"lineId":"id","severity":"low|medium|high","note":"..."}]}. Max 5 flags.',
      },
      {
        role: 'user',
        content: JSON.stringify(lines),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  let llmFlags: { lineId: string; severity: string; note: string }[] = [];
  if (raw) {
    try {
      const out = JSON.parse(raw) as { flags?: { lineId: string; severity: string; note: string }[] };
      llmFlags = Array.isArray(out.flags) ? out.flags.slice(0, 5) : [];
    } catch {
      llmFlags = [];
    }
  }

  return Response.json({
    deterministicDuplicates: dupPairs,
    llmFlags,
  });
}
