import { notFound } from 'next/navigation';

import {
  getStudyFinanceWorkspace,
  listBudgetCategories,
  listFinanceApprovalPolicies,
} from '@/lib/actions/study-finance-module';
import { getStudyByIdCached } from '@/lib/actions/studies';
import { BudgetCategoriesSettingsCard } from '@/components/ctms/finance-module/budget-categories-settings-card';
import { FinanceModuleShell } from '@/components/ctms/finance-module/finance-module-shell';
import { InitializeFinanceWorkspaceCard } from '@/components/ctms/finance-module/initialize-finance-workspace-card';
import { WorkspaceSettingsForm } from '@/components/ctms/finance-module/workspace-settings-form';
import { ApprovalPoliciesSettingsCard } from '@/components/ctms/finance-module/approval-policies-settings-card';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyFinanceSettingsPage({ params }: PageProps) {
  const { id: studyId } = await params;
  const study = await getStudyByIdCached(studyId);
  if (!study) notFound();

  const { data: workspace, error } = await getStudyFinanceWorkspace(studyId);

  return (
    <FinanceModuleShell
      studyId={studyId}
      title="Finance Settings"
      subtitle="Configure workspace-level defaults, finance categories, routing conventions, and policies that determine how budgets, invoices, POs, and approvals behave throughout the finance module."
    >
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!workspace ? (
        <InitializeFinanceWorkspaceCard studyId={studyId} />
      ) : (
        <WorkspaceSettingsForm studyId={studyId} workspace={workspace} />
      )}

      {workspace ? (
        <BudgetCategoriesSection studyId={studyId} workspaceId={workspace.id} />
      ) : null}

      {workspace ? <ApprovalPoliciesSection studyId={studyId} /> : null}
    </FinanceModuleShell>
  );
}

async function BudgetCategoriesSection({
  studyId,
  workspaceId,
}: {
  studyId: string;
  workspaceId: string;
}) {
  const { data: categories } = await listBudgetCategories(studyId);
  return (
    <BudgetCategoriesSettingsCard studyId={studyId} workspaceId={workspaceId} categories={categories} />
  );
}

async function ApprovalPoliciesSection({ studyId }: { studyId: string }) {
  const { data: policies = [] } = await listFinanceApprovalPolicies(studyId);
  return <ApprovalPoliciesSettingsCard studyId={studyId} policies={policies} />;
}
