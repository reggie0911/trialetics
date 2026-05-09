'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { resolveFinanceApprovalRequest } from '@/lib/actions/study-finance-module';
import type { FmApprovalRequest } from '@/lib/finance-module/types';

const ACTIONABLE_STATUSES = new Set<FmApprovalRequest['status']>([
  'pending',
  'in_progress',
  'overdue',
  'escalated',
]);

interface ApprovalRequestActionsProps {
  studyId: string;
  row: FmApprovalRequest;
}

export function ApprovalRequestActions({ studyId, row }: ApprovalRequestActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();

  if (!ACTIONABLE_STATUSES.has(row.status)) {
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }

  const run = (decision: 'approve' | 'reject' | 'escalate') => {
    startTransition(async () => {
      const { error } = await resolveFinanceApprovalRequest({
        studyId,
        approvalRequestId: row.id,
        updatedAt: row.updated_at,
        decision,
        notes: notes.trim() || null,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Decision recorded.');
      setOpen(false);
      setNotes('');
      router.refresh();
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" />}>
        Review
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(100vw,380px)] gap-4">
        <SheetHeader>
          <SheetTitle className="text-sm">Approval decision</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 px-1">
          <p className="text-xs text-muted-foreground">{row.title ?? 'Untitled request'}</p>
          <p className="text-[11px] text-muted-foreground">
            Invoice, budget version, and submitted change orders update domain records first; other
            types update this approval row only.
          </p>
          <div className="space-y-1">
            <Label htmlFor={`approval-notes-${row.id}`} className="text-[11px]">
              Notes (optional on approve; used as rejection reason if needed)
            </Label>
            <Textarea
              id={`approval-notes-${row.id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" disabled={isPending} onClick={() => run('approve')}>
              Approve
            </Button>
            <Button size="sm" variant="destructive" disabled={isPending} onClick={() => run('reject')}>
              Reject
            </Button>
            <Button size="sm" variant="secondary" disabled={isPending} onClick={() => run('escalate')}>
              Escalate
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
