import { redirect } from 'next/navigation';

import { createClient } from '@/lib/server';
import { getDashboardStats } from '@/lib/actions/dashboard';
import { getAdminOverviewProps } from '@/lib/dashboard/get-admin-overview-props';
import { AdminOverviewShell } from '@/components/ctms/admin-overview/admin-overview-shell';

interface StudiesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Admin-only **System overview** (`AdminOverviewShell`): org KPIs, templates, users.
 * Non-admins are redirected to the org-wide studies catalog (`/protected/studies/catalog`).
 * Legacy `?view=user` bookmarks redirect to the catalog so deep links survive older IA.
 */
export default async function StudiesPage({ searchParams }: StudiesPageProps) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, company_id, role')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (!profile?.company_id) {
    redirect('/auth/login');
  }

  const { data: company } = await supabase
    .from('companies')
    .select('has_ctms_access')
    .eq('id', profile.company_id)
    .maybeSingle();

  if (company?.has_ctms_access === false) {
    redirect('/protected');
  }

  const params = await searchParams;
  const requestedView = typeof params.view === 'string' ? params.view : undefined;
  if (requestedView === 'user') {
    redirect('/protected/studies/catalog');
  }

  if (profile.role !== 'admin') {
    redirect('/protected/studies/catalog');
  }

  const [stats, overview] = await Promise.all([
    getDashboardStats(),
    getAdminOverviewProps(supabase, profile),
  ]);

  return (
    <AdminOverviewShell
      firstName={profile.first_name}
      stats={stats}
      overview={overview}
    />
  );
}
