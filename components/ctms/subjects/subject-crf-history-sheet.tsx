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
      <SheetContent side="right" className="w-full sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Change history
          </SheetTitle>
          <SheetDescription>
            {subjectCrf
              ? `Audit log for ${subjectCrf.crf_name}.`
              : 'Audit log for this CRF.'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 px-1">
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
