'use client';

import Link from 'next/link';
import { CheckCircle2, CircleDot, PauseCircle, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { PlaybookDefinition, PlaybookRun } from '@/lib/copilot/playbook-runner';

interface Props {
  playbooks: PlaybookDefinition[];
  runs: PlaybookRun[];
}

const STATUS_LABEL: Record<PlaybookRun['status'], { label: string; className: string }> = {
  running: { label: 'Running', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  paused: { label: 'Paused', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  completed: { label: 'Completed', className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground' },
};

function StatusIcon({ status }: { status: PlaybookRun['status'] }) {
  if (status === 'completed') return <CheckCircle2 className="h-3.5 w-3.5 text-sky-600 dark:text-sky-300" />;
  if (status === 'paused') return <PauseCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" />;
  if (status === 'cancelled') return <XCircle className="h-3.5 w-3.5 text-muted-foreground" />;
  return <CircleDot className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />;
}

export function PlaybookRunList({ playbooks, runs }: Props) {
  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground">No playbook runs yet. Start one above.</p>;
  }

  return (
    <ul className="space-y-2">
      {runs.map((run) => {
        const playbook = playbooks.find((p) => p.id === run.playbookId);
        const stepCount = playbook?.steps.length ?? run.stepStates.length;
        const completedSteps = run.stepStates.filter((s) => s.status === 'completed').length;
        const status = STATUS_LABEL[run.status];
        return (
          <li
            key={run.id}
            className="flex items-center justify-between gap-3 rounded-md border bg-background p-3 hover:bg-muted/30"
          >
            <Link href={`/protected/copilot/playbooks/${run.id}`} className="flex flex-1 items-center gap-3">
              <StatusIcon status={run.status} />
              <div className="space-y-0.5">
                <p className="text-sm font-normal">
                  {playbook?.name ?? run.playbookId}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Step {Math.min(run.currentStep + 1, stepCount)} of {stepCount}
                  {' \u00B7 '}
                  {completedSteps} completed
                  {' \u00B7 '}
                  Updated {new Date(run.updatedAt).toLocaleString()}
                </p>
              </div>
            </Link>
            <Badge className={`text-[10px] ${status.className}`} variant="secondary">
              {status.label}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
