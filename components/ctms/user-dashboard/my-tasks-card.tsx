'use client';

import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardCardEmptyState } from '@/components/ctms/dashboard/dashboard-card-primitives';
import type { DashboardTask } from '@/lib/dashboard/ctms-dashboard-overview';
import { cn } from '@/lib/utils';

export function MyTasksCard({ tasks }: { tasks: DashboardTask[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b">
        <CardTitle className="text-base font-semibold">My Tasks</CardTitle>
        <Link
          href="/protected/my-tasks"
          className="text-xs font-medium text-sky-600 underline-offset-4 hover:underline dark:text-sky-400"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="px-0 pt-0">
        {tasks.length === 0 ? (
          <DashboardCardEmptyState>
            No open tasks assigned to you.
          </DashboardCardEmptyState>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
            {tasks.map((task) => (
              <li key={task.id}>
                <Link
                  href={task.href}
                  aria-label={`${task.title} — ${task.dueLabel}`}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{task.title}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {[task.siteLabel, task.studyLabel].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 text-xs font-medium tabular-nums',
                      task.isDueToday ? 'text-destructive' : 'text-muted-foreground',
                    )}
                  >
                    {task.dueLabel}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t px-4 py-2.5">
          <Link
            href="/protected/my-tasks"
            className="text-xs font-medium text-sky-600 underline-offset-4 hover:underline dark:text-sky-400"
          >
            View all tasks →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
