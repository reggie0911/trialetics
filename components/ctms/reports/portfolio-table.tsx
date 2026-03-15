'use client';

import Link from 'next/link';
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
import { KriSummaryBar } from './kri-gauge';
import type { StudyPortfolioRow } from '@/lib/types/ctms';

interface PortfolioTableProps {
  studies: StudyPortfolioRow[];
}

export function PortfolioTable({ studies }: PortfolioTableProps) {
  if (studies.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">No studies in portfolio.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Study</TableHead>
            <TableHead className="text-xs">Phase</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs text-center">Sites</TableHead>
            <TableHead className="text-xs text-center">Subjects</TableHead>
            <TableHead className="text-xs">Enrollment</TableHead>
            <TableHead className="text-xs">KRI Health</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {studies.map((study) => {
            const enrollmentPct = study.totalSubjects > 0
              ? ((study.enrolledSubjects / study.totalSubjects) * 100).toFixed(0)
              : '0';
            return (
              <TableRow key={study.id}>
                <TableCell>
                  <Link
                    href={`/protected/studies/${study.id}`}
                    className="text-xs font-medium hover:underline"
                  >
                    {study.title}
                  </Link>
                  <p className="text-[10px] text-muted-foreground">{study.protocol_number}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{study.phase}</Badge>
                </TableCell>
                <TableCell>
                  <StatusBadge status={study.status} className="text-xs" />
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-xs">
                    <span className="font-medium">{study.activeSites}</span>
                    <span className="text-muted-foreground">/{study.totalSites}</span>
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-xs">
                    <span className="font-medium">{study.enrolledSubjects}</span>
                    <span className="text-muted-foreground">/{study.totalSubjects}</span>
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-muted max-w-[80px]">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${Math.min(100, parseInt(enrollmentPct))}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{enrollmentPct}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  {(study.kriGreen + study.kriYellow + study.kriRed) > 0 ? (
                    <KriSummaryBar
                      green={study.kriGreen}
                      yellow={study.kriYellow}
                      red={study.kriRed}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
