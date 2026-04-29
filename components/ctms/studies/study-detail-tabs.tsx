'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Globe,
  Building2,
  Users,
  UsersRound,
  ClipboardCheck,
  ClipboardList,
  CalendarClock,
  DollarSign,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Study, StudyCountryWithSubmissions, StudyEcrfRollupBundle, StudyVisitScheduleBundle, StudySite, SubjectWithSite, EnrollmentFunnelData, TeamRole, TeamMemberWithStudies, MonitoringVisitWithRelations, StudyBudgetWithItems, SitePaymentWithSite, FinancialSummary, FinanceInvoiceWithRelations, KriValueWithDefinition, EnrollmentDataPoint, FinanceApprovalTemplateOption, StudyVisitDefinition, StudyCrf, VisitWindowComplianceBundle } from '@/lib/types/ctms';
import type { PendingInvitation } from '@/lib/actions/team';
import { CountriesTab } from '@/components/ctms/countries/countries-tab';
import { SitesTab } from '@/components/ctms/sites/sites-tab';
import { SubjectsTab } from '@/components/ctms/subjects/subjects-tab';
import { TeamStudyPanel } from '@/components/ctms/team/team-study-panel';
import { VisitsTab } from '@/components/ctms/visits/visits-tab';
import { EcrfBuilderTab } from '@/components/ctms/study-forms/ecrf-builder-tab';
import { StudyEcrfTrackingTab } from '@/components/ctms/ecrf-tracking/study-ecrf-tracking-tab';
import { StudyVisitScheduleTab } from '@/components/ctms/visit-window-compliance/study-visit-window-compliance-tab';
import { FinancialsTab } from '@/components/ctms/financials/financials-tab';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StudyOverviewDashboard } from '@/components/ctms/studies/study-overview-dashboard';

const STUDY_TAB_VALUES = [
  'overview',
  'countries',
  'sites',
  'subjects',
  'team',
  'ecrf-tracking',
  'visit-window-compliance',
  'visits',
  'ecrf',
  'financials',
] as const;

type StudyTabValue = (typeof STUDY_TAB_VALUES)[number];

const STUDY_TAB_TOOLTIPS: Record<StudyTabValue, string> = {
  overview: 'Study summary, protocol fields, enrollment curve, and key risk indicators.',
  countries: 'Country-level regulatory tracking and submissions for this study.',
  sites: 'Investigator sites, locations, and site-level actions.',
  subjects: 'Enrolled subjects, screening, and randomization.',
  'ecrf-tracking':
    'Read-only eCRF tracking rollups across sites, visits, and subjects. Drill into a subject to edit metrics.',
  'visit-window-compliance':
    'Visit Window Compliance: track visit timeliness and window adherence across all sites and subjects. Drill into a subject to edit anchors and dates.',
  team:
    'Team members, roles, and site assignments for this study. You can invite team members from this tab.',
  visits: 'Site visits: schedule visits, table and calendar views, and trip reports.',
  ecrf: 'eCRF Builder: define visits, assign CRFs to each visit, and author questions.',
  financials: 'Budgets, invoices, and payments for this study.',
};

function isStudyTab(v: string | null): v is StudyTabValue {
  return v !== null && (STUDY_TAB_VALUES as readonly string[]).includes(v);
}

/** Backwards-compatible map of legacy `?tab=` slugs to their new values so
 *  bookmarks, emails, and old PDF links keep working after the
 *  visit-schedule -> visit-window-compliance rename. */
const LEGACY_TAB_REDIRECTS: Record<string, StudyTabValue> = {
  'visit-schedule': 'visit-window-compliance',
};

export interface StudyDetailTabsProps {
  study: Study;
  counts: { countries: number; sites: number };
  countries: StudyCountryWithSubmissions[];
  sites: StudySite[];
  subjects: SubjectWithSite[];
  funnel: EnrollmentFunnelData;
  teamTabCount: number;
  teamDirectoryMembers: TeamMemberWithStudies[];
  teamStudies: Study[];
  teamRoles: TeamRole[];
  pendingTeamInvitations: PendingInvitation[];
  companyDomain: string | null;
  monitoringVisits: MonitoringVisitWithRelations[];
  budgets: StudyBudgetWithItems[];
  payments: SitePaymentWithSite[];
  financialSummary: FinancialSummary;
  financeInvoices: FinanceInvoiceWithRelations[];
  kriValues: KriValueWithDefinition[];
  enrollmentCurve: EnrollmentDataPoint[];
  isAdmin: boolean;
  financeApprovalTemplateOptions: FinanceApprovalTemplateOption[];
  ecrfVisitDefinitions: StudyVisitDefinition[];
  ecrfStudyCrfs: StudyCrf[];
  ecrfRollup: StudyEcrfRollupBundle;
  visitSchedule: StudyVisitScheduleBundle;
  visitWindowCompliance: VisitWindowComplianceBundle;
}

export function StudyDetailTabs({
  study,
  counts,
  countries,
  sites,
  subjects,
  funnel,
  teamTabCount,
  teamDirectoryMembers,
  teamStudies,
  teamRoles,
  pendingTeamInvitations,
  companyDomain,
  monitoringVisits,
  budgets,
  payments,
  financialSummary,
  financeInvoices,
  kriValues,
  enrollmentCurve,
  isAdmin,
  financeApprovalTemplateOptions,
  ecrfVisitDefinitions,
  ecrfStudyCrfs,
  ecrfRollup,
  visitSchedule,
  visitWindowCompliance,
}: StudyDetailTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const actionParam = searchParams.get('action');
  const legacyRedirect = tabParam ? LEGACY_TAB_REDIRECTS[tabParam] : undefined;
  const requestedTab: StudyTabValue = legacyRedirect
    ? legacyRedirect
    : isStudyTab(tabParam)
      ? tabParam
      : 'overview';
  const activeTab: StudyTabValue =
    requestedTab === 'ecrf' && !isAdmin ? 'overview' : requestedTab;

  if (typeof window !== 'undefined' && legacyRedirect) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', legacyRedirect);
    router.replace(`/protected/studies/${study.id}?${params.toString()}`, {
      scroll: false,
    });
  }

  /** Keeps address bar in sync without a new history entry per tab switch. */
  const replaceStudyLocation = (next: StudyTabValue, action?: string) => {
    const params = new URLSearchParams();
    params.set('tab', next);
    if (action) params.set('action', action);
    router.replace(`/protected/studies/${study.id}?${params.toString()}`, { scroll: false });
  };

  const handleStudyTabChange = (next: string) => {
    if (!isStudyTab(next)) return;
    replaceStudyLocation(next);
  };

  return (
    <div className="space-y-4">
      <Tabs
        tabsId={`study-detail-${study.id}`}
        value={activeTab}
        onValueChange={handleStudyTabChange}
        className="space-y-4"
      >
        <TabsList className="flex w-full min-w-0 flex-wrap justify-start gap-y-1">
          <Tooltip>
            <TooltipTrigger render={<TabsTrigger value="overview" />}>Overview</TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {STUDY_TAB_TOOLTIPS.overview}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<TabsTrigger value="countries" />}>
              <Globe className="mr-1 h-3.5 w-3.5" />
              Countries ({counts.countries})
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {STUDY_TAB_TOOLTIPS.countries}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<TabsTrigger value="sites" />}>
              <Building2 className="mr-1 h-3.5 w-3.5" />
              Sites ({counts.sites})
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {STUDY_TAB_TOOLTIPS.sites}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<TabsTrigger value="subjects" />}>
              <Users className="mr-1 h-3.5 w-3.5" />
              Subjects ({subjects.length})
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {STUDY_TAB_TOOLTIPS.subjects}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<TabsTrigger value="team" />}>
              <UsersRound className="mr-1 h-3.5 w-3.5" />
              Team ({teamTabCount})
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {STUDY_TAB_TOOLTIPS.team}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<TabsTrigger value="ecrf-tracking" />}>
              <ClipboardList className="mr-1 h-3.5 w-3.5" />
              eCRF Tracking
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {STUDY_TAB_TOOLTIPS['ecrf-tracking']}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<TabsTrigger value="visit-window-compliance" />}>
              <CalendarClock className="mr-1 h-3.5 w-3.5" />
              Visit Window Compliance
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {STUDY_TAB_TOOLTIPS['visit-window-compliance']}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<TabsTrigger value="visits" />}>
              <ClipboardCheck className="mr-1 h-3.5 w-3.5" />
              Site Visits ({monitoringVisits.length})
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {STUDY_TAB_TOOLTIPS.visits}
            </TooltipContent>
          </Tooltip>
          {isAdmin && (
            <Tooltip>
              <TooltipTrigger render={<TabsTrigger value="ecrf" />}>
                <ClipboardList className="mr-1 h-3.5 w-3.5" />
                eCRF Builder
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {STUDY_TAB_TOOLTIPS.ecrf}
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger render={<TabsTrigger value="financials" />}>
              <DollarSign className="mr-1 h-3.5 w-3.5" />
              Financials
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {STUDY_TAB_TOOLTIPS.financials}
            </TooltipContent>
          </Tooltip>
        </TabsList>

        <TabsContent value="overview">
          <StudyOverviewDashboard
            study={study}
            counts={counts}
            countries={countries}
            sites={sites}
            subjects={subjects}
            funnel={funnel}
            monitoringVisits={monitoringVisits}
            kriValues={kriValues}
            enrollmentCurve={enrollmentCurve}
            ecrfRollup={ecrfRollup}
            visitSchedule={visitSchedule}
            onNavigateTab={(next) => replaceStudyLocation(next)}
            onOpenCreateSubject={() => replaceStudyLocation('subjects', 'add-subject')}
          />
        </TabsContent>

        <TabsContent value="countries">
          <CountriesTab
            studyId={study.id}
            study={study}
            initialCountries={countries}
            initialSites={sites}
          />
        </TabsContent>

        <TabsContent value="sites">
          <SitesTab
            studyId={study.id}
            initialSites={sites}
            countries={countries}
            subjects={subjects}
            monitoringVisits={monitoringVisits}
          />
        </TabsContent>

        <TabsContent value="subjects">
          <SubjectsTab
            studyId={study.id}
            initialSubjects={subjects}
            initialFunnel={funnel}
            countries={countries}
            sites={sites.map((s) => ({
              id: s.id,
              site_number: s.site_number,
              name: s.name,
              study_country_id: s.study_country_id,
            }))}
            createOpen={activeTab === 'subjects' && actionParam === 'add-subject' ? true : undefined}
            onCreateOpenChange={
              actionParam === 'add-subject'
                ? (open) => {
                    if (!open) replaceStudyLocation('subjects');
                  }
                : undefined
            }
          />
        </TabsContent>

        <TabsContent value="team" forceMount>
          <TeamStudyPanel
            studyId={study.id}
            teamDirectoryMembers={teamDirectoryMembers}
            studies={teamStudies}
            teamRoles={teamRoles}
            pendingInvitations={pendingTeamInvitations}
            companyDomain={companyDomain}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="ecrf-tracking">
          <StudyEcrfTrackingTab
            studyId={study.id}
            bundle={ecrfRollup}
          />
        </TabsContent>

        <TabsContent value="visit-window-compliance">
          <StudyVisitScheduleTab
            studyId={study.id}
            bundle={visitSchedule}
            complianceBundle={visitWindowCompliance}
          />
        </TabsContent>

        <TabsContent value="visits" forceMount>
          <div>
            <VisitsTab
              studyId={study.id}
              initialVisits={monitoringVisits}
              sites={sites.map((s) => ({ id: s.id, site_number: s.site_number, name: s.name }))}
            />
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="ecrf">
            <EcrfBuilderTab
              studyId={study.id}
              initialVisits={ecrfVisitDefinitions}
              initialCrfs={ecrfStudyCrfs}
            />
          </TabsContent>
        )}

        <TabsContent value="financials">
          <FinancialsTab
            studyId={study.id}
            companyId={study.company_id}
            initialBudgets={budgets}
            initialPayments={payments}
            initialSummary={financialSummary}
            initialFinanceInvoices={financeInvoices}
            sites={sites.map((s) => ({ id: s.id, site_number: s.site_number, name: s.name }))}
            isAdmin={isAdmin}
            studyFinanceApprovalTemplateId={study.finance_approval_template_id}
            financeApprovalTemplateOptions={financeApprovalTemplateOptions}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
