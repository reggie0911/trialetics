import { notFound } from 'next/navigation';

import {
  getApprovalsCenterData,
  getStudyFinanceWorkspace,
  listFinanceApprovalDelegations,
} from '@/lib/actions/study-finance-module';
import { getStudyByIdCached } from '@/lib/actions/studies';
import { createClient } from '@/lib/server';
import { FinanceModuleShell } from '@/components/ctms/finance-module/finance-module-shell';
import { ApprovalsKpiRow } from '@/components/ctms/finance-module/approvals-kpi-row';
import { ApprovalsPendingTable } from '@/components/ctms/finance-module/approvals-pending-table';
import { ApprovalWorkflowStepper } from '@/components/ctms/finance-module/approval-workflow-stepper';
import { MyApprovalLimits } from '@/components/ctms/finance-module/my-approval-limits';
import { ApprovalsSmartSuggestions } from '@/components/ctms/finance-module/approvals-smart-suggestions';
import { ApprovalSummaryDonut } from '@/components/ctms/finance-module/approval-summary-donut';
import { MyApprovalDelegation } from '@/components/ctms/finance-module/my-approval-delegation';
import { ApproverWorkload } from '@/components/ctms/finance-module/approver-workload';
import { ApprovalsRecentActivity } from '@/components/ctms/finance-module/approvals-recent-activity';
import { AiFinanceInsightsPanel } from '@/components/ctms/finance-module/ai-finance-insights-panel';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyApprovalsPage({ params }: PageProps) {
  const { id: studyId } = await params;
  const study = await getStudyByIdCached(studyId);
  if (!study) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data, error }, { data: workspace }, { data: delegations = [] }] = await Promise.all([
    getApprovalsCenterData(studyId),
    getStudyFinanceWorkspace(studyId),
    listFinanceApprovalDelegations(studyId),
  ]);
  const baseCurrency = workspace?.base_currency ?? 'USD';

  if (error && !data) {
    return (
      <FinanceModuleShell
        studyId={studyId}
        title="Approvals Center"
        subtitle="Work the consolidated approval queue across budget versions, invoices, purchase orders, change orders, and related finance objects so pending decisions surface in one inbox instead of scattered screens."
      >
        <p className="text-sm text-destructive">{error}</p>
      </FinanceModuleShell>
    );
  }

  if (!data) {
    return (
      <FinanceModuleShell
        studyId={studyId}
        title="Approvals Center"
        subtitle="Work the consolidated approval queue across budget versions, invoices, purchase orders, change orders, and related finance objects so pending decisions surface in one inbox instead of scattered screens."
      >
        <p className="text-sm text-muted-foreground">Loading…</p>
      </FinanceModuleShell>
    );
  }

  const focused = data.rows.find((row) => ['pending', 'in_progress', 'overdue', 'escalated'].includes(row.status));
  const focusedStep = focused ? focused.current_step : 0;
  const focusedTotal = focused ? focused.total_steps : 4;

  return (
    <FinanceModuleShell
      studyId={studyId}
      title="Approvals Center"
      subtitle="Work the consolidated approval queue across budget versions, invoices, purchase orders, change orders, and related finance objects so pending decisions surface in one inbox instead of scattered screens."
    >
      <ApprovalsKpiRow kpis={data.kpis} />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <ApprovalsPendingTable studyId={studyId} rows={data.rows} />
          <ApprovalWorkflowStepper currentStep={focusedStep} totalSteps={focusedTotal} />
          <MyApprovalLimits baseCurrency={baseCurrency} />
          <ApprovalsSmartSuggestions rows={data.rows} />
        </div>

        <div className="flex flex-col gap-4">
          <ApprovalSummaryDonut rows={data.byObjectType} />
          <MyApprovalDelegation studyId={studyId} currentUserId={user?.id ?? ''} rows={delegations} />
          <ApproverWorkload rows={data.rows} />
          <AiFinanceInsightsPanel
            studyId={studyId}
            scope="approvals"
            title="Approval Queue Risk Summary"
            description="OpenAI-generated risk summary for the active approval queue. Advisory only — never auto-approves."
          />
          <ApprovalsRecentActivity studyId={studyId} logs={data.recentActivity} />
        </div>
      </div>
    </FinanceModuleShell>
  );
}
