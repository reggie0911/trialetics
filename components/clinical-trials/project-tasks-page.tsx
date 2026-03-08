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
import { Plus, ClipboardList } from 'lucide-react';
import { useCTMS } from './ctms-context';
import { CTMSPageHeader } from './ctms-layout';
import { getClinicalProtocol } from '@/lib/actions/clinical-protocols';

interface ProjectTasksPageProps {
  projectId: string;
  embedded?: boolean;
}

export function ProjectTasksPage({ projectId, embedded }: ProjectTasksPageProps) {
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

  const tasks: {
    name: string;
    assignedTo: string;
    dueDate: string;
    status: string;
    priority: string;
  }[] = [];

  return (
    <div className="flex flex-col gap-4">
      {!embedded && <CTMSPageHeader title="Project Tasks" />}
      {!embedded && (
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Project Tasks</h1>
        <Button variant="default" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>
      )}

      <div className="rounded-md border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-medium flex items-center gap-2">Tasks</h3>
        </div>
        <div className="px-4 pb-4">
          {tasks.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon">
                <ClipboardList className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No tasks found</EmptyTitle>
                <EmptyDescription>
                  Add tasks to track project work.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-muted/50 text-xs font-medium">Task Name</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Assigned To</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Due Date</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Status</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((t, i) => (
                  <TableRow key={i} className="hover:bg-muted/50">
                    <TableCell className="text-xs font-medium">{t.name}</TableCell>
                    <TableCell className="text-xs">{t.assignedTo}</TableCell>
                    <TableCell className="text-xs">{t.dueDate}</TableCell>
                    <TableCell className="text-xs">{t.status}</TableCell>
                    <TableCell className="text-xs">{t.priority}</TableCell>
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
