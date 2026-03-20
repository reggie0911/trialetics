'use server';

import { createClient } from '@/lib/server';
import { getPlatformAdminContext } from '@/lib/actions/platform-module-access';
import {
  parsePlatformBusinessAnalytics,
  type PlatformBusinessAnalyticsDTO,
} from '@/lib/types/platform-analytics';

export type { PlatformBusinessAnalyticsDTO } from '@/lib/types/platform-analytics';

const RANGE_MIN = 1;
const RANGE_MAX = 730;

function clampRangeDays(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw)) return 90;
  return Math.min(RANGE_MAX, Math.max(RANGE_MIN, Math.floor(raw)));
}

export async function getPlatformBusinessAnalytics(
  days?: number
): Promise<{ success: boolean; data?: PlatformBusinessAnalyticsDTO; error?: string }> {
  const gate = await getPlatformAdminContext();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const p_days = clampRangeDays(days);
  const { data, error } = await supabase.rpc('platform_business_analytics', { p_days });
  if (error) return { success: false, error: error.message };

  const parsed = parsePlatformBusinessAnalytics(data);
  if (!parsed) return { success: false, error: 'Invalid analytics response' };
  return { success: true, data: parsed };
}
