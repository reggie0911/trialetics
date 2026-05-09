'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  activateBudgetVersion,
  approveBudgetVersion,
  rejectBudgetVersion,
  submitBudgetVersion,
} from '@/lib/actions/study-finance-module';
import {
  FM_BUDGET_VERSION_STATUS_LABELS,
  type FmBudgetVersion,
} from '@/lib/finance-module/types';

interface BudgetVersionLifecycleCardProps {
  studyId: string;
  selectedVersion: FmBudgetVersion | null;
}

export function BudgetVersionLifecycleCard({
  studyId,
  selectedVersion,
}: BudgetVersionLifecycleCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitNotes, setSubmitNotes] = useState('');

  if (!selectedVersion) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Version lifecycle</CardTitle>
          <CardDescription className="text-xs">
            Create and select a draft budget version to submit it for approval.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const refresh = () => router.refresh();

  const statusLabel = FM_BUDGET_VERSION_STATUS_LABELS[selectedVersion.status];

  const runSubmit = () => {
    startTransition(async () => {
      const { error } = await submitBudgetVersion({
        studyId,
        budgetVersionId: selectedVersion.id,
        updatedAt: selectedVersion.updated_at,
        notes: submitNotes.trim() || null,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Budget version submitted.');
      setSubmitNotes('');
      refresh();
    });
  };

  const runApprove = () => {
    startTransition(async () => {
      const { error } = await approveBudgetVersion({
        studyId,
        budgetVersionId: selectedVersion.id,
        updatedAt: selectedVersion.updated_at,
        notes: null,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Budget version approved.');
      refresh();
    });
  };

  const runReject = () => {
    const reason = rejectReason.trim();
    if (reason.length < 1) {
      toast.error('Provide a rejection reason.');
      return;
    }
    startTransition(async () => {
      const { error } = await rejectBudgetVersion({
        studyId,
        budgetVersionId: selectedVersion.id,
        updatedAt: selectedVersion.updated_at,
        reason,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Budget version rejected.');
      setRejectOpen(false);
      setRejectReason('');
      refresh();
    });
  };

  const runActivate = () => {
    startTransition(async () => {
      const { error } = await activateBudgetVersion({
        studyId,
        budgetVersionId: selectedVersion.id,
        updatedAt: selectedVersion.updated_at,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Budget version activated.');
      refresh();
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Version lifecycle — v{selectedVersion.version_number}
          </CardTitle>
          <CardDescription className="text-xs">
            Status: <strong>{statusLabel}</strong>. Submit draft versions for approval, then activate
            after approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {selectedVersion.status === 'draft' ? (
            <>
              <div className="space-y-1">
                <Label className="text-[11px]">Submission notes (optional)</Label>
                <Textarea
                  value={submitNotes}
                  onChange={(e) => setSubmitNotes(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>
              <Button size="sm" className="w-fit" disabled={pending} onClick={runSubmit}>
                Submit for approval
              </Button>
            </>
          ) : null}

          {selectedVersion.status === 'submitted' ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={pending} onClick={runApprove}>
                Approve
              </Button>
              <Button size="sm" variant="destructive" disabled={pending} onClick={() => setRejectOpen(true)}>
                Reject
              </Button>
            </div>
          ) : null}

          {selectedVersion.status === 'approved' ? (
            <Button size="sm" className="w-fit" disabled={pending} onClick={runActivate}>
              Activate budget version
            </Button>
          ) : null}

          {['active', 'superseded', 'rejected'].includes(selectedVersion.status) ? (
            <p className="text-[11px] text-muted-foreground">
              No further transitions from this state in the UI.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject budget version</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label className="text-[11px]">Reason</Label>
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="text-xs" />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" disabled={pending} onClick={runReject}>
              Reject version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
