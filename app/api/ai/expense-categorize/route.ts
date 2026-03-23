import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

import { createClient } from '@/lib/server';

const bodySchema = z.object({
  description: z.string().min(1),
  merchant: z.string().optional().nullable(),
  categories: z.array(z.object({ id: z.string().min(1), label: z.string() })).min(1),
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
    return Response.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }

  const { description, merchant, categories } = parsed.data;
  const openai = new OpenAI({ apiKey: key });

  const list = categories.map((c) => `- ${c.id}: ${c.label}`).join('\n');
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Pick the single best expense category id for the transaction. Reply as JSON: {"categoryId":"<uuid>","confidence":0-1,"rationale":"short"}. Only use ids from the list.',
      },
      {
        role: 'user',
        content: `Description: ${description}\nMerchant: ${merchant ?? 'n/a'}\nCategories:\n${list}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return Response.json({ error: 'No response' }, { status: 500 });

  try {
    const out = JSON.parse(raw) as { categoryId?: string; confidence?: number; rationale?: string };
    const valid = categories.some((c) => c.id === out.categoryId);
    if (!valid) return Response.json({ error: 'Invalid suggestion' }, { status: 500 });
    return Response.json({
      categoryId: out.categoryId,
      confidence: out.confidence ?? null,
      rationale: out.rationale ?? null,
    });
  } catch {
    return Response.json({ error: 'Parse error' }, { status: 500 });
  }
}
