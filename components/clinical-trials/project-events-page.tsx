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
import { Plus, Calendar } from 'lucide-react';
import { useCTMS } from './ctms-context';
import { CTMSPageHeader } from './ctms-layout';
import { getClinicalProtocol } from '@/lib/actions/clinical-protocols';

interface ProjectEventsPageProps {
  projectId: string;
  embedded?: boolean;
}

export function ProjectEventsPage({ projectId, embedded }: ProjectEventsPageProps) {
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

  const events: {
    name: string;
    baselineDate: string;
    targetDate: string;
    completedDate: string;
    daysEarlyLate: string;
    source: string;
  }[] = [];

  return (
    <div className="flex flex-col gap-4">
      {!embedded && <CTMSPageHeader title="Project Events" />}
      {!embedded && (
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Project Events</h1>
        <Button variant="default" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>
      )}

      <div className="rounded-md border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-medium flex items-center gap-2">Events</h3>
        </div>
        <div className="px-4 pb-4">
          {events.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon">
                <Calendar className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No project events defined</EmptyTitle>
                <EmptyDescription>
                  Add events to track project timelines.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-muted/50 text-xs font-medium">Event Name</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Baseline Date</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Target Date</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Completed Date</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Days Early/Late</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium">{e.name}</TableCell>
                    <TableCell className="text-xs">{e.baselineDate}</TableCell>
                    <TableCell className="text-xs">{e.targetDate}</TableCell>
                    <TableCell className="text-xs">{e.completedDate}</TableCell>
                    <TableCell className="text-xs">{e.daysEarlyLate}</TableCell>
                    <TableCell className="text-xs">{e.source}</TableCell>
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
