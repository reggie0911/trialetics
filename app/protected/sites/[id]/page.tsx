import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/server';
import { getSiteById } from '@/lib/actions/sites';
import { getStudyById } from '@/lib/actions/studies';
import { getSubjectCountBySite } from '@/lib/actions/subjects';
import { getTasksBySite } from '@/lib/actions/tasks';
import { listDirectoryContacts } from '@/lib/actions/directory-contacts';
import { SiteDetailTabs } from '@/components/ctms/sites/site-detail-tabs';
import { getSiteBudgetForSite } from '@/lib/actions/finance-site-budgets';
import { listFinanceInvoicesForSite } from '@/lib/actions/finance-invoices';
import { getStudySchedules } from '@/lib/actions/financials';

interface SiteDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SiteDetailPage({ params }: SiteDetailPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const site = await getSiteById(id);
  if (!site) notFound();

  const [study, enrolledCount, siteTasks, dirContactsRes, siteBudget, siteFinanceInvoices, studySchedules] =
    await Promise.all([
      getStudyById(site.study_id),
      getSubjectCountBySite(id),
      getTasksBySite(id),
      listDirectoryContacts({ limit: 100 }),
      getSiteBudgetForSite(site.study_id, site.id).catch(() => null),
      listFinanceInvoicesForSite(site.id).catch(() => []),
      getStudySchedules(site.study_id).catch(() => []),
    ]);
  const sitePaymentSchedules = studySchedules.filter((s) => s.site_id === site.id);
  if (!study) notFound();

  const directoryContactOptions = (dirContactsRes.data ?? []).map((c) => ({
    id: c.id,
    label:
      [c.first_name, c.last_name].filter(Boolean).join(' ').trim() ||
      c.email ||
      'Unnamed contact',
  }));

  return (
    <div className="p-6">
      <SiteDetailTabs
        site={site}
        study={{
          id: study.id,
          title: study.title,
          protocol_number: study.protocol_number,
        }}
        isAdmin={profile?.role === 'admin'}
        enrolledCount={enrolledCount}
        siteTasks={siteTasks}
        directoryContactOptions={directoryContactOptions}
        siteBudget={siteBudget}
        siteFinanceInvoices={siteFinanceInvoices}
        sitePaymentSchedules={sitePaymentSchedules}
      />
    </div>
  );
}
