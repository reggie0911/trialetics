'use client';

import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import type { StudyPhase, StudyStatus } from '@/lib/types/ctms';

import { StudyBreadcrumb } from './study-breadcrumb';

interface StudyCompactHeaderProps {
  studyId: string;
  headingName: string;
  phase: StudyPhase;
  status: StudyStatus;
}

export function StudyCompactHeader({
  studyId,
  headingName,
  phase,
  status,
}: StudyCompactHeaderProps) {
  return (
    <div className="border-b bg-gradient-to-b from-muted/40 to-muted/20 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-muted/25">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 flex-1 items-center">
          <StudyBreadcrumb studyId={studyId} headingName={headingName} />
        </div>

        <div className="hidden h-5 w-px bg-border sm:block" aria-hidden />

        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium uppercase tracking-wide">
            {phase}
          </Badge>
          <StatusBadge status={status} className="h-5 text-[10px]" />
        </div>
      </div>
    </div>
  );
}
