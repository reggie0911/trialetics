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
import { Plus } from 'lucide-react';
import { useCTMS } from './ctms-context';
import { CTMSPageHeader } from './ctms-layout';
import { getClinicalProtocol } from '@/lib/actions/clinical-protocols';

interface ProjectMilestonesPageProps {
  projectId: string;
  embedded?: boolean;
}

export function ProjectMilestonesPage({ projectId, embedded }: ProjectMilestonesPageProps) {
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

  const milestones: {
    name: string;
    baselineDate: string;
    targetDate: string;
    actualDate: string;
    status: string;
    daysVariance: string;
  }[] = [];

  return (
    <div className="flex flex-col gap-4">
      {!embedded && <CTMSPageHeader title="Project Milestones" />}
      {!embedded && (
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Project Milestones</h1>
        <Button variant="default" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Milestone
        </Button>
      </div>
      )}

      <div className="rounded-md border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-medium flex items-center gap-2">Milestones</h3>
        </div>
        <div className="px-4 pb-4">
          {milestones.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon">
                <Plus className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No milestones defined</EmptyTitle>
                <EmptyDescription>
                  Create milestones to track project progress.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-muted/50 text-xs font-medium">Milestone Name</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Baseline Date</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Target Date</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Actual Date</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Status</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Days Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {milestones.map((m, i) => (
                  <TableRow key={i} className="hover:bg-muted/50">
                    <TableCell className="text-xs font-medium">{m.name}</TableCell>
                    <TableCell className="text-xs">{m.baselineDate}</TableCell>
                    <TableCell className="text-xs">{m.targetDate}</TableCell>
                    <TableCell className="text-xs">{m.actualDate}</TableCell>
                    <TableCell className="text-xs">{m.status}</TableCell>
                    <TableCell className="text-xs">{m.daysVariance}</TableCell>
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
