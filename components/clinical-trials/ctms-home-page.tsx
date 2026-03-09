'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getClinicalProtocols } from '@/lib/actions/clinical-protocols';
import { getClinicalTrialsStats } from '@/lib/actions/clinical-trials-stats';
import type {
  ClinicalProtocolWithRelations,
  ClinicalTrialsStats,
} from '@/lib/types/clinical-trials';
import { useCTMS } from './ctms-context';
import { CTMSPageHeader } from './ctms-layout';
import { CTMSStatsCards } from './ctms-stats-cards';
import { CTMSProjectTabs } from './ctms-project-tabs';
import { CreateProjectForm } from '@/components/create-project-form';

export function CTMSHomePage() {
  const { companyId, setSelectedProject } = useCTMS();
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

  const handleProjectClick = (protocol: ClinicalProtocolWithRelations) => {
    setSelectedProject({
      id: protocol.id,
      name: protocol.title,
      protocol_number: protocol.protocol_number,
      status: protocol.status,
    });
    router.push(`/protected/clinical-trials/project/${protocol.id}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <CTMSPageHeader
        title="Clinical Trial Management"
        subtitle="Manage projects, countries, sites, and enrollment across your clinical trials"
      />
      <CTMSStatsCards stats={stats} />
      <CTMSProjectTabs
        protocols={protocols}
        onProjectClick={handleProjectClick}
        loading={loading}
      />
      <CreateProjectForm
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onSuccess={() => {
          setShowCreateProject(false);
          loadData();
        }}
      />
    </div>
  );
}
