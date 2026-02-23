'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getRetentionDashboard } from '@/lib/actions/patient-engagement';
import type { RetentionDashboardData } from '@/lib/types/patient-engagement';
import { RetentionDashboard } from './retention-dashboard';
import { RetentionMilestoneTable } from './retention-milestone-table';
import { EngagementActivityLog } from './engagement-activity-log';
import { RiskFlagPanel } from './risk-flag-panel';
import { RetentionSiteComparison } from './retention-site-comparison';
import { SubjectRetentionGrid } from './subject-retention-grid';

interface PatientEngagementClientProps {
  companyId: string;
  profileId: string;
}

export function PatientEngagementClient({ companyId, profileId }: PatientEngagementClientProps) {
  const [dashboard, setDashboard] = useState<RetentionDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await getRetentionDashboard(companyId);
    if (res.success && res.data) setDashboard(res.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [companyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Loading engagement data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {dashboard && <RetentionDashboard data={dashboard} />}

      <Tabs defaultValue="milestones" className="w-full">
        <TabsList>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="grid">Retention Grid</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="risks">Risk Flags</TabsTrigger>
          <TabsTrigger value="comparison">Site Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="milestones" className="mt-4">
          <RetentionMilestoneTable companyId={companyId} />
        </TabsContent>

        <TabsContent value="grid" className="mt-4">
          <SubjectRetentionGrid companyId={companyId} />
        </TabsContent>

        <TabsContent value="activities" className="mt-4">
          <EngagementActivityLog companyId={companyId} />
        </TabsContent>

        <TabsContent value="risks" className="mt-4">
          <RiskFlagPanel companyId={companyId} onRefresh={load} />
        </TabsContent>

        <TabsContent value="comparison" className="mt-4">
          <RetentionSiteComparison companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
