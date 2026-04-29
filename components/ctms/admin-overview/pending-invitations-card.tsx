'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, RotateCw, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';

import { InviteUserDialog } from '@/components/ctms/team/invite-user-dialog';
import { getStudies } from '@/lib/actions/studies';
import { resendInvite, revokeInvite, type PendingInvitation } from '@/lib/actions/team';
import type { Study, TeamMemberRole } from '@/lib/types/ctms';
import { TEAM_ROLE_OPTIONS } from '@/lib/types/ctms';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function displayName(inv: PendingInvitation): string {
  const n = [inv.first_name, inv.last_name].filter(Boolean).join(' ').trim();
  return n || inv.email;
}

function invitationInitials(inv: PendingInvitation): string {
  const d = displayName(inv);
  if (d.includes('@')) {
    return d.slice(0, 2).toUpperCase();
  }
  return d
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function studyRoleLabel(inv: PendingInvitation): string {
  if (inv.study_role) {
    const opt = TEAM_ROLE_OPTIONS.find(
      (o) => o.value === (inv.study_role as TeamMemberRole),
    );
    if (opt) return opt.label;
    return inv.study_role.replaceAll('_', ' ');
  }
  return inv.role === 'admin' ? 'Admin' : 'User';
}

function invitedRelative(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

interface PendingInvitationsCardProps {
  pendingInvitations: PendingInvitation[];
}

export function PendingInvitationsCard({ pendingInvitations }: PendingInvitationsCardProps) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [studies, setStudies] = useState<Study[] | null>(null);
  const [studiesLoading, setStudiesLoading] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<PendingInvitation | null>(null);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [resendBusyId, setResendBusyId] = useState<string | null>(null);

  const count = pendingInvitations.length;
  const countLabel = useMemo(
    () => (count > 0 ? <Badge variant="secondary">{count}</Badge> : null),
    [count],
  );

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleOpenInvite = useCallback(async () => {
    if (studies === null) {
      setStudiesLoading(true);
      try {
        const list = await getStudies();
        setStudies(list);
      } catch {
        toast.error('Could not load studies');
        setStudies([]);
      } finally {
        setStudiesLoading(false);
      }
    }
    setInviteOpen(true);
  }, [studies]);

  const handleResend = async (inv: PendingInvitation) => {
    setResendBusyId(inv.id);
    const { error } = await resendInvite(inv.id);
    setResendBusyId(null);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Invitation resent');
    refresh();
  };

  const handleRevokeConfirm = async () => {
    if (!revokeTarget) return;
    setRevokeBusy(true);
    const { error } = await revokeInvite(revokeTarget.id);
    setRevokeBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Invitation revoked');
    setRevokeTarget(null);
    refresh();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <CardTitle className="text-sm font-semibold">Pending Invitations</CardTitle>
            {countLabel}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleOpenInvite()}
            disabled={studiesLoading}
            aria-label="Invite user"
          >
            {studiesLoading ? (
              <Loader2 className="mr-1.5 h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <UserPlus className="mr-1.5 h-4 w-4 shrink-0" />
            )}
            Invite user
          </Button>
        </CardHeader>
        <CardContent className="pt-3">
          {count === 0 ? (
            <div className="space-y-4 text-center sm:text-left">
              <p className="text-sm text-muted-foreground">
                No pending invitations. Invited users appear here until they accept.
              </p>
              <div className="flex justify-center sm:justify-start">
                <Button type="button" onClick={() => void handleOpenInvite()} disabled={studiesLoading}>
                  {studiesLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4 shrink-0" />
                  )}
                  Invite user
                </Button>
              </div>
            </div>
          ) : (
            <TooltipProvider delay={200}>
              <ul className="flex flex-col divide-y divide-border/60">
                {pendingInvitations.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <span
                      aria-hidden
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground"
                    >
                      {invitationInitials(inv)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground" title={displayName(inv)}>
                        {displayName(inv)}
                      </div>
                      <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="rounded-full bg-muted/70 px-2 py-0.5 font-medium text-foreground/80">
                          {studyRoleLabel(inv)}
                        </span>
                        <span aria-hidden>·</span>
                        <span className="shrink-0">Invited {invitedRelative(inv.invited_at)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              disabled={resendBusyId === inv.id}
                              aria-label={`Resend invite to ${displayName(inv)}`}
                              onClick={() => void handleResend(inv)}
                              className="border-sky-500/30 text-sky-600 hover:bg-sky-500/10 hover:text-sky-700 dark:text-sky-400"
                            />
                          }
                        >
                          {resendBusyId === inv.id ? (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                          ) : (
                            <RotateCw className="h-4 w-4" />
                          )}
                        </TooltipTrigger>
                        <TooltipContent side="top">Resend email</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              aria-label={`Revoke invitation for ${displayName(inv)}`}
                              onClick={() => setRevokeTarget(inv)}
                              className="border-destructive/30 text-destructive hover:bg-destructive/10"
                            />
                          }
                        >
                          <X className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent side="top">Revoke invitation</TooltipContent>
                      </Tooltip>
                    </div>
                  </li>
                ))}
              </ul>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSuccess={refresh}
        studies={studies ?? []}
      />

      <AlertDialog open={Boolean(revokeTarget)} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent className="gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget && (
                <>
                  {displayName(revokeTarget)} will no longer be able to join with this pending invite. You
                  can send a new invite later.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={revokeBusy}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={revokeBusy}
              onClick={() => void handleRevokeConfirm()}
            >
              {revokeBusy ? 'Revoking…' : 'Revoke'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
