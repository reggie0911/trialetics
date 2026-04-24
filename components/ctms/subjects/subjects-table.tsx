'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, Trash2, Users } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { EnrichedSubjectRow } from '@/lib/subjects/derive';
import { STUDY_DEACTIVATED_TOOLTIP } from '@/lib/constants/study-deactivated-message';
import { formatRelativeUpdated } from '@/lib/utils/relative-time';

import { SubjectsDataQualityCell } from './subjects-data-quality-cell';

interface SubjectsTableProps {
  studyId: string;
  subjects: EnrichedSubjectRow[];
  /** Hide the Site column when the tab is scoped to a single site already. */
  hideSiteColumn?: boolean;
  /** When true, total roster is empty (no rows at all — show empty state). */
  emptyTotalSubjects: boolean;
  /** True when the user has at least one filter applied. */
  hasActiveFilters: boolean;
  readOnly: boolean;
  onDelete: (id: string, siteId: string | null) => void;
}

function formatDate(value: string | null) {
  if (!value) return '\u2014';
  const parts = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  return `${day}-${month}-${year}`;
}

export function SubjectsTable({
  studyId,
  subjects,
  hideSiteColumn = false,
  emptyTotalSubjects,
  hasActiveFilters,
  readOnly,
  onDelete,
}: SubjectsTableProps) {
  const router = useRouter();
  const columnCount = hideSiteColumn ? 9 : 10;

  if (emptyTotalSubjects) {
    return (
      <Card className="border-border/70 shadow-none">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">No subjects enrolled</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Enroll subjects to begin tracking their lifecycle.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border/70">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
              Subject ID
            </TableHead>
            <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
              Screening #
            </TableHead>
            <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
              Randomization #
            </TableHead>
            {!hideSiteColumn ? (
              <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                Site
              </TableHead>
            ) : null}
            <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
              Screening Date
            </TableHead>
            <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
              Randomized Date
            </TableHead>
            <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
              Data Quality
            </TableHead>
            <TableHead className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
              Last Activity
            </TableHead>
            <TableHead className="w-[110px] text-right text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="py-8 text-center text-xs text-muted-foreground"
              >
                {hasActiveFilters
                  ? 'No subjects match your filters.'
                  : 'No subjects to display.'}
              </TableCell>
            </TableRow>
          ) : (
            subjects.map((subject) => (
              <SubjectsTableRow
                key={subject.id}
                studyId={studyId}
                subject={subject}
                hideSiteColumn={hideSiteColumn}
                readOnly={readOnly}
                onDelete={onDelete}
                onNavigate={router.push}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

interface SubjectsTableRowProps {
  studyId: string;
  subject: EnrichedSubjectRow;
  hideSiteColumn: boolean;
  readOnly: boolean;
  onDelete: (id: string, siteId: string | null) => void;
  onNavigate: (href: string) => void;
}

function SubjectsTableRow({
  studyId,
  subject,
  hideSiteColumn,
  readOnly,
  onDelete,
  onNavigate,
}: SubjectsTableRowProps) {
  const href = `/protected/studies/${studyId}/subjects/${subject.id}`;
  const navigate = () => onNavigate(href);
  const onKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigate();
    }
  };

  return (
    <TableRow
      className="h-10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      onClick={navigate}
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      <TableCell className="text-xs font-medium">
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-foreground hover:text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {subject.subject_number}
          <ExternalLink className="h-3 w-3 opacity-60" />
        </Link>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground tabular-nums">
        {subject.screening_number || '\u2014'}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground tabular-nums">
        {subject.randomization_number || '\u2014'}
      </TableCell>
      {!hideSiteColumn ? (
        <TableCell className="text-xs text-muted-foreground">
          {subject.study_sites?.site_number ?? '\u2014'}
        </TableCell>
      ) : null}
      <TableCell>
        <StatusBadge status={subject.status} className="text-xs" />
      </TableCell>
      <TableCell className="text-xs text-muted-foreground tabular-nums">
        {formatDate(subject.screening_date)}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground tabular-nums">
        {formatDate(subject.randomization_date)}
      </TableCell>
      <TableCell>
        <SubjectsDataQualityCell
          summary={subject.tracking_summary}
          lockState={subject.lockState}
        />
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {formatRelativeUpdated(subject.lastActivityAt)}
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            render={<Link href={href} />}
            nativeButton={false}
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            View
          </Button>
          {readOnly ? (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled
                  aria-label="Delete subject"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {STUDY_DEACTIVATED_TOOLTIP}
              </TooltipContent>
            </Tooltip>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    aria-label="Delete subject"
                  />
                }
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Subject</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete subject {subject.subject_number} and
                    all associated visits and milestones.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(subject.id, subject.site_id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
