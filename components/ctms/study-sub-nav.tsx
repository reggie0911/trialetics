'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { ctmsStudyRoot } from '@/lib/nav/ctms-study-paths';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type NavDef = {
  label: string;
  path: string;
  /** `exact` = only the overview URL; `prefix` = section and nested routes */
  match: 'exact' | 'prefix';
  tooltip: string;
};

function navItems(studyId: string): NavDef[] {
  const r = ctmsStudyRoot(studyId);
  return [
    {
      label: 'Overview',
      path: r,
      match: 'exact',
      tooltip: 'Study overview: summary, tabs, and study-level actions on this page.',
    },
    {
      label: 'My Tasks',
      path: `${r}/my-tasks`,
      match: 'prefix',
      tooltip: 'Tasks assigned to you for this study.',
    },
    {
      label: 'Project Team Tasks',
      path: `${r}/tasks`,
      match: 'prefix',
      tooltip: 'Project team task board and assignments for this study.',
    },
  ];
}

function resolveActivePath(pathname: string, items: NavDef[]): string | null {
  const matches = items.filter((item) => {
    if (item.match === 'exact') return pathname === item.path;
    return pathname === item.path || pathname.startsWith(`${item.path}/`);
  });
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.path.length - a.path.length)[0]!.path;
}

interface StudySubNavProps {
  studyId: string;
  /** Short label shown next to the study (e.g. protocol number) */
  heading: string;
}

export function StudySubNav({ studyId, heading }: StudySubNavProps) {
  const pathname = usePathname();
  const items = navItems(studyId);
  const activePath = resolveActivePath(pathname, items);

  return (
    <div className="border-b bg-muted/30 px-4 py-3 space-y-3">
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3 min-w-0">
        <span className="text-xs font-medium text-muted-foreground shrink-0">Current study</span>
        <h2 className="text-sm font-semibold tracking-tight truncate">{heading}</h2>
      </div>
      <nav className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1" aria-label="Study sections">
        {items.map((item) => {
          const active = activePath === item.path;
          return (
            <Tooltip key={item.path + item.label}>
              <TooltipTrigger
                render={
                  <Link
                    href={item.path}
                    className={cn(
                      'shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
                      active
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  />
                }
              >
                {item.label}
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {item.tooltip}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </div>
  );
}
