'use server';

import { recordTelemetry } from '@/lib/copilot/telemetry';
import { loadFinanceReadContext } from '@/lib/finance-module/permissions';
import { createClient } from '@/lib/server';
import { z } from 'zod';

const recordSchema = z.object({
  studyId: z.string().uuid(),
  tableKey: z.string().min(1).max(120),
  action: z.string().min(1).max(120),
  entityType: z.string().min(1).max(120),
});

/**
 * Product analytics for finance table row menus (`fm.row_action` in `copilot_telemetry`).
 * Best-effort — failures are swallowed so UX is never blocked.
 */
export async function recordFmRowActionTelemetry(
  input: z.infer<typeof recordSchema>,
): Promise<{ ok: boolean }> {
  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { ok: false };

  const { context, error } = await loadFinanceReadContext(parsed.data.studyId);
  if (!context || error) return { ok: false };

  await recordTelemetry(context.supabase, {
    userId: user.id,
    companyId: context.companyId,
    eventName: 'fm.row_action',
    module: 'finance_module',
    metadata: {
      study_id: parsed.data.studyId,
      table_key: parsed.data.tableKey,
      action: parsed.data.action,
      entity_type: parsed.data.entityType,
    },
  });

  return { ok: true };
}

export interface FmRowActionAdoptionRow {
  table_key: string;
  action: string;
  count: number;
}

/**
 * Aggregated `fm.row_action` events for adoption review (company admins can read telemetry per RLS).
 */
export async function queryFmRowActionAdoptionSummary(
  days = 30,
): Promise<{ data: FmRowActionAdoptionRow[]; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { data: [], error: 'Unauthorized' };

  const since = new Date();
  since.setDate(since.getDate() - Math.max(1, Math.min(days, 365)));

  const { data, error } = await supabase
    .from('copilot_telemetry')
    .select('metadata')
    .eq('event_name', 'fm.row_action')
    .gte('created_at', since.toISOString())
    .limit(5000);

  if (error) return { data: [], error: error.message };

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const meta = row.metadata as Record<string, unknown> | null;
    const tk = typeof meta?.table_key === 'string' ? meta.table_key : '';
    const act = typeof meta?.action === 'string' ? meta.action : '';
    if (!tk || !act) continue;
    const k = `${tk}::${act}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const rows: FmRowActionAdoptionRow[] = [...counts.entries()]
    .map(([k, count]) => {
      const [table_key, action] = k.split('::');
      return { table_key, action, count };
    })
    .sort((a, b) => b.count - a.count);

  return { data: rows, error: null };
}
