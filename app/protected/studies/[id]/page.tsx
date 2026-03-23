import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/server';
import { getStudyById, getStudyCounts } from '@/lib/actions/studies';
import { getStudyCountries } from '@/lib/actions/countries';
import { getStudySites } from '@/lib/actions/sites';
import { getStudySubjects, getEnrollmentFunnel } from '@/lib/actions/subjects';
import { getStudyTeamMembers, getTeamRoles } from '@/lib/actions/team';
import { getStudyVisits } from '@/lib/actions/visits';
import { getStudyBudgets, getStudyPayments, getStudyFinancialSummary } from '@/lib/actions/financials';
import { listFinanceInvoicesForStudy } from '@/lib/actions/finance-invoices';
import { getStudyKriValues, getEnrollmentCurve } from '@/lib/actions/reports';
import { StudyDetailTabs } from '@/components/ctms/studies/study-detail-tabs';

interface StudyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyDetailPage({ params }: StudyDetailPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const [
    study,
    counts,
    countries,
    sites,
    subjects,
    funnel,
    teamMembers,
    teamRoles,
    monitoringVisits,
    budgets,
    studyPayments,
    financialSummary,
    financeInvoices,
    kriValues,
    enrollmentCurve,
  ] = await Promise.all([
    getStudyById(id),
    getStudyCounts(id),
    getStudyCountries(id),
    getStudySites(id),
    getStudySubjects(id),
    getEnrollmentFunnel(id),
    getStudyTeamMembers(id),
    getTeamRoles(),
    getStudyVisits(id),
    getStudyBudgets(id),
    getStudyPayments(id),
    getStudyFinancialSummary(id),
    listFinanceInvoicesForStudy(id).catch(() => []),
    getStudyKriValues(id),
    getEnrollmentCurve(id),
  ]);

  if (!study) notFound();

  return (
    <div className="p-6">
      <StudyDetailTabs
        study={study}
        counts={counts}
        countries={countries}
        sites={sites}
        subjects={subjects}
        funnel={funnel}
        teamMembers={teamMembers}
        teamRoles={teamRoles}
        monitoringVisits={monitoringVisits}
        budgets={budgets}
        payments={studyPayments}
        financialSummary={financialSummary}
        financeInvoices={financeInvoices}
        kriValues={kriValues}
        enrollmentCurve={enrollmentCurve}
        isAdmin={profile?.role === 'admin'}
      />
    </div>
  );
}
