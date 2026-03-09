'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { CTMSProvider } from '@/components/clinical-trials/ctms-context';
import { Greeting } from '@/components/dashboard/greeting';
import { ModuleMetrics } from '@/components/dashboard/module-metrics/module-metrics';
import { ModuleNavbar } from '@/components/layout/module-navbar';
import { CTMSStatsCards } from '@/components/clinical-trials/ctms-stats-cards';
import { CTMSProjectTabs } from '@/components/clinical-trials/ctms-project-tabs';
import { CreateProjectForm } from '@/components/create-project-form';
import { CreateOrganizationPromptDialog } from '@/components/dashboard/create-organization-prompt-dialog';
import { getClinicalProtocols } from '@/lib/actions/clinical-protocols';
import { getClinicalTrialsStats } from '@/lib/actions/clinical-trials-stats';
import { getContactsOrganizationsStats } from '@/lib/actions/organizations';
import type {
  ClinicalProtocolWithRelations,
  ClinicalTrialsStats,
} from '@/lib/types/clinical-trials';
import type { DashboardModuleMetric } from '@/lib/types/dashboard-metrics';

interface DashboardPageClientProps {
  companyId: string;
  profileId: string;
  email: string;
  protocolId: string;
  protocol: { id: string; protocol_number: string; title: string };
  moduleMetrics: DashboardModuleMetric[];
  firstName?: string | null;
}

export function DashboardPageClient({
  companyId,
  profileId,
  email,
  protocolId,
  protocol,
  moduleMetrics,
  firstName,
}: DashboardPageClientProps) {
  const router = useRouter();
  const [protocols, setProtocols] = useState<ClinicalProtocolWithRelations[]>([]);
  const [stats, setStats] = useState<ClinicalTrialsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateOrgPrompt, setShowCreateOrgPrompt] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [protocolsResult, statsResult, contactsOrgsResult] = await Promise.all([
        getClinicalProtocols(companyId, { pageSize: 100, protocol_id: protocolId }),
        getClinicalTrialsStats(companyId, protocolId),
        getContactsOrganizationsStats(companyId),
      ]);
      if (protocolsResult.success && protocolsResult.data) {
        setProtocols(protocolsResult.data.protocols);
      }
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }
      if (
        contactsOrgsResult.success &&
        contactsOrgsResult.data &&
        contactsOrgsResult.data.total_organizations === 0 &&
        contactsOrgsResult.data.total_contacts === 0
      ) {
        setShowCreateOrgPrompt(true);
      }
    } finally {
      setLoading(false);
    }
  }, [companyId, protocolId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleProjectClick = (p: ClinicalProtocolWithRelations) => {
    router.push(`/protected/clinical-trials/project/${p.id}`);
  };

  return (
    <CTMSProvider companyId={companyId} profileId={profileId} email={email}>
      <div className="flex flex-col gap-4">
        {/* Welcome Message */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Greeting firstName={firstName} />
          <Suspense fallback={<div className="h-10" />}>
            <ModuleNavbar />
          </Suspense>
        </div>

        {/* Protocol Info */}
        <div className="flex w-[360px] flex-wrap items-center gap-2 px-3 sm:px-4 py-2 mb-2 bg-card border border-input rounded-lg text-xs">
          <span className="text-muted-foreground">You are now viewing study data for</span>
          <span className="font-semibold text-foreground">{protocol.title}</span>
        </div>

        {/* Stats Row */}
        <CTMSStatsCards stats={stats} isScopedToStudy />

        {/* Project Tabs and Table */}
        <CTMSProjectTabs
          protocols={protocols}
          onProjectClick={handleProjectClick}
          loading={loading}
        />

        {/* Module Metrics */}
        <ModuleMetrics metrics={moduleMetrics} />
      </div>

      <CreateProjectForm
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onSuccess={() => {
          setShowCreateProject(false);
          loadData();
          router.refresh();
        }}
      />

      <CreateOrganizationPromptDialog
        open={showCreateOrgPrompt}
        onOpenChange={setShowCreateOrgPrompt}
        companyId={companyId}
        profileId={profileId}
        userEmail={email}
        onCreateSuccess={() => {
          loadData();
          router.refresh();
        }}
      />
    </CTMSProvider>
  );
}
