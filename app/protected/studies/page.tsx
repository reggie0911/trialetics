import { redirect } from 'next/navigation';

import { createClient } from '@/lib/server';
import { getCtmsDashboardProps } from '@/lib/dashboard/get-ctms-dashboard-props';
import { DashboardContent } from '@/components/ctms/dashboard-content';

interface StudiesPageProps {
  searchParams: Promise<{ studyRequired?: string }>;
}

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

  const sp = await searchParams;
  const studySelectionHint =
    sp.studyRequired === '1' || sp.studyRequired === 'true' || sp.studyRequired === 'yes';

  const dashboardProps = await getCtmsDashboardProps(supabase, profile);

  return (
    <div data-onboarding="page-studies" className="contents">
      <DashboardContent {...dashboardProps} studySelectionHint={studySelectionHint} />
    </div>
  );
}
