'use client';

import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SiteStartupStep, StartupStepStatus } from '@/lib/types/site-startup';
import { STARTUP_STEP_STATUS_LABELS, STARTUP_STEP_CATEGORY_LABELS } from '@/lib/types/site-startup';

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
  not_applicable: 'bg-gray-50 text-gray-400',
};

interface StartupChecklistViewProps {
  steps: SiteStartupStep[];
  onStepUpdate: (stepId: string, status: StartupStepStatus) => void;
}

export function StartupChecklistView({ steps, onStepUpdate }: StartupChecklistViewProps) {
  const sorted = [...steps].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">#</TableHead>
            <TableHead>Step</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Target Date</TableHead>
            <TableHead>Completed</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((step) => (
            <TableRow key={step.id} className={step.status === 'blocked' ? 'bg-red-50/50' : ''}>
              <TableCell className="text-xs text-muted-foreground">{step.sort_order}</TableCell>
              <TableCell className="text-sm">
                <div>
                  <span className="font-medium">{step.step_name}</span>
                  {step.blocker_description && (
                    <p className="text-xs text-red-600 mt-0.5">Blocker: {step.blocker_description}</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-xs">{STARTUP_STEP_CATEGORY_LABELS[step.step_category]}</TableCell>
              <TableCell className="text-xs">{step.target_date || '—'}</TableCell>
              <TableCell className="text-xs">{step.completed_date || '—'}</TableCell>
              <TableCell>
                <Select value={step.status} onValueChange={(v) => onStepUpdate(step.id, v as StartupStepStatus)}>
                  <SelectTrigger className="h-7 w-[120px]">
                    <Badge variant="secondary" className={statusColors[step.status]}>
                      {STARTUP_STEP_STATUS_LABELS[step.status]}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STARTUP_STEP_STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
