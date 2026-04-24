'use client';

import { History } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { SubjectCrf } from '@/lib/types/ctms';

import { SubjectCrfEventsTable } from './subject-crf-events-table';

export function SubjectCrfHistorySheet({
  open,
  onOpenChange,
  subjectCrf,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectCrf: SubjectCrf | null;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="h-full w-full min-h-0 flex-col overflow-hidden gap-0 p-6 sm:max-w-3xl sm:p-8"
      >
        <SheetHeader className="shrink-0 space-y-1.5 p-0 pb-4 pr-10 sm:pr-12">
          <SheetTitle className="flex items-center gap-2 pr-0">
            <History className="h-4 w-4 shrink-0" />
            Change history
          </SheetTitle>
          <SheetDescription>
            {subjectCrf
              ? `Audit log for ${subjectCrf.crf_name}.`
              : 'Audit log for this CRF.'}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pb-2">
          {subjectCrf && (
            <SubjectCrfEventsTable
              subjectId={subjectCrf.subject_id}
              subjectCrfId={subjectCrf.id}
              defaultPageSize={10}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
