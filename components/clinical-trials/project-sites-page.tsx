'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getClinicalProtocol } from '@/lib/actions/clinical-protocols';
import { getClinicalSites } from '@/lib/actions/clinical-sites';
import { useCTMS } from './ctms-context';
import { SiteFormDialog } from './site-form-dialog';
import { SITE_STATUS_LABELS } from '@/lib/types/clinical-trials';
import type { ClinicalSiteWithRelations, ClinicalProtocolWithRelations } from '@/lib/types/clinical-trials';
import { Plus, Building2, ChevronRight } from 'lucide-react';
import { CTMSPageHeader } from './ctms-layout';

interface ProjectSitesPageProps {
  projectId: string;
}

export function ProjectSitesPage({ projectId }: ProjectSitesPageProps) {
  const { companyId, profileId, email, setSelectedProject, setSelectedSite } = useCTMS();
  const router = useRouter();
  const [protocol, setProtocol] = useState<ClinicalProtocolWithRelations | null>(null);
  const [sites, setSites] = useState<ClinicalSiteWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<ClinicalSiteWithRelations | null>(null);

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
        setSites(sitesResult.data.sites);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, companyId, setSelectedProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRowClick = (site: ClinicalSiteWithRelations) => {
    setSelectedSite({
      id: site.id,
      site_number: site.site_number,
      organization_name: site.organization?.name || null,
    });
    router.push(`/protected/clinical-trials/project/${projectId}/site/${site.id}`);
  };

  const handleSuccess = () => {
    loadData();
    setAddDialogOpen(false);
    setEditingSite(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Loading sites...
      </div>
    );
  }

  if (!protocol) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Project not found
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <CTMSPageHeader title="Project Sites" subtitle="Sites participating in this project" />
      <div className="rounded-md border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Sites
          </h3>
          <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Site
          </Button>
        </div>
        <div className="px-4 pb-4">
          {sites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                No sites assigned to this project.
              </p>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((site) => (
                  <TableRow
                    key={site.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleRowClick(site)}
                  >
                    <TableCell className="text-xs font-medium text-blue-600">
                      {site.site_number || 'N/A'}
                      <ChevronRight className="h-3 w-3 inline ml-1" />
                    </TableCell>
                    <TableCell className="text-xs">{site.organization?.name || 'N/A'}</TableCell>
                    <TableCell className="text-xs">{site.country_region || site.region?.region_name || '-'}</TableCell>
                    <TableCell className="text-xs">
                      {site.status ? (
                        <Badge variant="outline" className="text-xs">
                          {SITE_STATUS_LABELS[site.status]}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {site.principal_investigator
                        ? `${site.principal_investigator.first_name || ''} ${site.principal_investigator.last_name || ''}`.trim()
                        : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-center">{site.enrolled_subject_count ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {addDialogOpen && (
        <SiteFormDialog
          open={addDialogOpen}
          onOpenChange={(open) => {
            if (!open) setAddDialogOpen(false);
          }}
          companyId={companyId}
          profileId={profileId}
          userEmail={email}
          defaultProtocolId={projectId}
          onSuccess={handleSuccess}
        />
      )}

      {editingSite && (
        <SiteFormDialog
          open={!!editingSite}
          onOpenChange={(open) => {
            if (!open) setEditingSite(null);
          }}
          companyId={companyId}
          profileId={profileId}
          userEmail={email}
          site={editingSite}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
