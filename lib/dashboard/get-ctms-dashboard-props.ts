import type { SupabaseClient } from '@supabase/supabase-js';

import { getDashboardStats } from '@/lib/actions/dashboard';
import { getStudies } from '@/lib/actions/studies';
import type { DashboardStats, Study } from '@/lib/types/ctms';

export type CtmsDashboardProps = {
  firstName: string | null;
  stats: DashboardStats;
  studies: Study[];
  isAdmin: boolean;
};

type ProfileRow = {
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
  const [stats, studies] = await Promise.all([getDashboardStats(), getStudies()]);

  return {
    firstName: profile.first_name,
    stats,
    studies,
    isAdmin: profile.role === 'admin',
  };
}
