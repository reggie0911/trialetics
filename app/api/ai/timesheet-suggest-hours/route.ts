import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

import { createClient } from '@/lib/server';

const bodySchema = z.object({
  workDate: z.string(),
  activityLabel: z.string(),
  studyTitle: z.string(),
  recentSameContext: z.array(z.number()).max(20).optional(),
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

  const { workDate, activityLabel, studyTitle, recentSameContext } = parsed.data;
  const median =
    recentSameContext && recentSameContext.length > 0
      ? [...recentSameContext].sort((a, b) => a - b)[Math.floor(recentSameContext.length / 2)]
      : null;

  const openai = new OpenAI({ apiKey: key });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Suggest typical hours (0-24, step 0.25) for a clinical ops timesheet line. JSON only: {"suggestedHours": number, "note": "short"}. This is a hint only.',
      },
      {
        role: 'user',
        content: `Date: ${workDate}\nStudy: ${studyTitle}\nActivity: ${activityLabel}\nHistorical hours same context: ${JSON.stringify(recentSameContext ?? [])}\nMedian heuristic: ${median ?? 'n/a'}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return Response.json({ error: 'No response' }, { status: 500 });
  try {
    const out = JSON.parse(raw) as { suggestedHours?: number; note?: string };
    const h = Number(out.suggestedHours);
    if (!Number.isFinite(h) || h < 0 || h > 24) {
      return Response.json({ suggestedHours: median ?? 0, note: 'Fallback to median or zero', heuristicMedian: median });
    }
    return Response.json({ suggestedHours: h, note: out.note ?? null, heuristicMedian: median });
  } catch {
    return Response.json({ error: 'Parse error' }, { status: 500 });
  }
}
