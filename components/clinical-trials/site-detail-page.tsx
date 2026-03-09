'use client';

import { useState, useEffect, useCallback } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { getClinicalProtocol } from '@/lib/actions/clinical-protocols';
import { getClinicalSites } from '@/lib/actions/clinical-sites';
import { getSubjects } from '@/lib/actions/subjects';
import { useCTMS } from './ctms-context';
import { CTMSPageHeader } from './ctms-layout';
import { SITE_STATUS_LABELS, SUBJECT_STATUS_LABELS } from '@/lib/types/clinical-trials';
import type { ClinicalSiteWithRelations, ClinicalProtocolWithRelations } from '@/lib/types/clinical-trials';
import {
  Building2,
  FileText,
  DollarSign,
  UserCheck,
  Ban,
  Users,
  FolderOpen,
  UserCircle,
} from 'lucide-react';

interface SiteDetailPageProps {
  projectId: string;
  siteId: string;
}

export function SiteDetailPage({ projectId, siteId }: SiteDetailPageProps) {
  const { companyId, setSelectedProject, setSelectedSite } = useCTMS();
  const [protocol, setProtocol] = useState<ClinicalProtocolWithRelations | null>(null);
  const [site, setSite] = useState<ClinicalSiteWithRelations | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [protocolResult, sitesResult] = await Promise.all([
        getClinicalProtocol(projectId),
        getClinicalSites(companyId, { protocol_id: projectId, pageSize: 200 }),
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

      if (sitesResult.success && sitesResult.data) {
        const found = sitesResult.data.sites.find((s) => s.id === siteId);
        setSite(found || null);
        if (found) {
          setSelectedSite({
            id: found.id,
            site_number: found.site_number,
            organization_name: found.organization?.name || null,
          });
        }
      }

      // Load subjects for this site
      const subjectsResult = await getSubjects(companyId, { site_id: siteId, pageSize: 200 });
      if (subjectsResult.success && subjectsResult.data) {
        setSubjects(subjectsResult.data.subjects || []);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, siteId, companyId, setSelectedProject, setSelectedSite]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Loading site...
      </div>
    );
  }

  if (!site || site.protocol_id !== projectId) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Site not found
      </div>
    );
  }

  const piName = site.principal_investigator
    ? `${site.principal_investigator.first_name || ''} ${site.principal_investigator.last_name || ''}`.trim()
    : null;

  return (
    <div className="flex flex-col gap-4">
      <CTMSPageHeader title={site.site_number || 'Site'} subtitle={site.organization?.name || 'N/A'} />
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={site.status === 'enrolling' ? 'default' : 'secondary'} className="text-xs">
            {site.status ? SITE_STATUS_LABELS[site.status] : '-'}
          </Badge>
          {piName && (
            <span className="text-xs text-muted-foreground">PI: {piName}</span>
          )}
        </div>
      </div>

      <Tabs defaultValue="site">
        <TabsList>
          <TabsTrigger value="site" className="text-xs">
            <Building2 className="h-3.5 w-3.5 mr-1" />
            Site
          </TabsTrigger>
          <TabsTrigger value="memo" className="text-xs">Memo</TabsTrigger>
          <TabsTrigger value="finance" className="text-xs">
            <DollarSign className="h-3.5 w-3.5 mr-1" />
            Finance
          </TabsTrigger>
          <TabsTrigger value="key-roles" className="text-xs">
            <UserCheck className="h-3.5 w-3.5 mr-1" />
            Key Roles
          </TabsTrigger>
          <TabsTrigger value="exclusions" className="text-xs">
            <Ban className="h-3.5 w-3.5 mr-1" />
            Exclusions
          </TabsTrigger>
          <TabsTrigger value="staff" className="text-xs">
            <Users className="h-3.5 w-3.5 mr-1" />
            Staff
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs">
            <FolderOpen className="h-3.5 w-3.5 mr-1" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="enrollment" className="text-xs">
            <UserCircle className="h-3.5 w-3.5 mr-1" />
            Enrollment
          </TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="site" className="mt-0">
            <div className="rounded-md border bg-card p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Site Number</Label>
                    <p className="text-sm font-medium">{site.site_number || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <p className="text-sm">
                      {site.status ? SITE_STATUS_LABELS[site.status] : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Organization</Label>
                    <p className="text-sm">{site.organization?.name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Country</Label>
                    <p className="text-sm">{site.country_region || site.region?.region_name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Principal Investigator</Label>
                    <p className="text-sm">{piName || '-'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Study Coordinator</Label>
                    <p className="text-sm">-</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">IRB Approval Number</Label>
                    <p className="text-sm">{site.irb_approval_number || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">IRB Institution</Label>
                    <p className="text-sm">{site.irb_institution_name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">IRB Approval Date</Label>
                    <p className="text-sm">{site.irb_approval_date || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Site Initiated Date</Label>
                    <p className="text-sm">{site.site_initiated_date || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="memo" className="mt-0">
            <div className="rounded-md border bg-card p-4">
              <div className="text-sm text-muted-foreground py-6">
                {(site as any).memo ? (
                  <p className="whitespace-pre-wrap">{(site as any).memo}</p>
                ) : (
                  <p className="italic">No memo entered for this site.</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="finance" className="mt-0">
            <div className="rounded-md border bg-card p-4">
              <div className="text-sm text-muted-foreground py-8 text-center">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Site financial info coming soon.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="key-roles" className="mt-0">
            <div className="rounded-md border bg-card p-4">
              <div className="text-sm text-muted-foreground py-8 text-center">
                <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Key roles coming soon.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="exclusions" className="mt-0">
            <div className="rounded-md border bg-card p-4">
              <div className="text-sm text-muted-foreground py-8 text-center">
                <Ban className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Exclusions coming soon.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="staff" className="mt-0">
            <div className="rounded-md border bg-card p-4">
              <div className="text-sm text-muted-foreground py-8 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Site staff list coming soon.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <div className="rounded-md border bg-card p-4">
              <div className="text-sm text-muted-foreground py-8 text-center">
                <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Site documents coming soon.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="enrollment" className="mt-0">
            <div className="rounded-md border bg-card">
              {subjects.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  <UserCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No subjects enrolled at this site.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="bg-muted/50 text-xs font-medium">Subject #</TableHead>
                      <TableHead className="bg-muted/50 text-xs font-medium">Screening #</TableHead>
                      <TableHead className="bg-muted/50 text-xs font-medium">Status</TableHead>
                      <TableHead className="bg-muted/50 text-xs font-medium">Enrollment Date</TableHead>
                      <TableHead className="bg-muted/50 text-xs font-medium">Screening Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjects.map((subject) => (
                      <TableRow key={subject.id} className="hover:bg-muted/50">
                        <TableCell className="text-xs font-medium">{subject.subject_number || '-'}</TableCell>
                        <TableCell className="text-xs">{subject.screening_number || '-'}</TableCell>
                        <TableCell className="text-xs">
                          {subject.status ? (
                            <Badge variant="outline" className="text-xs">
                              {SUBJECT_STATUS_LABELS[subject.status as keyof typeof SUBJECT_STATUS_LABELS] || subject.status}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{subject.enrollment_date || '-'}</TableCell>
                        <TableCell className="text-xs">{subject.screening_date || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
