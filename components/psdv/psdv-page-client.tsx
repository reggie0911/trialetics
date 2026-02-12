'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Building2, Users, ClipboardCheck } from 'lucide-react';
import { ModuleNavbar } from '@/components/layout/module-navbar';
import { getPsdvStats, getPsdvChartData, type PsdvStats } from '@/lib/actions/psdv';
import { ProtocolPsdvTab } from './protocol-psdv-tab';
import { RegionPsdvTab } from './region-psdv-tab';
import { SitePsdvTab } from './site-psdv-tab';
import { SubjectPsdvTab } from './subject-psdv-tab';
import { TemplateVisitPsdvTab } from './template-visit-psdv-tab';
import { CrfTrackingTab } from './crf-tracking-tab';
import { PsdvCharts } from './psdv-charts';

interface PsdvPageClientProps {
  companyId: string;
  profileId: string;
  email: string;
}

export function PsdvPageClient({
  companyId,
  profileId,
  email,
}: PsdvPageClientProps) {
  const [stats, setStats] = useState<PsdvStats | null>(null);
  const [chartData, setChartData] = useState<Awaited<ReturnType<typeof getPsdvChartData>>['data'] | null>(null);
  const [activeTab, setActiveTab] = useState('protocols');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const statsResult = await getPsdvStats(companyId);
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      } else {
        setStats({
          protocolsWithPsdv: 0,
          sitesWithPartialSdv: 0,
          subjectsRequiringSdv: 0,
          crfsPendingVerification: 0,
        });
      }
    } catch {
      setStats({
        protocolsWithPsdv: 0,
        sitesWithPartialSdv: 0,
        subjectsRequiringSdv: 0,
        crfsPendingVerification: 0,
      });
    }
    try {
      const chartResult = await getPsdvChartData(companyId);
      if (chartResult.success && chartResult.data) {
        setChartData(chartResult.data);
      } else {
        setChartData(null);
      }
    } catch {
      setChartData(null);
    }
  }, [companyId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="flex h-full flex-col gap-4 bg-[#E9E9E9] p-6">
      {/* Header with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Source Data Verification</h1>
          <p className="text-sm text-muted-foreground">
            Manage partial source data verification settings for protocols, regions, sites, and subjects
          </p>
        </div>
        <Suspense fallback={<div className="h-10" />}>
          <ModuleNavbar />
        </Suspense>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Total Protocols with PSDV</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.protocolsWithPsdv}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Sites with Partial SDV</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sitesWithPartialSdv}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Subjects Requiring SDV</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.subjectsRequiringSdv}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">CRFs Pending Verification</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.crfsPendingVerification}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {chartData && <PsdvCharts chartData={chartData} />}

      {/* Tabs */}
      <Card className="flex-1">
        {mounted ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <CardHeader>
              <TabsList className="grid w-full max-w-3xl grid-cols-6">
                <TabsTrigger value="protocols" className="text-xs">
                  Protocols
                </TabsTrigger>
                <TabsTrigger value="regions" className="text-xs">
                  Regions
                </TabsTrigger>
                <TabsTrigger value="sites" className="text-xs">
                  Sites
                </TabsTrigger>
                <TabsTrigger value="subjects" className="text-xs">
                  Subjects
                </TabsTrigger>
                <TabsTrigger value="visit-templates" className="text-xs">
                  Visit Templates
                </TabsTrigger>
                <TabsTrigger value="crf-tracking" className="text-xs">
                  CRF Tracking
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="h-[calc(100%-5rem)] overflow-auto">
              <TabsContent value="protocols" className="mt-0 h-full">
                {activeTab === 'protocols' && (
                  <ProtocolPsdvTab
                    companyId={companyId}
                    onDataChange={loadStats}
                  />
                )}
              </TabsContent>
              <TabsContent value="regions" className="mt-0 h-full">
                {activeTab === 'regions' && (
                  <RegionPsdvTab
                    companyId={companyId}
                    onDataChange={loadStats}
                  />
                )}
              </TabsContent>
              <TabsContent value="sites" className="mt-0 h-full">
                {activeTab === 'sites' && (
                  <SitePsdvTab
                    companyId={companyId}
                    onDataChange={loadStats}
                  />
                )}
              </TabsContent>
              <TabsContent value="subjects" className="mt-0 h-full">
                {activeTab === 'subjects' && (
                  <SubjectPsdvTab
                    companyId={companyId}
                    onDataChange={loadStats}
                  />
                )}
              </TabsContent>
              <TabsContent value="visit-templates" className="mt-0 h-full">
                {activeTab === 'visit-templates' && (
                  <TemplateVisitPsdvTab
                    companyId={companyId}
                    onDataChange={loadStats}
                  />
                )}
              </TabsContent>
              <TabsContent value="crf-tracking" className="mt-0 h-full">
                {activeTab === 'crf-tracking' && (
                  <CrfTrackingTab
                    companyId={companyId}
                    onDataChange={loadStats}
                  />
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        ) : (
          <>
            <CardHeader>
              <div className="h-9 rounded-lg bg-muted/50 animate-pulse max-w-3xl" />
            </CardHeader>
            <CardContent className="h-[calc(100%-5rem)] flex items-center justify-center">
              <div className="text-muted-foreground text-sm">Loading...</div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
