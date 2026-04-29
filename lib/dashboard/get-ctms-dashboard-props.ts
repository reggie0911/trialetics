import type { SupabaseClient } from '@supabase/supabase-js';

import { getDashboardStats } from '@/lib/actions/dashboard';
import { getStudies } from '@/lib/actions/studies';
import { getCtmsDashboardOverview, type CtmsDashboardOverview } from '@/lib/dashboard/ctms-dashboard-overview';
import type { DashboardStats, Study } from '@/lib/types/ctms';

export type CtmsDashboardProps = {
  firstName: string | null;
  stats: DashboardStats;
  studies: Study[];
  isAdmin: boolean;
  overview: CtmsDashboardOverview;
};

type ProfileRow = {
  id?: string | null;
  first_name: string | null;
  company_id: string;
  role: string | null;
};

/**
 * Loads stats + all studies for the CTMS home / studies dashboard. Caller must ensure the user has CTMS access.
 */
export async function getCtmsDashboardProps(
  _supabase: SupabaseClient,
  profile: ProfileRow
): Promise<CtmsDashboardProps> {
  const [stats, studies, overview] = await Promise.all([
    getDashboardStats(),
    getStudies(),
    getCtmsDashboardOverview(_supabase, profile),
  ]);

  return {
    firstName: profile.first_name,
    stats,
    studies,
    isAdmin: profile.role === 'admin',
    overview,
  };
}
