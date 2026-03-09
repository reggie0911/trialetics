'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen, Globe, Building2, Users } from 'lucide-react';
import { ModuleNavbar } from '@/components/layout/module-navbar';
import { getClinicalTrialsStats } from '@/lib/actions/clinical-trials-stats';
import type { ClinicalTrialsStats } from '@/lib/types/clinical-trials';
import { ProtocolsTab } from './protocols-tab';
import { RegionsTab } from './regions-tab';
import { SitesTab } from './sites-tab';
import { SubjectsTab } from './subjects-tab';

interface ClinicalTrialsPageClientProps {
  companyId: string;
  profileId: string;
  email: string;
}

export function ClinicalTrialsPageClient({
  companyId,
  profileId,
  email,
}: ClinicalTrialsPageClientProps) {
  const [stats, setStats] = useState<ClinicalTrialsStats | null>(null);
  const [activeTab, setActiveTab] = useState('protocols');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadStats = useCallback(async () => {
    const result = await getClinicalTrialsStats(companyId);
    if (result.success && result.data) {
      setStats(result.data);
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
          <h1 className="text-2xl font-semibold">CTMS</h1>
          <p className="text-sm text-muted-foreground">
            Manage project groups, projects, countries, sites, and subjects
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
              <CardTitle className="text-xs font-medium">Total Countries</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_regions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Total Sites</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_sites}</div>
              <p className="text-xs text-muted-foreground">
                {stats.enrolling_sites} enrolling
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Project Groups</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_programs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Total Subjects</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_subjects}</div>
              <p className="text-xs text-muted-foreground">
                {stats.enrolled_subjects} enrolled
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs - deferred to client to avoid Radix ID hydration mismatch */}
      <Card className="flex-1">
        {mounted ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <CardHeader>
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="protocols" className="text-xs">
                Projects
              </TabsTrigger>
              <TabsTrigger value="regions" className="text-xs">
                Countries
              </TabsTrigger>
              <TabsTrigger value="sites" className="text-xs">
                Sites
              </TabsTrigger>
              <TabsTrigger value="subjects" className="text-xs">
                Subjects
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="h-[calc(100%-5rem)] overflow-auto">
            <TabsContent value="protocols" className="mt-0 h-full">
              {activeTab === 'protocols' && (
                <ProtocolsTab
                  companyId={companyId}
                  profileId={profileId}
                  email={email}
                  onDataChange={loadStats}
                />
              )}
            </TabsContent>
            <TabsContent value="regions" className="mt-0 h-full">
              {activeTab === 'regions' && (
                <RegionsTab
                  companyId={companyId}
                  onDataChange={loadStats}
                />
              )}
            </TabsContent>
            <TabsContent value="sites" className="mt-0 h-full">
              {activeTab === 'sites' && (
                <SitesTab
                  companyId={companyId}
                  profileId={profileId}
                  email={email}
                  onDataChange={loadStats}
                />
              )}
            </TabsContent>
            <TabsContent value="subjects" className="mt-0 h-full">
              {activeTab === 'subjects' && (
                <SubjectsTab
                  companyId={companyId}
                  profileId={profileId}
                  email={email}
                  onDataChange={loadStats}
                />
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
        ) : (
          <>
            <CardHeader>
              <div className="h-9 rounded-lg bg-muted/50 animate-pulse max-w-2xl" />
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
