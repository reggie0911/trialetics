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
import { getClinicalProtocol } from '@/lib/actions/clinical-protocols';
import { getClinicalRegions } from '@/lib/actions/clinical-regions';
import { useCTMS } from './ctms-context';
import { RegionFormDialog } from './region-form-dialog';
import type { ClinicalRegionWithRelations, ClinicalProtocolWithRelations } from '@/lib/types/clinical-trials';
import { Plus, Globe, ChevronRight } from 'lucide-react';
import { CTMSPageHeader } from './ctms-layout';

interface ProjectCountriesPageProps {
  projectId: string;
}

export function ProjectCountriesPage({ projectId }: ProjectCountriesPageProps) {
  const { companyId, setSelectedProject, setSelectedCountry } = useCTMS();
  const router = useRouter();
  const [protocol, setProtocol] = useState<ClinicalProtocolWithRelations | null>(null);
  const [regions, setRegions] = useState<ClinicalRegionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<ClinicalRegionWithRelations | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [protocolResult, regionsResult] = await Promise.all([
        getClinicalProtocol(projectId),
        getClinicalRegions(companyId, { protocol_id: projectId, pageSize: 100 }),
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
    } finally {
      setLoading(false);
    }
  }, [projectId, companyId, setSelectedProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRowClick = (region: ClinicalRegionWithRelations) => {
    setSelectedCountry({ id: region.id, name: region.region_name });
    router.push(`/protected/clinical-trials/project/${projectId}/country/${region.id}`);
  };

  const handleSuccess = () => {
    loadData();
    setAddDialogOpen(false);
    setEditingRegion(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Loading countries...
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
      <CTMSPageHeader title="Project Countries" subtitle="Countries participating in this project" />
      <div className="rounded-md border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Countries
          </h3>
          <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Country
          </Button>
        </div>
        <div className="px-4 pb-4">
          {regions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Globe className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                No countries assigned to this project.
              </p>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {regions.map((region) => (
                  <TableRow
                    key={region.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleRowClick(region)}
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {(addDialogOpen || editingRegion) && (
        <RegionFormDialog
          open={addDialogOpen || !!editingRegion}
          onOpenChange={(open) => {
            if (!open) {
              setAddDialogOpen(false);
              setEditingRegion(null);
            }
          }}
          companyId={companyId}
          region={editingRegion}
          defaultProtocolId={addDialogOpen ? projectId : undefined}
          defaultProtocolDisplay={addDialogOpen && protocol ? `${protocol.protocol_number} - ${protocol.title}` : undefined}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
