import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/server';
import { getCtmsDashboardProps } from '@/lib/dashboard/get-ctms-dashboard-props';
import { StudiesTableCard } from '@/components/ctms/studies/studies-table-card';

/**
 * Org-wide **Studies** catalog: full study table and filters for all CTMS users.
 * Admins also reach **System overview** from `/protected/studies`; this route stays
 * the canonical bookmark for the shared table (not mixed with the admin shell).
 */
export default async function StudiesCatalogPage() {
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

  const dashboardProps = await getCtmsDashboardProps(supabase, profile);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="space-y-4 pl-4">
        {dashboardProps.isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            render={
              <Link href="/protected/studies" aria-label="Back to system overview" />
            }
            nativeButton={false}
            className="-ml-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            System overview
          </Button>
        )}
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Studies</h1>
          <p className="text-sm text-muted-foreground">
            All clinical studies across your organization.
          </p>
        </header>
      </div>
      <StudiesTableCard
        studies={dashboardProps.studies}
        stats={dashboardProps.stats}
        isAdmin={dashboardProps.isAdmin}
      />
    </div>
  );
}
