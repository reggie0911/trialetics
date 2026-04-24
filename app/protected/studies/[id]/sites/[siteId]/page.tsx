import { Suspense } from 'react';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/server';
import { getSiteById, getStudySites } from '@/lib/actions/sites';
import { getStudyById } from '@/lib/actions/studies';
import {
  getSubjectCountBySite,
  getStudySubjects,
  getEnrollmentFunnelForSite,
} from '@/lib/actions/subjects';
import { getTasksBySite } from '@/lib/actions/tasks';
import { getSiteEcrfRollup } from '@/lib/actions/ecrf-rollup';
import {
  getSiteVisitScheduleRollup,
  getSiteVisitWindowComplianceRollup,
} from '@/lib/actions/visit-window-compliance-rollup';
import { listDirectoryContacts } from '@/lib/actions/directory-contacts';
import { getDirectoryRoleCatalog } from '@/lib/actions/directory-catalog';
import { listInstitutions } from '@/lib/actions/directory-institutions';
import { SiteDetailTabs } from '@/components/ctms/sites/site-detail-tabs';
import type { InvoiceBudgetLineAllocationRef } from '@/lib/types/ctms';
import {
  getSiteBudgetWithLineItems,
  getBudgetAllocationsForSite,
  listInvoiceAllocationRefsBySiteBudget,
} from '@/lib/actions/finance-site-budgets';
import { listFinanceInvoicesForSite } from '@/lib/actions/finance-invoices';
import { listFinanceApprovalTemplateOptions } from '@/lib/actions/finance-approval-templates';
import { getStudySchedules, getStudyBudgetMeta, listStudyBudgetOptions } from '@/lib/actions/financials';

interface PageProps {
  params: Promise<{ id: string; siteId: string }>;
}

export default async function StudySiteDetailPage({ params }: PageProps) {
  const { id: studyId, siteId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const site = await getSiteById(siteId);
  if (!site) notFound();
  if (site.study_id !== studyId) notFound();

  const [
    study,
    enrolledCount,
    siteTasks,
    dirContactsRes,
    siteBudget,
    siteFinanceInvoices,
    studySchedules,
    initialSiteSubjects,
    siteFunnel,
    studySitesRaw,
    directoryCatalogRes,
    institutionsRes,
    financeApprovalTemplateOptions,
    studyBudgetOptions,
    ecrfRollup,
    visitSchedule,
    visitWindowCompliance,
  ] = await Promise.all([
    getStudyById(studyId),
    getSubjectCountBySite(siteId),
    getTasksBySite(siteId),
    listDirectoryContacts({ limit: 100 }),
    getSiteBudgetWithLineItems(site.study_id, site.id).catch(() => null),
    listFinanceInvoicesForSite(site.id).catch(() => []),
    getStudySchedules(site.study_id).catch(() => []),
    getStudySubjects(site.study_id, { siteId: site.id }),
    getEnrollmentFunnelForSite(site.id),
    getStudySites(site.study_id),
    getDirectoryRoleCatalog(),
    listInstitutions({ limit: 300, offset: 0 }),
    listFinanceApprovalTemplateOptions().catch(() => []),
    listStudyBudgetOptions(site.study_id).catch(() => []),
    getSiteEcrfRollup(site.id),
    getSiteVisitScheduleRollup(site.id),
    getSiteVisitWindowComplianceRollup(site.id),
  ]);

  const linkedStudyBudgetMeta = siteBudget?.study_budget_id
    ? await getStudyBudgetMeta(siteBudget.study_budget_id).catch(() => null)
    : null;
  const studySitesForSubjects = studySitesRaw.map((s) => ({
    id: s.id,
    site_number: s.site_number,
    name: s.name,
  }));
  const sitePaymentSchedules = studySchedules.filter((s) => s.site_id === site.id);
  if (!study) notFound();

  const budgetAllocations = siteBudget
    ? await getBudgetAllocationsForSite(siteBudget.id).catch(() => new Map<string, number>())
    : new Map<string, number>();
  const budgetAllocationsObj = Object.fromEntries(budgetAllocations);

  const invoiceAllocationRefsByLine: Record<string, InvoiceBudgetLineAllocationRef[]> = siteBudget
    ? await listInvoiceAllocationRefsBySiteBudget(siteBudget.id).catch(() => ({}))
    : {};

  const directoryContactOptions = (dirContactsRes.data ?? []).map((c) => ({
    id: c.id,
    label:
      [c.first_name, c.last_name].filter(Boolean).join(' ').trim() ||
      c.email ||
      'Unnamed contact',
  }));

  const { data: siteInstitutionLink } = await supabase
    .from('institution_study_site')
    .select('institution_id')
    .eq('study_site_id', site.id)
    .limit(1)
    .maybeSingle();
  const siteInstitutionId = siteInstitutionLink?.institution_id ?? null;

  return (
    <div className="p-6">
      <Suspense
        fallback={
          <div className="space-y-4" aria-busy="true">
            <div className="h-10 max-w-xl rounded-md bg-muted/50 animate-pulse" />
            <div className="min-h-[280px] rounded-md border border-dashed border-border/60 bg-muted/20 animate-pulse" />
          </div>
        }
      >
        <SiteDetailTabs
          site={site}
          study={{
            id: study.id,
            title: study.title,
            protocol_number: study.protocol_number,
            company_id: study.company_id,
          }}
          isAdmin={profile?.role === 'admin'}
          enrolledCount={enrolledCount}
          siteTasks={siteTasks}
          directoryContactOptions={directoryContactOptions}
          directoryCatalog={directoryCatalogRes.categories}
          directoryCatalogError={directoryCatalogRes.error}
          institutionsForQuickContact={institutionsRes.data ?? []}
          siteInstitutionId={siteInstitutionId}
          siteBudget={siteBudget}
          studyBudgetName={linkedStudyBudgetMeta?.name ?? null}
          budgetAllocations={budgetAllocationsObj}
          invoiceAllocationRefsByLine={invoiceAllocationRefsByLine}
          siteFinanceInvoices={siteFinanceInvoices}
          sitePaymentSchedules={sitePaymentSchedules}
          initialSiteSubjects={initialSiteSubjects}
          siteFunnel={siteFunnel}
          ecrfRollup={ecrfRollup}
          visitSchedule={visitSchedule}
          visitWindowCompliance={visitWindowCompliance}
          studySitesForSubjects={studySitesForSubjects}
          financeApprovalTemplateOptions={financeApprovalTemplateOptions}
          studyBudgetOptions={studyBudgetOptions}
          ctmsStudyRouteId={studyId}
        />
      </Suspense>
    </div>
  );
}
