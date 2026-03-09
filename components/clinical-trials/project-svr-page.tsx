'use client';

import { useState, useEffect, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { Plus, FileWarning } from 'lucide-react';
import { useCTMS } from './ctms-context';
import { CTMSPageHeader } from './ctms-layout';
import { getClinicalProtocol } from '@/lib/actions/clinical-protocols';

interface ProjectSvrPageProps {
  projectId: string;
  embedded?: boolean;
}

export function ProjectSvrPage({ projectId, embedded }: ProjectSvrPageProps) {
  const { companyId, setSelectedProject } = useCTMS();
  const [loading, setLoading] = useState(true);

  const loadProject = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getClinicalProtocol(projectId);
      if (result.success && result.data && !embedded) {
        const p = result.data;
        setSelectedProject({
          id: p.id,
          name: p.title,
          protocol_number: p.protocol_number,
          status: p.status,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, setSelectedProject, embedded]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  const svrs: {
    visitDate: string;
    days: string;
    site: string;
    country: string;
    visitId: string;
    monitor: string;
    status: string;
    draftDate: string;
    reviewDate: string;
    approvalDate: string;
  }[] = [];

  return (
    <div className="flex flex-col gap-4">
      {!embedded && <CTMSPageHeader title="Site Visit Reports" />}
      {!embedded && (
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Site Visit Reports</h1>
        <Button variant="default" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Create SVR
        </Button>
      </div>
      )}

      <div className="rounded-md border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h3 className="text-sm font-medium flex items-center gap-2">SVRs</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Status: Not Started → First Draft → First Review → Comments Returned → Revisions Completed → Final Review → Approved
            </p>
          </div>
        </div>
        <div className="px-4 pb-4">
          {svrs.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon">
                <FileWarning className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No site visit reports found</EmptyTitle>
                <EmptyDescription>
                  Create SVRs to document site visits.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-muted/50 text-xs font-medium">Visit Date</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Days</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Site</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Country</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Visit ID</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Monitor</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Status</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Draft Date</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Review Date</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Approval Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {svrs.map((s, i) => (
                  <TableRow key={i} className="hover:bg-muted/50">
                    <TableCell className="text-xs">{s.visitDate}</TableCell>
                    <TableCell className="text-xs">{s.days}</TableCell>
                    <TableCell className="text-xs">{s.site}</TableCell>
                    <TableCell className="text-xs">{s.country}</TableCell>
                    <TableCell className="text-xs">{s.visitId}</TableCell>
                    <TableCell className="text-xs">{s.monitor}</TableCell>
                    <TableCell className="text-xs">{s.status}</TableCell>
                    <TableCell className="text-xs">{s.draftDate}</TableCell>
                    <TableCell className="text-xs">{s.reviewDate}</TableCell>
                    <TableCell className="text-xs">{s.approvalDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
