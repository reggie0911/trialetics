'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ChevronDown, Pencil } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ctmsStudyRoot } from '@/lib/nav/ctms-study-paths';
import type { StudyPhase, StudyStatus } from '@/lib/types/ctms';

interface StudyCompactHeaderProps {
  studyId: string;
  headingName: string;
  protocolNumber: string;
  phase: StudyPhase;
  status: StudyStatus;
  isStudyReadOnly: boolean;
}

type TaskItem = {
  label: string;
  path: string;
  tooltip: string;
};

function taskItems(studyId: string): TaskItem[] {
  const r = ctmsStudyRoot(studyId);
  return [
    {
      label: 'My Tasks',
      path: `${r}/my-tasks`,
      tooltip: 'Tasks assigned to you for this study.',
    },
    {
      label: 'Project Team Tasks',
      path: `${r}/tasks`,
      tooltip: 'Project team task board and assignments for this study.',
    },
  ];
}

function findActiveTask(pathname: string, items: TaskItem[]): TaskItem | null {
  const matches = items.filter(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  );
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.path.length - a.path.length)[0]!;
}

export function StudyCompactHeader({
  studyId,
  headingName,
  protocolNumber,
  phase,
  status,
  isStudyReadOnly,
}: StudyCompactHeaderProps) {
  const pathname = usePathname();
  const items = taskItems(studyId);
  const activeTask = findActiveTask(pathname, items);
  const studyRoot = ctmsStudyRoot(studyId);

  return (
    <div className="border-b bg-muted/30 px-4 py-2">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                render={<Link href="/protected/studies" />}
                nativeButton={false}
                className="-ml-2 h-7 px-2 text-muted-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to studies</span>
              </Button>
            }
          />
          <TooltipContent side="bottom" className="max-w-xs text-xs">
            Back to all studies.
          </TooltipContent>
        </Tooltip>

        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={studyRoot}
            className="truncate text-sm font-semibold tracking-tight hover:underline"
          >
            {headingName}
          </Link>
          <span className="text-muted-foreground">&middot;</span>
          <span className="truncate text-xs text-muted-foreground">{protocolNumber}</span>
          <span className="text-muted-foreground">&middot;</span>
          <Badge variant="outline" className="text-xs">
            {phase}
          </Badge>
          <StatusBadge status={status} className="text-xs" />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                'inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border bg-background px-2.5 text-xs font-medium outline-none transition-colors hover:bg-muted',
                activeTask && 'border-primary/30 bg-primary/10 text-primary',
              )}
              aria-label="Open study task views"
            >
              {activeTask ? activeTask.label : 'Tasks'}
              <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              {items.map((item) => {
                const active = activeTask?.path === item.path;
                return (
                  <DropdownMenuItem
                    key={item.path}
                    render={<Link href={item.path} />}
                    className={cn('text-xs', active && 'bg-primary/10 text-primary')}
                  >
                    {item.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isStudyReadOnly}
                  render={
                    isStudyReadOnly ? undefined : <Link href={`${studyRoot}/edit`} />
                  }
                  nativeButton={isStudyReadOnly}
                  className="h-7 px-2.5 text-xs"
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
              }
            />
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              {isStudyReadOnly
                ? 'Study is deactivated; editing is disabled until the study is reactivated.'
                : 'Edit study metadata, overview fields, and configuration.'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
