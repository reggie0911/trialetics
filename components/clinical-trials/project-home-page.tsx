'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Globe, Building2, Edit, ChevronRight, Plus } from 'lucide-react';
import { getClinicalProtocol } from '@/lib/actions/clinical-protocols';
import { getClinicalRegions } from '@/lib/actions/clinical-regions';
import { getClinicalSites } from '@/lib/actions/clinical-sites';
import { getTeamAssignments } from '@/lib/actions/team-assignments';
import type {
  ClinicalProtocolWithRelations,
  ClinicalRegionWithRelations,
  ClinicalSiteWithRelations,
  ProtocolTeamWithRelations,
} from '@/lib/types/clinical-trials';
import { PROTOCOL_PHASE_LABELS, PROTOCOL_STATUS_LABELS, SITE_STATUS_LABELS, TEAM_ROLE_LABELS } from '@/lib/types/clinical-trials';
import { useCTMS } from './ctms-context';
import { CTMSPageHeader } from './ctms-layout';
import { ProtocolFormDialog } from './protocol-form-dialog';
import { RegionFormDialog } from './region-form-dialog';
import { SiteFormDialog } from './site-form-dialog';
import { MilestonesTab } from './milestones-tab';
import { ProjectTeamPage } from './project-team-page';
import { ProjectDashboardPage } from './project-dashboard-page';
import { ProjectDocumentsPage } from './project-documents-page';
import { ProjectEventsPage } from './project-events-page';
import { ProjectTasksPage } from './project-tasks-page';
import { ProjectSubjectsPage } from './project-subjects-page';
import { ProjectSvrPage } from './project-svr-page';

interface ProjectHomePageProps {
  projectId: string;
}

export function ProjectHomePage({ projectId }: ProjectHomePageProps) {
  const { companyId, profileId, email, setSelectedProject, setSelectedCountry, setSelectedSite } = useCTMS();
  const router = useRouter();
  const [protocol, setProtocol] = useState<ClinicalProtocolWithRelations | null>(null);
  const [regions, setRegions] = useState<ClinicalRegionWithRelations[]>([]);
  const [sites, setSites] = useState<ClinicalSiteWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addCountryDialogOpen, setAddCountryDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<ClinicalRegionWithRelations | null>(null);
  const [addSiteDialogOpen, setAddSiteDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<ClinicalSiteWithRelations | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [protocolResult, regionsResult, sitesResult] = await Promise.all([
        getClinicalProtocol(projectId),
        getClinicalRegions(companyId, { protocol_id: projectId, pageSize: 100 }),
        getClinicalSites(companyId, { protocol_id: projectId, pageSize: 100 }),
      ]);

      if (protocolResult.success && protocolResult.data) {
        const p = protocolResult.data;
        setProtocol(p);
        setSelectedProject({
          id: p.id,
          name: p.title,
          protocol_number: p.protocol_number,
          status: p.status,
        });
      }
      if (regionsResult.success && regionsResult.data) {
        setRegions(regionsResult.data.regions);
      }
      if (sitesResult.success && sitesResult.data) {
        setSites(sitesResult.data.sites);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, companyId, setSelectedProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-xs text-muted-foreground">
        Loading project...
      </div>
    );
  }

  if (!protocol) {
    return (
      <div className="flex items-center justify-center h-64 text-xs text-muted-foreground">
        Project not found
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <CTMSPageHeader title={protocol.title} subtitle={protocol.protocol_number} />
      <div className="flex items-center gap-2">
        <Badge variant={protocol.status === 'in_progress' ? 'default' : 'secondary'} className="text-xs">
          {PROTOCOL_STATUS_LABELS[protocol.status]}
        </Badge>
        {protocol.phase && (
          <Badge variant="outline" className="text-xs">{PROTOCOL_PHASE_LABELS[protocol.phase]}</Badge>
        )}
        {protocol.program && (
          <Badge variant="outline" className="text-xs">
            Group: {protocol.program.name}
          </Badge>
        )}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="details" className="text-xs">Project Details</TabsTrigger>
          <TabsTrigger value="team" className="text-xs">Team</TabsTrigger>
          <TabsTrigger value="countries" className="text-xs">Countries</TabsTrigger>
          <TabsTrigger value="sites" className="text-xs">Sites</TabsTrigger>
          <TabsTrigger value="milestones" className="text-xs">Milestones</TabsTrigger>
          <TabsTrigger value="dashboard" className="text-xs">Dashboard</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
          <TabsTrigger value="events" className="text-xs">Events</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs">Tasks</TabsTrigger>
          <TabsTrigger value="subjects" className="text-xs">Subjects</TabsTrigger>
          <TabsTrigger value="svr" className="text-xs">SVR</TabsTrigger>
        </TabsList>
        <div className="mt-4">
            {/* Project Details Tab */}
            <TabsContent value="details" className="mt-0">
              <div className="rounded-md border bg-card">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <h3 className="text-xs font-medium">Project Details</h3>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => setEditDialogOpen(true)}>
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Project Number</Label>
                    <p className="text-xs font-medium">{protocol.protocol_number}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Title</Label>
                    <p className="text-xs">{protocol.title}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Objective</Label>
                    <p className="text-xs">{protocol.objective || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <p className="text-xs">{PROTOCOL_STATUS_LABELS[protocol.status]}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Phase</Label>
                    <p className="text-xs">{protocol.phase ? PROTOCOL_PHASE_LABELS[protocol.phase] : 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Project Group</Label>
                    <p className="text-xs">{protocol.program?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Design</Label>
                    <p className="text-xs capitalize">{protocol.design?.replace('_', ' ') || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <p className="text-xs capitalize">{protocol.type || 'Production'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Sponsor</Label>
                    <p className="text-xs">{protocol.sponsor || protocol.sponsor_organization?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Planned Start</Label>
                    <p className="text-xs">{protocol.planned_start_date || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Planned End</Label>
                    <p className="text-xs">{protocol.planned_end_date || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Planned Sites</Label>
                    <p className="text-xs">{protocol.planned_sites_count ?? 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Planned Subjects</Label>
                    <p className="text-xs">{protocol.planned_subjects_count ?? 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Test Article</Label>
                    <p className="text-xs">{protocol.test_article || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Therapeutic Group</Label>
                    <p className="text-xs">{protocol.therapeutic_group || 'N/A'}</p>
                  </div>
                </div>
                </div>
              </div>
            </TabsContent>

            {/* Team Tab */}
            <TabsContent value="team" className="mt-0">
              <ProjectTeamPage projectId={projectId} embedded />
            </TabsContent>

            {/* Countries Tab */}
            <TabsContent value="countries" className="mt-0">
              <div className="rounded-md border bg-card">
                <div className="flex items-center justify-between px-4 py-3">
                  <h3 className="text-xs font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Countries
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setAddCountryDialogOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Country
                  </Button>
                </div>
                <div className="px-4 pb-4">
                  {regions.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-8 text-center">
                      <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No countries assigned to this project.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="bg-muted/50 text-xs font-medium">Country Name</TableHead>
                          <TableHead className="bg-muted/50 text-xs font-medium text-center">Planned Sites</TableHead>
                          <TableHead className="bg-muted/50 text-xs font-medium text-center">Planned Subjects</TableHead>
                          <TableHead className="bg-muted/50 text-xs font-medium">Start Date</TableHead>
                          <TableHead className="bg-muted/50 text-xs font-medium">End Date</TableHead>
                          <TableHead className="bg-muted/50 text-xs font-medium">Currency</TableHead>
                          <TableHead className="bg-muted/50 text-xs font-medium w-[60px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {regions.map((region) => (
                          <TableRow
                            key={region.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              setSelectedCountry({ id: region.id, name: region.region_name });
                              router.push(`/protected/clinical-trials/project/${projectId}/country/${region.id}`);
                            }}
                          >
                            <TableCell className="text-xs font-medium text-blue-600">
                              {region.region_name}
                              <ChevronRight className="h-3 w-3 inline ml-1" />
                            </TableCell>
                            <TableCell className="text-xs text-center">{region.planned_sites_count ?? '-'}</TableCell>
                            <TableCell className="text-xs text-center">{region.planned_subjects_count ?? '-'}</TableCell>
                            <TableCell className="text-xs">{region.planned_start_date || '-'}</TableCell>
                            <TableCell className="text-xs">{region.planned_end_date || '-'}</TableCell>
                            <TableCell className="text-xs">{region.currency_code || '-'}</TableCell>
                            <TableCell className="text-xs p-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-accent hover:text-accent-foreground"
                                onClick={() => setEditingRegion(region)}
                                title="Edit country"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Sites Tab */}
            <TabsContent value="sites" className="mt-0">
              <div className="rounded-md border bg-card">
                <div className="flex items-center justify-between px-4 py-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Sites
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddSiteDialogOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Site
                  </Button>
                </div>
                <div className="px-4 pb-4">
                  {sites.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-8 text-center">
                      <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No sites assigned to this project.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="bg-muted/50 text-xs font-medium">Site #</TableHead>
                          <TableHead className="bg-muted/50 text-xs font-medium">Institution</TableHead>
                          <TableHead className="bg-muted/50 text-xs font-medium">Country</TableHead>
                          <TableHead className="bg-muted/50 text-xs font-medium">Status</TableHead>
                          <TableHead className="bg-muted/50 text-xs font-medium">PI</TableHead>
                          <TableHead className="bg-muted/50 text-xs font-medium text-center">Enrolled Subjects</TableHead>
                          <TableHead className="bg-muted/50 text-xs font-medium w-[60px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sites.map((site) => (
                          <TableRow
                            key={site.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              setSelectedSite({
                                id: site.id,
                                site_number: site.site_number,
                                organization_name: site.organization?.name || null,
                              });
                              router.push(`/protected/clinical-trials/project/${projectId}/site/${site.id}`);
                            }}
                          >
                            <TableCell className="text-xs font-medium text-blue-600">
                              {site.site_number || 'N/A'}
                              <ChevronRight className="h-3 w-3 inline ml-1" />
                            </TableCell>
                            <TableCell className="text-xs">{site.organization?.name || 'N/A'}</TableCell>
                            <TableCell className="text-xs">{site.country_region || site.region?.region_name || '-'}</TableCell>
                            <TableCell className="text-xs">
                              <Badge variant="outline" className="text-xs">
                                {SITE_STATUS_LABELS[site.status]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {site.principal_investigator
                                ? `${site.principal_investigator.first_name || ''} ${site.principal_investigator.last_name || ''}`.trim()
                                : '-'}
                            </TableCell>
                            <TableCell className="text-xs text-center">{site.enrolled_subject_count ?? 0}</TableCell>
                            <TableCell className="text-xs p-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-accent hover:text-accent-foreground"
                                onClick={() => setEditingSite(site)}
                                title="Edit site"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Milestones Tab */}
            <TabsContent value="milestones" className="mt-0">
              <MilestonesTab protocolId={projectId} />
            </TabsContent>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="mt-0">
              <ProjectDashboardPage projectId={projectId} embedded />
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-0">
              <ProjectDocumentsPage projectId={projectId} embedded />
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="mt-0">
              <ProjectEventsPage projectId={projectId} embedded />
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="mt-0">
              <ProjectTasksPage projectId={projectId} embedded />
            </TabsContent>

            {/* Subjects Tab */}
            <TabsContent value="subjects" className="mt-0">
              <ProjectSubjectsPage projectId={projectId} embedded />
            </TabsContent>

            {/* SVR Tab */}
            <TabsContent value="svr" className="mt-0">
              <ProjectSvrPage projectId={projectId} embedded />
            </TabsContent>
          </div>
        </Tabs>

      {/* Edit Project/Protocol Dialog */}
      <ProtocolFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        companyId={companyId}
        profileId={profileId}
        email={email}
        protocol={protocol}
        onSuccess={(updated) => {
          setEditDialogOpen(false);
          if (updated) {
            // Use the freshly-returned data directly — avoids any stale re-fetch
            setProtocol((prev) => prev ? { ...prev, ...updated } : prev);
          } else {
            loadData();
          }
        }}
      />

      {/* Add/Edit Country Dialog */}
      <RegionFormDialog
        open={addCountryDialogOpen || !!editingRegion}
        onOpenChange={(open) => {
          if (!open) {
            setAddCountryDialogOpen(false);
            setEditingRegion(null);
          }
        }}
        companyId={companyId}
        region={editingRegion}
        defaultProtocolId={addCountryDialogOpen ? projectId : undefined}
        defaultProtocolDisplay={addCountryDialogOpen && protocol ? `${protocol.protocol_number} - ${protocol.title}` : undefined}
        onSuccess={() => {
          setAddCountryDialogOpen(false);
          setEditingRegion(null);
          loadData();
        }}
      />

      {/* Add/Edit Site Dialog */}
      <SiteFormDialog
        open={addSiteDialogOpen || !!editingSite}
        onOpenChange={(open) => {
          if (!open) {
            setAddSiteDialogOpen(false);
            setEditingSite(null);
          }
        }}
        companyId={companyId}
        profileId={profileId}
        userEmail={email}
        defaultProtocolId={addSiteDialogOpen ? projectId : undefined}
        site={editingSite}
        onSuccess={() => {
          setAddSiteDialogOpen(false);
          setEditingSite(null);
          loadData();
        }}
      />
    </div>
  );
}
