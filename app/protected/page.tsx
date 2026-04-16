import { redirect } from 'next/navigation';
import { createClient } from '@/lib/server';
import { getCtmsDashboardProps } from '@/lib/dashboard/get-ctms-dashboard-props';
import { DashboardContent } from '@/components/ctms/dashboard-content';
import {
  ModulesDashboardContent,
  type ModulesDashboardCustomItem,
} from '@/components/ctms/modules-dashboard-content';

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, company_id, role')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (!profile?.company_id) {
    redirect('/auth/login');
  }

  const { data: company } = await supabase
    .from('companies')
    .select('has_ctms_access, has_tracker_access, has_etmf_access, has_eisf_access, enabled_study_tracker_keys')
    .eq('id', profile.company_id)
    .maybeSingle();

  const hasCtmsAccess = company?.has_ctms_access !== false;
  const hasTrackerAccess = company?.has_tracker_access === true;
  const hasEtmfAccess = company?.has_etmf_access === true;
  const hasEisfAccess = company?.has_eisf_access === true;
  const studyTrackerMenuKeys =
    hasTrackerAccess
      ? ((company?.enabled_study_tracker_keys as string[] | null | undefined) ?? [])
      : [];

  let customTrackers: ModulesDashboardCustomItem[] = [];
  if (hasTrackerAccess) {
    const { data: defs } = await supabase
      .from('custom_tracker_definitions')
      .select('id, name, slug')
      .eq('company_id', profile.company_id)
      .eq('platform_access_enabled', true)
      .order('name');
    customTrackers = (defs as ModulesDashboardCustomItem[]) ?? [];
  }

  if (!hasCtmsAccess) {
    return (
      <div data-onboarding="page-dashboard" className="contents">
        <ModulesDashboardContent
          firstName={profile.first_name}
          hasEtmfAccess={hasEtmfAccess}
          hasEisfAccess={hasEisfAccess}
          studyTrackerMenuKeys={studyTrackerMenuKeys}
          customTrackers={customTrackers}
        />
      </div>
    );
  }

  const dashboardProps = await getCtmsDashboardProps(supabase, profile);

  return (
    <div data-onboarding="page-dashboard" className="contents">
      <DashboardContent {...dashboardProps} />
    </div>
  );
}
