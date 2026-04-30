import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/server';
import { getStudyById, getStudyCounts, getStudies } from '@/lib/actions/studies';
import { getStudyCountries } from '@/lib/actions/countries';
import { getStudySites } from '@/lib/actions/sites';
import { getStudySubjects, getEnrollmentFunnel } from '@/lib/actions/subjects';
import { getStudyEcrfRollup } from '@/lib/actions/ecrf-rollup';
import {
  getStudyVisitScheduleRollup,
  getStudyVisitWindowComplianceRollup,
} from '@/lib/actions/visit-window-compliance-rollup';
import {
  getTeamDirectory,
  getTeamRoles,
  getPendingInvitations,
  getCompanyDomain,
} from '@/lib/actions/team';
import { getStudyVisits } from '@/lib/actions/visits';
import { listStudyVisitDefinitions } from '@/lib/actions/study-visit-definitions';
import { listStudyCrfs } from '@/lib/actions/study-crfs';
import { getStudyKriValues, getEnrollmentCurve } from '@/lib/actions/reports';
import { StudyDetailTabsDynamic } from '@/components/ctms/studies/study-detail-tabs-dynamic';
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
    companyDomain,
    monitoringVisits,
    kriValues,
    enrollmentCurve,
    ecrfVisitDefinitions,
    ecrfStudyCrfs,
    ecrfRollup,
    visitSchedule,
    visitWindowCompliance,
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
    getCompanyDomain(),
    getStudyVisits(id),
    getStudyKriValues(id),
    getEnrollmentCurve(id),
    isAdmin ? listStudyVisitDefinitions(id).catch(() => []) : Promise.resolve([]),
    isAdmin ? listStudyCrfs(id).catch(() => []) : Promise.resolve([]),
    getStudyEcrfRollup(id),
    getStudyVisitScheduleRollup(id),
    getStudyVisitWindowComplianceRollup(id),
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
        companyDomain={companyDomain}
        monitoringVisits={monitoringVisits}
        kriValues={kriValues}
        enrollmentCurve={enrollmentCurve}
        isAdmin={isAdmin}
        ecrfVisitDefinitions={ecrfVisitDefinitions}
        ecrfStudyCrfs={ecrfStudyCrfs}
        ecrfRollup={ecrfRollup}
        visitSchedule={visitSchedule}
        visitWindowCompliance={visitWindowCompliance}
      />
    </div>
  );
}
