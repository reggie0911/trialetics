'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { FinanceRowActionsMenu, type FinanceRowActionItem } from '@/components/ctms/finance-module/_shared/row-actions-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createFinanceApprovalDelegation,
  listStudyFinanceTeamUsers,
  revokeFinanceApprovalDelegation,
  updateFinanceApprovalDelegation,
} from '@/lib/actions/study-finance-module';
import type { FmApprovalDelegation } from '@/lib/finance-module/types';
import { useFmPermissions } from '@/hooks/use-fm-permissions';

interface MyApprovalDelegationProps {
  studyId: string;
  currentUserId: string;
  rows: FmApprovalDelegation[];
}

export function MyApprovalDelegation({ studyId, currentUserId, rows }: MyApprovalDelegationProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const permsQ = useFmPermissions(studyId);
  const canWrite = permsQ.data?.canWrite ?? false;

  const mine = rows.filter((r) => r.delegator_user_id === currentUserId && r.status === 'active');

  const [open, setOpen] = useState(false);
  const [team, setTeam] = useState<{ userId: string; label: string }[]>([]);
  const [delegateId, setDelegateId] = useState('');
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [endsAt, setEndsAt] = useState('');

  const rowActions = useCallback(
    (row: FmApprovalDelegation): FinanceRowActionItem[] => [
      {
        id: 'revoke',
        label: 'Revoke',
        variant: 'destructive',
        disabled: pending || !canWrite,
        onSelect: () => {
          startTransition(async () => {
            const { error, code } = await revokeFinanceApprovalDelegation({
              studyId,
              id: row.id,
              updatedAt: row.updated_at,
            });
            if (error) {
              toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
              return;
            }
            toast.success('Delegation revoked.');
            router.refresh();
          });
        },
      },
      {
        id: 'end',
        label: 'Set end date…',
        disabled: pending || !canWrite,
        onSelect: () => {
          const next = window.prompt('End date (YYYY-MM-DD) or leave empty to clear', row.ends_at?.slice(0, 10) ?? '');
          if (next === null) return;
          startTransition(async () => {
            const { error, code } = await updateFinanceApprovalDelegation({
              studyId,
              id: row.id,
              updatedAt: row.updated_at,
              endsAt: next.trim() ? `${next.trim()}T23:59:59.000Z` : null,
            });
            if (error) {
              toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
              return;
            }
            toast.success('Delegation updated.');
            router.refresh();
          });
        },
      },
    ],
    [canWrite, pending, router, studyId],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">My Approval Delegation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {mine.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            You have no active delegation. Delegate approvals to a teammate when you are out of office.
          </p>
        ) : (
          <ul className="space-y-2">
            {mine.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-xs"
              >
                <div>
                  <p className="font-medium">To user {row.delegate_user_id.slice(0, 8)}…</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(row.starts_at).toLocaleString()}
                    {row.ends_at ? ` → ${new Date(row.ends_at).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <FinanceRowActionsMenu
                  ariaLabel="Delegation actions"
                  telemetryContext={{ studyId, tableKey: 'approval_delegations', entityType: 'fm_approval_delegation' }}
                  items={rowActions(row)}
                />
              </li>
            ))}
          </ul>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          disabled={!canWrite || pending}
          onClick={() => {
            startTransition(async () => {
              const { data, error } = await listStudyFinanceTeamUsers(studyId);
              if (error) {
                toast.error(error);
                return;
              }
              setTeam((data ?? []).filter((u) => u.userId !== currentUserId));
              setOpen(true);
            });
          }}
        >
          Set up delegation
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md gap-3">
          <DialogHeader>
            <DialogTitle className="text-sm">Delegate approvals</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 px-1">
            <div className="space-y-1">
              <Label className="text-[11px]">Delegate</Label>
              <Select value={delegateId} onValueChange={setDelegateId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select teammate" />
                </SelectTrigger>
                <SelectContent>
                  {team.map((u) => (
                    <SelectItem key={u.userId} value={u.userId} className="text-xs">
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Starts (local)</Label>
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Ends (optional, YYYY-MM-DD)</Label>
              <Input value={endsAt} onChange={(e) => setEndsAt(e.target.value)} placeholder="2026-12-31" className="h-9 text-xs" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || !delegateId}
              onClick={() => {
                startTransition(async () => {
                  const startsIso = new Date(startsAt).toISOString();
                  const endsIso = endsAt.trim() ? `${endsAt.trim()}T23:59:59.000Z` : null;
                  const { error } = await createFinanceApprovalDelegation({
                    studyId,
                    delegatorUserId: currentUserId,
                    delegateUserId: delegateId,
                    startsAt: startsIso,
                    endsAt: endsIso,
                    status: 'active',
                  });
                  if (error) {
                    toast.error(error);
                    return;
                  }
                  toast.success('Delegation created.');
                  setOpen(false);
                  router.refresh();
                });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
