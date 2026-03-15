'use server';

import { createClient } from '@/lib/server';
import type { DashboardStats } from '@/lib/types/ctms';

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const [studiesResult, sitesResult] = await Promise.all([
    supabase.from('studies').select('id, status'),
    supabase.from('study_sites').select('id, status'),
  ]);

  const studies = studiesResult.data ?? [];
  const sites = sitesResult.data ?? [];

  return {
    totalStudies: studies.length,
    activeStudies: studies.filter(s => s.status === 'active').length,
    totalSites: sites.length,
    activeSites: sites.filter(s => ['activated', 'enrolling'].includes(s.status)).length,
    enrollingSites: sites.filter(s => s.status === 'enrolling').length,
  };
}
