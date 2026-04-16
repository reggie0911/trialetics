import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/server';
import { getStudyById, getStudyCounts, getStudies } from '@/lib/actions/studies';
import { getStudyCountries } from '@/lib/actions/countries';
import { getStudySites } from '@/lib/actions/sites';
import { getStudySubjects, getEnrollmentFunnel } from '@/lib/actions/subjects';
import {
  getTeamDirectory,
  getTeamRoles,
  getPendingInvitations,
  getJoinLinks,
} from '@/lib/actions/team';
import { getStudyVisits } from '@/lib/actions/visits';
import { getStudyBudgets, getStudyPayments, getStudyFinancialSummary } from '@/lib/actions/financials';
import { listFinanceInvoicesForStudy } from '@/lib/actions/finance-invoices';
import { getStudyKriValues, getEnrollmentCurve } from '@/lib/actions/reports';
import { StudyDetailTabsDynamic } from '@/components/ctms/studies/study-detail-tabs-dynamic';
import { listFinanceApprovalTemplateOptions } from '@/lib/actions/finance-approval-templates';
import { countTeamMembersScopedToStudy } from '@/lib/team/scope-team-members';

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

  const isAdmin = profile?.role === 'admin';

  const [
    study,
    counts,
    countries,
    sites,
    subjects,
    funnel,
    teamDirectoryMembers,
    teamStudies,
    teamRoles,
    pendingTeamInvitations,
    joinTeamLinks,
    monitoringVisits,
    budgets,
    studyPayments,
    financialSummary,
    financeInvoices,
    kriValues,
    enrollmentCurve,
    financeApprovalTemplateOptions,
  ] = await Promise.all([
    getStudyById(id),
    getStudyCounts(id),
    getStudyCountries(id),
    getStudySites(id),
    getStudySubjects(id),
    getEnrollmentFunnel(id),
    getTeamDirectory(),
    getStudies(),
    getTeamRoles(),
    getPendingInvitations(),
    isAdmin ? getJoinLinks() : Promise.resolve([]),
    getStudyVisits(id),
    getStudyBudgets(id),
    getStudyPayments(id),
    getStudyFinancialSummary(id),
    listFinanceInvoicesForStudy(id).catch(() => []),
    getStudyKriValues(id),
    getEnrollmentCurve(id),
    listFinanceApprovalTemplateOptions().catch(() => []),
  ]);

  if (!study) notFound();

  const teamTabCount = countTeamMembersScopedToStudy(teamDirectoryMembers, id);

  return (
    <div className="p-6">
      <StudyDetailTabsDynamic
        study={study}
        counts={counts}
        countries={countries}
        sites={sites}
        subjects={subjects}
        funnel={funnel}
        teamTabCount={teamTabCount}
        teamDirectoryMembers={teamDirectoryMembers}
        teamStudies={teamStudies}
        teamRoles={teamRoles}
        pendingTeamInvitations={pendingTeamInvitations}
        joinTeamLinks={joinTeamLinks}
        monitoringVisits={monitoringVisits}
        budgets={budgets}
        payments={studyPayments}
        financialSummary={financialSummary}
        financeInvoices={financeInvoices}
        kriValues={kriValues}
        enrollmentCurve={enrollmentCurve}
        isAdmin={isAdmin}
        financeApprovalTemplateOptions={financeApprovalTemplateOptions}
      />
    </div>
  );
}
