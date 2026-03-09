'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, FolderOpen, Globe, Building2, Users } from 'lucide-react';
import type { ClinicalTrialsStats } from '@/lib/types/clinical-trials';

interface CTMSStatsCardsProps {
  stats: ClinicalTrialsStats | null;
  isScopedToStudy?: boolean;
  showProjectCard?: boolean;
}

export function CTMSStatsCards({
  stats,
  isScopedToStudy = false,
  showProjectCard = false,
}: CTMSStatsCardsProps) {
  if (!stats) return null;

  const countriesLabel = isScopedToStudy ? 'Countries' : 'Total Countries';
  const sitesLabel = isScopedToStudy ? 'Sites' : 'Total Sites';
  const projectGroupsLabel = isScopedToStudy ? 'Project Groups' : 'Project Groups';
  const subjectsLabel = isScopedToStudy ? 'Subjects' : 'Total Subjects';

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {showProjectCard && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Projects</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_protocols ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active_protocols ?? 0} active
            </p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium">{countriesLabel}</CardTitle>
          <Globe className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_regions}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium">{sitesLabel}</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_sites}</div>
          <p className="text-xs text-muted-foreground">{stats.enrolling_sites} enrolling</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium">{projectGroupsLabel}</CardTitle>
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_programs}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium">{subjectsLabel}</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_subjects}</div>
          <p className="text-xs text-muted-foreground">{stats.enrolled_subjects} enrolled</p>
        </CardContent>
      </Card>
    </div>
  );
}
