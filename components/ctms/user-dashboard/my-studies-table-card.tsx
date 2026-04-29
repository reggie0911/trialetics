'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPlanDate } from '@/lib/utils/visit-window';
import type { StudyDashboardRow } from '@/lib/dashboard/ctms-dashboard-overview';
import type { Study } from '@/lib/types/ctms';

const ROW_LIMIT = 5;

interface MyStudiesTableCardProps {
  studies: Study[];
  rows: StudyDashboardRow[];
}

export function MyStudiesTableCard({ studies, rows: liveRows }: MyStudiesTableCardProps) {
  const router = useRouter();
  const rows = liveRows.slice(0, ROW_LIMIT);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b">
        <CardTitle className="text-base font-semibold">My Studies</CardTitle>
        <Link
          href="/protected/studies/catalog"
          className="text-xs font-medium text-sky-600 underline-offset-4 hover:underline dark:text-sky-400"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="px-0 pt-0">
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No studies yet.{' '}
            <Link href="/protected/studies/new" className="text-sky-600 underline-offset-4 hover:underline dark:text-sky-400">
              Create your first study
            </Link>
            .
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Study</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Sites</TableHead>
                  <TableHead className="min-w-[180px]">Enrollment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="w-9 pr-4 text-right">
                    <span className="sr-only">Row actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((study) => {
                  return (
                    <TableRow
                      key={study.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => router.push(`/protected/studies/${study.id}`)}
                    >
                      <TableCell className="pl-4">
                        <Link
                          href={`/protected/studies/${study.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="block min-w-0"
                        >
                          <div
                            className="truncate font-semibold text-sky-600 hover:underline dark:text-sky-400"
                            title={study.title}
                          >
                            {study.title}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {study.protocolNumber}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium">
                          {study.phase}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-foreground">
                        {study.activeSites} / {study.totalSites}
                      </TableCell>
                      <TableCell>
                        <EnrollmentCell
                          enrolled={study.enrolled}
                          target={study.enrollmentTarget}
                        />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={study.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatPlanDate(study.updatedAt)}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Open ${study.protocolNumber} actions`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/protected/studies/${study.id}`);
                                }}
                              />
                            }
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </TooltipTrigger>
                          <TooltipContent side="left">Open study</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="border-t px-4 py-2.5 text-xs text-muted-foreground">
          Showing 1 to {rows.length} of {studies.length} {studies.length === 1 ? 'study' : 'studies'}
        </div>
      </CardContent>
    </Card>
  );
}

function EnrollmentCell({ enrolled, target }: { enrolled: number; target: number }) {
  const percent = target > 0 ? Math.round((enrolled / target) * 100) : 0;
  const fillTone =
    percent >= 60
      ? 'bg-emerald-500'
      : percent >= 30
        ? 'bg-sky-500'
        : 'bg-amber-500';
  return (
    <div className="flex flex-col gap-1">
      <div className="text-sm tabular-nums text-foreground">
        {enrolled} / {target} ({percent}%)
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', fillTone)}
          style={{ width: `${Math.min(100, percent)}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}
