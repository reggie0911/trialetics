'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EdcTab } from './edc-tab';
import { SafetyTab } from './safety-tab';
import { FinanceTab } from './finance-tab';
import { getIntegrationConfigs, getSyncLogs } from '@/lib/actions/integrations';
import { getSafetyStats } from '@/lib/actions/safety-integration';
import { getExportConfigs } from '@/lib/actions/financial-integration';

interface IntegrationsClientProps {
  companyId: string;
  profileId: string;
  defaultTab?: string;
}

export function IntegrationsClient({ companyId, profileId, defaultTab = 'edc' }: IntegrationsClientProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [totalConfigs, setTotalConfigs] = useState(0);
  const [activeSyncs, setActiveSyncs] = useState(0);
  const [safetyTotal, setSafetyTotal] = useState(0);
  const [financeConfigs, setFinanceConfigs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    const [cfgRes, logRes, safetyRes, financeRes] = await Promise.all([
      getIntegrationConfigs(companyId, { pageSize: 1 }),
      getSyncLogs(companyId),
      getSafetyStats(companyId),
      getExportConfigs(companyId, { pageSize: 1 }),
    ]);
    if (cfgRes.success && cfgRes.data) setTotalConfigs(cfgRes.data.total);
    if (logRes.success && logRes.data) {
      setActiveSyncs(logRes.data.filter((l) => l.status === 'running' || l.status === 'pending').length);
    }
    if (safetyRes.success && safetyRes.data) setSafetyTotal(safetyRes.data.total);
    if (financeRes.success && financeRes.data) setFinanceConfigs(financeRes.data.total);
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="space-y-4">
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Configs</p>
            <p className="text-xl font-semibold">{totalConfigs}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Active Syncs</p>
            <p className="text-xl font-semibold">{activeSyncs}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Safety Records</p>
            <p className="text-xl font-semibold">{safetyTotal}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Export Configs</p>
            <p className="text-xl font-semibold">{financeConfigs}</p>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="edc">EDC</TabsTrigger>
          <TabsTrigger value="safety">Safety</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
        </TabsList>
        <TabsContent value="edc" className="mt-4">
          <EdcTab companyId={companyId} />
        </TabsContent>
        <TabsContent value="safety" className="mt-4">
          <SafetyTab companyId={companyId} />
        </TabsContent>
        <TabsContent value="finance" className="mt-4">
          <FinanceTab companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
