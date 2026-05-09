import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

import { createClient } from '@/lib/server';
import { buildFinanceAiContext } from '@/lib/finance-module/ai-context';
import { writeFinanceAuditLog } from '@/lib/finance-module/audit';
import { loadFinanceReadContext } from '@/lib/finance-module/permissions';

const bodySchema = z.object({
  studyId: z.string().uuid(),
  scope: z
    .enum([
      'dashboard',
      'budget',
      'invoices',
      'purchase_orders',
      'site_payments',
      'vendors',
      'forecast',
      'approvals',
    ])
    .default('dashboard'),
  /** When true, bypass the 1h result cache (still subject to token budget + cooldown). */
  forceRefresh: z.boolean().optional(),
});

const SCOPE_DIRECTIVES: Record<z.infer<typeof bodySchema>['scope'], string> = {
  dashboard:
    'Summarize study-level finance health: budget vs actual, key risks, and 1-2 concrete actions.',
  budget:
    'Explain budget variance drivers across categories. Cite category names and amounts from the data.',
  invoices:
    'Highlight invoice anomalies: overdue, aging, disputed, or unusually large invoices.',
  purchase_orders:
    'Highlight PO commitments approaching full utilization or expiration. Mention vendor counts and balances.',
  site_payments:
    'Summarize site payment status: scheduled, paid, on hold. Call out delayed milestones.',
  vendors:
    'Summarize vendor spend health, vendors at risk, and concentration of spend.',
  forecast:
    'Provide a narrative summary of the forecast: projected total, variance vs approved, overrun probability, and the strongest driver.',
  approvals:
    'Summarize the approval queue: total pending, overdue, due today, and one suggested next action. Never recommend auto-approval.',
};

const CACHE_MS = 60 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;
const DAILY_TOKEN_CAP = 80_000;

type CacheEntry = { expiresAt: number; insight: string; generatedAtIso: string };
const resultCache = new Map<string, CacheEntry>();
const lastHardRefresh = new Map<string, number>();
/** Per-study UTC-day token totals (process memory; resets on cold start). */
const dailyTokensByStudy = new Map<string, { day: string; used: number }>();

function cacheKey(studyId: string, scope: string) {
  return `${studyId}::${scope}`;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

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

  const { studyId, scope, forceRefresh } = parsed.data;
  const ck = cacheKey(studyId, scope);
  const now = Date.now();
  const cooldownKey = `${user.id}::${ck}`;

  const { context: financeContext, error: ctxError } = await loadFinanceReadContext(studyId);
  if (!financeContext) {
    return Response.json(
      { error: ctxError ?? 'Finance workspace not accessible.' },
      { status: 403 },
    );
  }

  const cached = resultCache.get(ck);
  if (!forceRefresh && cached && cached.expiresAt > now) {
    return Response.json({
      insight: cached.insight,
      scope,
      cached: true as const,
      generatedAt: cached.generatedAtIso,
      nextRefreshAllowedAt: new Date(cached.expiresAt).toISOString(),
    });
  }

  if (forceRefresh) {
    const last = lastHardRefresh.get(cooldownKey) ?? 0;
    if (now - last < COOLDOWN_MS) {
      const retryAfterSec = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
      return Response.json(
        {
          error: `Please wait ${retryAfterSec}s before forcing another refresh.`,
          retryAfterSec,
        },
        { status: 429 },
      );
    }
  }

  const dKey = studyId;
  const today = todayUtc();
  let bucket = dailyTokensByStudy.get(dKey);
  if (!bucket || bucket.day !== today) {
    bucket = { day: today, used: 0 };
    dailyTokensByStudy.set(dKey, bucket);
  }
  if (bucket.used >= DAILY_TOKEN_CAP) {
    return Response.json(
      {
        error: 'Daily AI token budget reached for this study. Try again tomorrow or contact an admin.',
        tokensUsed: bucket.used,
        cap: DAILY_TOKEN_CAP,
      },
      { status: 429 },
    );
  }

  const { context, error } = await buildFinanceAiContext(studyId);
  if (!context) {
    return Response.json(
      { error: error ?? 'Unable to build AI context for this study.' },
      { status: 422 },
    );
  }

  const openai = new OpenAI({ apiKey: key });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: [
          'You are the Trialetics Finance Module assistant.',
          'Use only the JSON context provided.',
          'Never modify financial records, approve, or commit funds.',
          'Cite source object types and totals in plain language.',
          'Always note that insights are advisory only.',
          'Limit responses to 180 words.',
        ].join(' '),
      },
      {
        role: 'user',
        content: JSON.stringify({
          scope,
          directive: SCOPE_DIRECTIVES[scope],
          context,
        }),
      },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? '';
  const totalTokens = completion.usage?.total_tokens ?? 0;
  bucket.used += totalTokens;

  const generatedAtIso = new Date().toISOString();
  resultCache.set(ck, { expiresAt: now + CACHE_MS, insight: text, generatedAtIso });
  if (forceRefresh) {
    lastHardRefresh.set(cooldownKey, now);
  }

  await writeFinanceAuditLog(financeContext.supabase, {
    studyId: financeContext.studyId,
    companyId: financeContext.companyId,
    actorUserId: financeContext.userId,
    entityType: 'fm_ai_insight',
    entityId: studyId,
    action: 'generate_ai_insight',
    payload: {
      scope,
      generated_at: generatedAtIso,
      model: 'gpt-4o-mini',
      tokens: totalTokens,
      force_refresh: Boolean(forceRefresh),
    },
  });

  return Response.json({
    insight: text,
    scope,
    cached: false as const,
    generatedAt: generatedAtIso,
    tokensUsed: bucket.used,
    cap: DAILY_TOKEN_CAP,
    nextRefreshAllowedAt: new Date(now + CACHE_MS).toISOString(),
  });
}
