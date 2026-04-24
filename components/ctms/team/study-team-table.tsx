'use client';

import { useState } from 'react';
import { ArrowUpDown, Info, UserCircle } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { TablePaginationFooter } from '@/components/ui/table-pagination-footer';
import { useClientPagination } from '@/lib/hooks/use-client-pagination';

import { StudyTeamTableRow } from '@/components/ctms/team/study-team-table-row';
import type { TeamRow } from '@/lib/team/build-team-rows';

interface StudyTeamTableProps {
  rows: TeamRow[];
  totalRowsBeforeFilter: number;
  studyContextId: string;
  companyDomain: string | null;
  readOnly: boolean;
  pendingActionId: string | null;
  filtersActive: boolean;
  onManage: (row: Extract<TeamRow, { kind: 'member' }>) => void;
  onResendInvite: (invitationId: string) => void;
  onRevokeInvite: (invitationId: string) => void;
  onRemoveAssignment: (assignmentId: string, studyId: string) => void;
  onDeactivateMember: (row: Extract<TeamRow, { kind: 'member' }>) => void;
  resetKey?: unknown[];
}

const COL_TOOLTIPS = {
  platformRole: 'Platform Role controls access across the whole Trialetics workspace.',
  studyRole: "Study Role describes the team member's responsibility on this specific study.",
  accessStatus:
    'Active means the member has at least one active study assignment. Invited indicates a pending invitation.',
};

export function StudyTeamTable({
  rows,
  totalRowsBeforeFilter,
  studyContextId,
  companyDomain,
  readOnly,
  pendingActionId,
  filtersActive,
  onManage,
  onResendInvite,
  onRevokeInvite,
  onRemoveAssignment,
  onDeactivateMember,
  resetKey,
}: StudyTeamTableProps) {
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const sortedRows = [...rows].sort((a, b) => {
    const cmp = a.name.localeCompare(b.name);
    return sortAsc ? cmp : -cmp;
  });

  const pagination = useClientPagination({
    totalItems: sortedRows.length,
    initialPageSize: 10,
    resetKey: resetKey ?? [],
  });
  const paginated = pagination.paginate(sortedRows);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="rounded-md border bg-background">
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[36px]" />
            <TableHead>
              <button
                type="button"
                onClick={() => setSortAsc((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Name
                <ArrowUpDown className="h-3 w-3 opacity-60" />
              </button>
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Email</TableHead>
            <TableHead>
              <HeaderWithTooltip label="Platform Role" tooltip={COL_TOOLTIPS.platformRole} />
            </TableHead>
            <TableHead>
              <HeaderWithTooltip label="Study Role" tooltip={COL_TOOLTIPS.studyRole} />
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Assignments</TableHead>
            <TableHead>
              <HeaderWithTooltip label="Access Status" tooltip={COL_TOOLTIPS.accessStatus} />
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Last Active</TableHead>
            <TableHead className="text-right text-xs font-medium text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={9}
                className="py-12 text-center text-xs text-muted-foreground"
              >
                <UserCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
                {filtersActive
                  ? 'No team members match your filters.'
                  : totalRowsBeforeFilter === 0
                    ? 'No team members yet. Invite teammates to staff this study.'
                    : 'No team members match your filters.'}
                {filtersActive && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Try clearing filters above.
                  </p>
                )}
              </TableCell>
            </TableRow>
          ) : (
            paginated.map((row) => (
              <StudyTeamTableRow
                key={row.id}
                row={row}
                studyContextId={studyContextId}
                companyDomain={companyDomain}
                isExpanded={expandedIds.has(row.id)}
                onToggleExpand={() => toggleExpand(row.id)}
                onManage={() => row.kind === 'member' && onManage(row)}
                onResendInvite={onResendInvite}
                onRevokeInvite={onRevokeInvite}
                onRemoveAssignment={onRemoveAssignment}
                onDeactivateMember={() =>
                  row.kind === 'member' && onDeactivateMember(row)
                }
                readOnly={readOnly}
                pendingActionId={pendingActionId}
              />
            ))
          )}
        </TableBody>
      </Table>
      </div>
      <div className="border-t px-3 py-2">
        <TablePaginationFooter
          pagination={pagination}
          totalItems={sortedRows.length}
          itemNoun="member"
        />
      </div>
    </div>
  );
}

function HeaderWithTooltip({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 text-muted-foreground/70 hover:text-foreground"
              aria-label={`${label} info`}
              type="button"
              tabIndex={-1}
            >
              <Info className="h-3 w-3" />
            </Button>
          }
        />
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </span>
  );
}
