'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CTMSProvider } from '@/components/clinical-trials/ctms-context';
import { CTMSStatsCards } from '@/components/clinical-trials/ctms-stats-cards';
import { CTMSProjectTabs } from '@/components/clinical-trials/ctms-project-tabs';
import { CreateProjectForm } from '@/components/create-project-form';
import { getClinicalProtocols } from '@/lib/actions/clinical-protocols';
import { getClinicalTrialsStats } from '@/lib/actions/clinical-trials-stats';
import type {
  ClinicalProtocolWithRelations,
  ClinicalTrialsStats,
} from '@/lib/types/clinical-trials';

interface ProjectSelectorPageProps {
  companyId: string;
  profileId: string;
  email: string;
  firstName?: string | null;
}

export function ProjectSelectorPage({
  companyId,
  profileId,
  email,
  firstName,
}: ProjectSelectorPageProps) {
  const router = useRouter();
  const [protocols, setProtocols] = useState<ClinicalProtocolWithRelations[]>([]);
  const [stats, setStats] = useState<ClinicalTrialsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [protocolsResult, statsResult] = await Promise.all([
        getClinicalProtocols(companyId, { pageSize: 100 }),
        getClinicalTrialsStats(companyId),
      ]);
      if (protocolsResult.success && protocolsResult.data) {
        setProtocols(protocolsResult.data.protocols);
      }
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleProjectClick = (p: ClinicalProtocolWithRelations) => {
    router.push(`/protected/dashboard?protocolId=${p.id}`);
  };

  return (
    <CTMSProvider companyId={companyId} profileId={profileId} email={email}>
      <div className="flex flex-col gap-4">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-[32px] font-semibold mb-1 tracking-[-1px]">
            {firstName ? `Welcome, ${firstName}` : 'Welcome'}
          </h1>
          <p className="text-xs text-muted-foreground">
            Select a project below to get started
          </p>
        </div>

        <CTMSStatsCards stats={stats} showProjectCard />

        <CTMSProjectTabs
          protocols={protocols}
          onProjectClick={handleProjectClick}
          loading={loading}
        />
      </div>

      <CreateProjectForm
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onSuccess={() => {
          setShowCreateProject(false);
          loadData();
        }}
      />
    </CTMSProvider>
  );
}
