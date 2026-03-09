'use client';

import { useState, useEffect, useCallback } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BarChart3, ClipboardList, FileText } from 'lucide-react';
import { useCTMS } from './ctms-context';
import { CTMSPageHeader } from './ctms-layout';
import { getClinicalProtocol } from '@/lib/actions/clinical-protocols';

interface ProjectDashboardPageProps {
  projectId: string;
  embedded?: boolean;
}

const ENROLLMENT_ROWS = [
  { label: 'Initiated Sites', target: 12, value: 10, status: 'On Track' },
  { label: 'Screened', target: 120, value: 85, status: 'On Track' },
  { label: 'Screen Failures', target: 20, value: 15, status: 'On Track' },
  { label: 'Enrolled', target: 100, value: 70, status: 'On Track' },
  { label: 'Randomized', target: 100, value: 68, status: 'On Track' },
  { label: 'Completed', target: 80, value: 52, status: 'On Track' },
  { label: 'Discontinued', target: 20, value: 16, status: 'On Track' },
];

export function ProjectDashboardPage({ projectId, embedded }: ProjectDashboardPageProps) {
  const { companyId, setSelectedProject } = useCTMS();
  const [loading, setLoading] = useState(true);

  const loadProject = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getClinicalProtocol(projectId);
      if (result.success && result.data) {
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
  }, [projectId, setSelectedProject]);

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

  return (
    <div className="flex flex-col gap-4">
      {!embedded && <CTMSPageHeader title="Project Dashboard" />}
      {!embedded && <h1 className="text-xl font-semibold">Project Dashboard</h1>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Enrollment Summary
            </h3>
          </div>
          <div className="px-4 pb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-muted/50 text-xs font-medium">Metric</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium text-right">Target</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium text-right">Value</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium text-right">%</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ENROLLMENT_ROWS.map((row, i) => {
                  const pct = row.target > 0 ? Math.round((row.value / row.target) * 100) : 0;
                  return (
                    <TableRow key={i} className="hover:bg-muted/50">
                      <TableCell className="text-xs font-medium">{row.label}</TableCell>
                      <TableCell className="text-xs text-right">{row.target}</TableCell>
                      <TableCell className="text-xs text-right">{row.value}</TableCell>
                      <TableCell className="text-xs text-right">{pct}%</TableCell>
                      <TableCell className="text-xs">{row.status}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Enrollment Rate
            </h3>
          </div>
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Per Site/Month Target</p>
                <p className="text-lg font-semibold">2.0</p>
              </div>
              <div>
                <p className="text-muted-foreground">Actual</p>
                <p className="text-lg font-semibold">1.8</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Milestone Progress
            </h3>
          </div>
          <div className="px-4 pb-4">
            <p className="text-sm text-muted-foreground py-4">
              Milestone progress will be displayed here.
            </p>
          </div>
        </div>

        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Document Collection
            </h3>
          </div>
          <div className="px-4 pb-4">
            <p className="text-sm text-muted-foreground py-4">
              Document collection status will be displayed here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
