'use client';

import {
  ChevronDown,
  ChevronRight,
  Info,
  MoreHorizontal,
  RefreshCw,
  Trash2,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { STUDY_DEACTIVATED_TOOLTIP } from '@/lib/constants/study-deactivated-message';
import { cn } from '@/lib/utils';

import type { TeamRow } from '@/lib/team/build-team-rows';
import {
  formatInviteSent,
  formatLastActive,
  primaryStudyRole,
  isExternalEmail,
} from '@/lib/team/build-team-rows';
import { TEAM_ROLE_LABEL } from '@/lib/types/ctms';

const BUCKET_DOT: Record<
  ReturnType<typeof formatLastActive>['bucket'],
  string
> = {
  today: 'bg-emerald-500',
  recent: 'bg-amber-500',
  stale: 'bg-slate-400',
  never: 'bg-muted-foreground/40',
};

interface StudyTeamTableRowProps {
  row: TeamRow;
  studyContextId: string;
  companyDomain: string | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onManage: () => void;
  onResendInvite: (invitationId: string) => void;
  onRevokeInvite: (invitationId: string) => void;
  onRemoveAssignment: (assignmentId: string, studyId: string) => void;
  onDeactivateMember: () => void;
  readOnly: boolean;
  pendingActionId: string | null;
}

export function StudyTeamTableRow({
  row,
  studyContextId,
  companyDomain,
  isExpanded,
  onToggleExpand,
  onManage,
  onResendInvite,
  onRevokeInvite,
  onRemoveAssignment,
  onDeactivateMember,
  readOnly,
  pendingActionId,
}: StudyTeamTableRowProps) {
  if (row.kind === 'invite') {
    return (
      <InviteRow
        row={row}
        onResend={onResendInvite}
        onRevoke={onRevokeInvite}
        readOnly={readOnly}
        pendingActionId={pendingActionId}
        companyDomain={companyDomain}
      />
    );
  }

  const member = row.member;
  const studyRole = primaryStudyRole(member);
  const studyAssignment =
    member.assignments.find((a) => a.study_id === studyContextId && a.is_active) ??
    member.assignments.find((a) => a.study_id === studyContextId) ??
    member.assignments[0] ??
    null;
  const hasActiveAssignment = member.assignments.some((a) => a.is_active);
  const lastActive = formatLastActive(member.last_sign_in_at);
  const external = isExternalEmail(member.email, companyDomain);

  return (
    <>
      <TableRow
        className="h-[56px] cursor-pointer hover:bg-muted/40"
        onClick={onToggleExpand}
      >
        <TableCell className="w-[36px] p-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>

        <TableCell className="py-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-[11px]">{row.initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {row.name}
                </span>
                {external && (
                  <Tooltip>
                    <TooltipTrigger render={<span className="inline-flex" />}>
                      <Badge variant="outline" className="text-[9px]">
                        External
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      Email is outside the company domain.
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              {studyRole && (
                <p className="truncate text-[11px] text-muted-foreground">
                  {studyRole.label}
                </p>
              )}
            </div>
          </div>
        </TableCell>

        <TableCell className="py-2 text-xs text-muted-foreground">
          <span className="block max-w-[220px] truncate">{member.email ?? '—'}</span>
        </TableCell>

        <TableCell className="py-2">
          <Badge
            variant={member.app_role === 'admin' ? 'default' : 'secondary'}
            className="text-[10px]"
          >
            {member.app_role === 'admin' ? 'Admin' : 'User'}
          </Badge>
        </TableCell>

        <TableCell className="py-2">
          {studyAssignment ? (
            <Badge variant="outline" className="text-[10px]">
              {studyAssignment.role === 'custom' && studyAssignment.custom_role_name
                ? studyAssignment.custom_role_name
                : TEAM_ROLE_LABEL[studyAssignment.role]}
            </Badge>
          ) : (
            <span className="text-[11px] text-muted-foreground">—</span>
          )}
        </TableCell>

        <TableCell className="py-2 text-xs text-muted-foreground">
          {member.assignments.length === 0 ? (
            <span className="italic">No assignments</span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <span className="font-medium text-foreground">
                {member.assignments.length}{' '}
                {member.assignments.length === 1 ? 'study' : 'studies'}
              </span>
              {studyAssignment?.protocol_number && (
                <>
                  <span aria-hidden>•</span>
                  <span className="truncate">{studyAssignment.protocol_number}</span>
                </>
              )}
            </span>
          )}
        </TableCell>

        <TableCell className="py-2">
          <StatusBadge status={hasActiveAssignment ? 'active' : 'inactive'} />
        </TableCell>

        <TableCell className="py-2">
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span
              aria-hidden
              className={cn('h-1.5 w-1.5 shrink-0 rounded-full', BUCKET_DOT[lastActive.bucket])}
            />
            {lastActive.label}
          </span>
        </TableCell>

        <TableCell className="py-2">
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {readOnly ? (
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button size="sm" variant="outline" disabled>
                    Manage
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  {STUDY_DEACTIVATED_TOOLTIP}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button size="sm" variant="outline" onClick={onManage}>
                Manage
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label="More actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onManage} disabled={readOnly}>
                  Manage
                </DropdownMenuItem>
                {studyAssignment && (
                  <DropdownMenuItem
                    onClick={onDeactivateMember}
                    disabled={readOnly}
                  >
                    {studyAssignment.is_active ? 'Deactivate on this study' : 'Reactivate on this study'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {studyAssignment && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() =>
                      onRemoveAssignment(studyAssignment.id, studyAssignment.study_id)
                    }
                    disabled={readOnly}
                  >
                    Remove from study
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={9} className="bg-muted/20 p-0">
            <div className="grid gap-3 px-6 py-4 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Last sign-in
                </p>
                <p className="mt-1 text-xs text-foreground">
                  {member.last_sign_in_at
                    ? new Date(member.last_sign_in_at).toLocaleString()
                    : 'Never signed in'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  All assignments ({member.assignments.length})
                </p>
                <ul className="mt-1 space-y-1">
                  {member.assignments.length === 0 ? (
                    <li className="text-xs text-muted-foreground italic">
                      No assignments yet.
                    </li>
                  ) : (
                    member.assignments.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 text-xs">
                        <span
                          className={cn(
                            'h-1.5 w-1.5 shrink-0 rounded-full',
                            a.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                          )}
                          aria-hidden
                        />
                        <span className="truncate text-foreground">{a.study_title}</span>
                        <Badge variant="outline" className="text-[9px]">
                          {a.role === 'custom' && a.custom_role_name
                            ? a.custom_role_name
                            : TEAM_ROLE_LABEL[a.role]}
                        </Badge>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Quick actions
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={onManage}
                    disabled={readOnly}
                  >
                    Open Manage panel
                  </Button>
                </div>
                <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Info className="h-3 w-3" />
                  Detailed editing lives in the Manage panel.
                </p>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

interface InviteRowProps {
  row: Extract<TeamRow, { kind: 'invite' }>;
  onResend: (id: string) => void;
  onRevoke: (id: string) => void;
  readOnly: boolean;
  pendingActionId: string | null;
  companyDomain: string | null;
}

function InviteRow({
  row,
  onResend,
  onRevoke,
  readOnly,
  pendingActionId,
  companyDomain,
}: InviteRowProps) {
  const inv = row.invitation;
  const isActioning = pendingActionId === inv.id;
  const sentLabel = formatInviteSent(inv.invited_at);
  const external = isExternalEmail(inv.email, companyDomain);

  return (
    <TableRow className="h-[56px] bg-amber-50/30 dark:bg-amber-500/5">
      <TableCell className="w-[36px] p-2" />
      <TableCell className="py-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border border-amber-200/60 dark:border-amber-500/30">
            <AvatarFallback className="bg-amber-100/60 text-[11px] text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              {row.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground">
                {row.name}
              </span>
              {external && (
                <Badge variant="outline" className="text-[9px]">
                  External
                </Badge>
              )}
            </div>
            <p className="truncate text-[11px] text-muted-foreground">
              Invitation pending acceptance
            </p>
          </div>
        </div>
      </TableCell>

      <TableCell className="py-2 text-xs text-muted-foreground">
        <span className="block max-w-[220px] truncate">{inv.email}</span>
      </TableCell>

      <TableCell className="py-2">
        <Badge
          variant={inv.role === 'admin' ? 'default' : 'secondary'}
          className="text-[10px]"
        >
          {inv.role === 'admin' ? 'Admin' : 'User'}
        </Badge>
      </TableCell>

      <TableCell className="py-2">
        <span className="text-[11px] text-muted-foreground">—</span>
      </TableCell>

      <TableCell className="py-2 text-xs italic text-muted-foreground">
        Awaiting assignment
      </TableCell>

      <TableCell className="py-2">
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-50 text-amber-700 text-[10px] dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
        >
          Invited
        </Badge>
      </TableCell>

      <TableCell className="py-2">
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
          {sentLabel}
        </span>
      </TableCell>

      <TableCell className="py-2">
        <div className="flex items-center justify-end gap-1">
          {readOnly ? (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button size="sm" variant="outline" disabled>
                  Resend Invite
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {STUDY_DEACTIVATED_TOOLTIP}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onResend(inv.id)}
              disabled={isActioning}
            >
              <RefreshCw
                className={cn('mr-1 h-3.5 w-3.5', isActioning && 'animate-spin')}
              />
              Resend Invite
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onResend(inv.id)} disabled={readOnly || isActioning}>
                Resend invite
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onRevoke(inv.id)}
                disabled={readOnly || isActioning}
              >
                <Trash2 className="h-4 w-4" />
                Revoke invite
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}
