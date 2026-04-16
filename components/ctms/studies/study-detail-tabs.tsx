'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Pencil,
  ArrowLeft,
  Globe,
  Building2,
  Users,
  UsersRound,
  ClipboardCheck,
  DollarSign,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import type { Study, StudyCountryWithSubmissions, StudySite, SubjectWithSite, EnrollmentFunnelData, TeamRole, TeamMemberWithStudies, MonitoringVisitWithRelations, StudyBudgetWithItems, SitePaymentWithSite, FinancialSummary, FinanceInvoiceWithRelations, KriValueWithDefinition, EnrollmentDataPoint, FinanceApprovalTemplateOption } from '@/lib/types/ctms';
import type { JoinLink, PendingInvitation } from '@/lib/actions/team';
import { TRIP_REPORT_DAYS_BASIS_LABELS } from '@/lib/types/visit-reports';
import { studyOverviewHasDisplayableContent } from '@/lib/validation/study-overview';
import { CountriesTab } from '@/components/ctms/countries/countries-tab';
import { SitesTab } from '@/components/ctms/sites/sites-tab';
import { SubjectsTab } from '@/components/ctms/subjects/subjects-tab';
import { TeamStudyPanel } from '@/components/ctms/team/team-study-panel';
import { VisitsTab } from '@/components/ctms/visits/visits-tab';
import { FinancialsTab } from '@/components/ctms/financials/financials-tab';
import { KriGauge } from '@/components/ctms/reports/kri-gauge';
import { EnrollmentChart } from '@/components/ctms/reports/enrollment-chart';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const STUDY_TAB_VALUES = [
  'overview',
  'countries',
  'sites',
  'subjects',
  'team',
  'visits',
  'financials',
] as const;

type StudyTabValue = (typeof STUDY_TAB_VALUES)[number];

const STUDY_TAB_TOOLTIPS: Record<StudyTabValue, string> = {
  overview: 'Study summary, protocol fields, enrollment curve, and key risk indicators.',
  countries: 'Country-level regulatory tracking and submissions for this study.',
  sites: 'Investigator sites, locations, and site-level actions.',
  subjects: 'Enrolled subjects, screening, and randomization.',
  team: 'Team members, roles, and site assignments for this study.',
  visits: 'Monitoring visits: schedule visits, table and calendar views, and trip reports.',
  financials: 'Budgets, invoices, and payments for this study.',
};

function isStudyTab(v: string | null): v is StudyTabValue {
  return v !== null && (STUDY_TAB_VALUES as readonly string[]).includes(v);
}

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
  joinTeamLinks: JoinLink[];
  monitoringVisits: MonitoringVisitWithRelations[];
  budgets: StudyBudgetWithItems[];
  payments: SitePaymentWithSite[];
  financialSummary: FinancialSummary;
  financeInvoices: FinanceInvoiceWithRelations[];
  kriValues: KriValueWithDefinition[];
  enrollmentCurve: EnrollmentDataPoint[];
  isAdmin: boolean;
  financeApprovalTemplateOptions: FinanceApprovalTemplateOption[];
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-sm">{value || '—'}</dd>
    </div>
  );
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
  joinTeamLinks,
  monitoringVisits,
  budgets,
  payments,
  financialSummary,
  financeInvoices,
  kriValues,
  enrollmentCurve,
  isAdmin,
  financeApprovalTemplateOptions,
}: StudyDetailTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: StudyTabValue = isStudyTab(tabParam) ? tabParam : 'overview';

  /** Keeps address bar in sync without a new history entry per tab switch. */
  const handleStudyTabChange = (next: string) => {
    if (!isStudyTab(next)) return;
    router.replace(`/protected/studies/${study.id}?tab=${next}`, { scroll: false });
  };

  const isStudyReadOnly = study.status === 'closed';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" render={<Link href="/protected/studies" />} nativeButton={false} className="-ml-2">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Studies
            </Button>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{study.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{study.protocol_number}</span>
            <span>&middot;</span>
            <Badge variant="outline" className="text-xs">{study.phase}</Badge>
            <StatusBadge status={study.status} className="text-xs" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isStudyReadOnly}
                  render={
                    isStudyReadOnly ? undefined : <Link href={`/protected/studies/${study.id}/edit`} />
                  }
                  nativeButton={isStudyReadOnly}
                />
              }
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {isStudyReadOnly
                ? 'Study is deactivated; editing is disabled until the study is reactivated.'
                : 'Edit study metadata, overview fields, and configuration.'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

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
            <TooltipTrigger render={<TabsTrigger value="visits" />}>
              <ClipboardCheck className="mr-1 h-3.5 w-3.5" />
              Visits ({monitoringVisits.length})
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {STUDY_TAB_TOOLTIPS.visits}
            </TooltipContent>
          </Tooltip>
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
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Study Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="divide-y">
                  <DetailRow label="Protocol Number" value={study.protocol_number} />
                  <DetailRow label="Study Title" value={study.title} />
                  <DetailRow label="Phase" value={study.phase} />
                  <DetailRow label="Status" value={study.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} />
                  <DetailRow label="Therapeutic Area" value={study.therapeutic_area} />
                  <DetailRow label="Indication" value={study.indication} />
                  <DetailRow label="Sponsor" value={study.sponsor} />
                  <DetailRow
                    label="Sponsor organization (directory)"
                    value={
                      study.sponsor_institution_id
                        ? 'Linked — open Directory for organization details'
                        : 'Not linked'
                    }
                  />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Timeline & Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="divide-y">
                  <DetailRow label="Start Date" value={formatDate(study.start_date)} />
                  <DetailRow label="End Date" value={formatDate(study.end_date)} />
                  <DetailRow label="Countries" value={String(counts.countries)} />
                  <DetailRow label="Sites" value={String(counts.sites)} />
                  <DetailRow label="Created" value={formatDate(study.created_at)} />
                  <DetailRow label="Last Updated" value={formatDate(study.updated_at)} />
                </dl>
              </CardContent>
            </Card>

            {!studyOverviewHasDisplayableContent(study.overview) && (
              <Card className="lg:col-span-2 border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">Protocol & monitoring overview</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    Extra protocol details (summary, objectives, planned sites, monitoring plan, and trip report
                    timing) are not saved for this study yet, or could not be loaded.
                  </p>
                  <p>
                    Use <span className="font-medium text-foreground">Edit</span>, then fill out the{' '}
                    <span className="font-medium text-foreground">Study overview</span> section and save. Only
                    fields in that section are shown as the cards below—not the main study information block by
                    itself.
                  </p>
                </CardContent>
              </Card>
            )}

            {study.overview &&
              (study.overview.study_type ||
                study.overview.design ||
                study.overview.estimated_enrollment != null ||
                study.overview.study_duration_months != null ||
                study.overview.population) && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Protocol summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="divide-y">
                    <DetailRow label="Study type" value={study.overview.study_type} />
                    <DetailRow label="Design" value={study.overview.design} />
                    <DetailRow
                      label="Estimated enrollment"
                      value={
                        study.overview.estimated_enrollment != null
                          ? `${study.overview.estimated_enrollment} participants`
                          : null
                      }
                    />
                    <DetailRow
                      label="Study duration"
                      value={
                        study.overview.study_duration_months != null
                          ? `${study.overview.study_duration_months} months`
                          : null
                      }
                    />
                    <DetailRow label="Population" value={study.overview.population} />
                  </dl>
                </CardContent>
              </Card>
            )}

            {study.overview &&
              (study.overview.primary_objective ||
                (study.overview.secondary_objectives && study.overview.secondary_objectives.length > 0)) && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Objectives</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {study.overview.primary_objective && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Primary objective</p>
                      <p className="mt-1 whitespace-pre-wrap">{study.overview.primary_objective}</p>
                    </div>
                  )}
                  {study.overview.secondary_objectives && study.overview.secondary_objectives.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Key secondary objectives (hierarchical testing)
                      </p>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {study.overview.secondary_objectives.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {study.overview?.study_sites &&
              (study.overview.study_sites.regions ||
                study.overview.study_sites.site_count_summary ||
                study.overview.study_sites.site_types) && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Study sites (planned)</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="divide-y">
                    <DetailRow label="Regions" value={study.overview.study_sites.regions} />
                    <DetailRow label="Number of sites" value={study.overview.study_sites.site_count_summary} />
                    <DetailRow label="Site type" value={study.overview.study_sites.site_types} />
                  </dl>
                </CardContent>
              </Card>
            )}

            {study.overview?.monitoring &&
              (study.overview.monitoring.monitoring_type ||
                study.overview.monitoring.sdv ||
                (study.overview.monitoring.visit_types && study.overview.monitoring.visit_types.length > 0)) && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Monitoring plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <dl className="divide-y">
                    <DetailRow label="Monitoring type" value={study.overview.monitoring.monitoring_type} />
                    <DetailRow label="SDV" value={study.overview.monitoring.sdv} />
                  </dl>
                  {study.overview.monitoring.visit_types &&
                    study.overview.monitoring.visit_types.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Visit types</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {study.overview.monitoring.visit_types.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {study.overview?.trip_report_timing && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Monitoring trip report due date ranges</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="divide-y">
                    <DetailRow
                      label="Amount of days for report submission"
                      value={
                        study.overview.trip_report_timing.report_submission_days != null
                          ? String(study.overview.trip_report_timing.report_submission_days)
                          : null
                      }
                    />
                    <DetailRow
                      label="Amount of days for report approval"
                      value={
                        study.overview.trip_report_timing.report_approval_days != null
                          ? String(study.overview.trip_report_timing.report_approval_days)
                          : null
                      }
                    />
                    <DetailRow
                      label="Day count"
                      value={
                        study.overview.trip_report_timing.days_basis
                          ? TRIP_REPORT_DAYS_BASIS_LABELS[study.overview.trip_report_timing.days_basis]
                          : TRIP_REPORT_DAYS_BASIS_LABELS.calendar
                      }
                    />
                  </dl>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Per-template settings in Trip Report Admin control calculated due dates on reports. Align the day
                    count with those templates for consistent timelines.
                  </p>
                </CardContent>
              </Card>
            )}

            {study.description && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{study.description}</p>
                </CardContent>
              </Card>
            )}

            {enrollmentCurve.length > 0 && (
              <div className="lg:col-span-2">
                <EnrollmentChart data={enrollmentCurve} title="Enrollment Curve" />
              </div>
            )}

            {kriValues.length > 0 && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Key Risk Indicators</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {kriValues.map((kv) => (
                      <KriGauge
                        key={kv.id}
                        name={kv.kri_definitions.name}
                        category={kv.kri_definitions.category}
                        value={kv.value}
                        status={kv.status}
                        thresholdYellow={kv.kri_definitions.threshold_yellow}
                        thresholdRed={kv.kri_definitions.threshold_red}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="countries">
          <CountriesTab studyId={study.id} initialCountries={countries} />
        </TabsContent>

        <TabsContent value="sites">
          <SitesTab studyId={study.id} initialSites={sites} />
        </TabsContent>

        <TabsContent value="subjects">
          <SubjectsTab
            studyId={study.id}
            initialSubjects={subjects}
            initialFunnel={funnel}
            sites={sites.map((s) => ({ id: s.id, site_number: s.site_number, name: s.name }))}
          />
        </TabsContent>

        <TabsContent value="team" forceMount>
          <TeamStudyPanel
            studyId={study.id}
            teamDirectoryMembers={teamDirectoryMembers}
            studies={teamStudies}
            teamRoles={teamRoles}
            pendingInvitations={pendingTeamInvitations}
            joinLinks={joinTeamLinks}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="visits" forceMount>
          <div data-onboarding="page-visits">
            <VisitsTab
              studyId={study.id}
              initialVisits={monitoringVisits}
              sites={sites.map((s) => ({ id: s.id, site_number: s.site_number, name: s.name }))}
            />
          </div>
        </TabsContent>

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
