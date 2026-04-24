'use client';

import { Grid3x3 } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

import {
  TEAM_ROLE_LABEL,
  TEAM_ROLE_OPTIONS,
  type TeamMemberRole,
  type TeamMemberWithStudies,
} from '@/lib/types/ctms';

interface StudyTeamAssignmentMatrixProps {
  members: TeamMemberWithStudies[];
  studyContextId: string;
}

export function StudyTeamAssignmentMatrix({
  members,
  studyContextId,
}: StudyTeamAssignmentMatrixProps) {
  const rolesInUse = new Set<TeamMemberRole>();
  for (const m of members) {
    for (const a of m.assignments) {
      if (a.study_id === studyContextId) rolesInUse.add(a.role);
    }
  }
  const roles =
    rolesInUse.size > 0
      ? TEAM_ROLE_OPTIONS.filter(
          (opt) => opt.value !== 'custom' && rolesInUse.has(opt.value)
        )
      : TEAM_ROLE_OPTIONS.filter((opt) => opt.value !== 'custom').slice(0, 6);

  return (
    <div className="space-y-4">
      <Card className="border-dashed">
        <CardContent className="flex items-start gap-3 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-100/70 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
            <Grid3x3 className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Assignment Matrix
              <Badge variant="secondary" className="ml-2 text-[10px]">
                Beta
              </Badge>
            </p>
            <p className="text-xs text-muted-foreground">
              Quick view of who covers which study role. Cells show the assigned
              site (or a check when no site is set). Edit assignments via Manage.
            </p>
          </div>
        </CardContent>
      </Card>

      {members.length === 0 ? (
        <div className="rounded-md border bg-background p-8 text-center text-xs text-muted-foreground">
          No assignments yet. Use Invite User or Manage to staff this study.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-medium text-muted-foreground">
                  Member
                </TableHead>
                {roles.map((r) => (
                  <TableHead
                    key={r.value}
                    className="text-center text-[11px] font-medium text-muted-foreground"
                  >
                    {TEAM_ROLE_LABEL[r.value]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const initials =
                  ((m.first_name?.[0] ?? '') + (m.last_name?.[0] ?? '')).toUpperCase() ||
                  (m.email?.[0] ?? '?').toUpperCase();
                const fullName =
                  [m.first_name, m.last_name].filter(Boolean).join(' ') ||
                  m.email ||
                  'Unknown';
                return (
                  <TableRow key={m.profile_id} className="h-12">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px]">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-foreground">
                            {fullName}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {m.email ?? '—'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    {roles.map((r) => {
                      const a = m.assignments.find(
                        (asg) => asg.study_id === studyContextId && asg.role === r.value
                      );
                      return (
                        <TableCell
                          key={r.value}
                          className={cn(
                            'text-center text-[11px]',
                            a ? 'text-foreground' : 'text-muted-foreground/40'
                          )}
                        >
                          {a ? a.site_name ?? '✓' : '—'}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
