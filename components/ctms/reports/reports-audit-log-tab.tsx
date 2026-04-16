'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ReportRunAuditRecord, ReportExportAuditRecord } from '@/lib/types/reports';

interface ReportsAuditLogTabProps {
  runAudit: ReportRunAuditRecord[];
  exportAudit: ReportExportAuditRecord[];
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'succeeded') return <Badge className="bg-emerald-600">{status}</Badge>;
  if (status === 'failed') return <Badge variant="destructive">{status}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export function ReportsAuditLogTab({ runAudit, exportAudit }: ReportsAuditLogTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Report Run Audit</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Dataset</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runAudit.length ? (
                runAudit.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs">{new Date(row.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{row.dataset_key}</TableCell>
                    <TableCell className="text-xs">{row.run_context}</TableCell>
                    <TableCell className="text-xs">
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-xs">{row.row_count ?? '-'}</TableCell>
                    <TableCell className="text-xs">{row.duration_ms ? `${row.duration_ms}ms` : '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="text-sm text-muted-foreground" colSpan={6}>
                    No report runs logged yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export Audit</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Dataset</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exportAudit.length ? (
                exportAudit.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs">{new Date(row.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{row.dataset_key}</TableCell>
                    <TableCell className="text-xs uppercase">{row.export_format}</TableCell>
                    <TableCell className="text-xs">
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-xs">{row.row_count ?? '-'}</TableCell>
                    <TableCell className="max-w-[340px] truncate text-xs text-muted-foreground">
                      {row.error_message ?? '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="text-sm text-muted-foreground" colSpan={6}>
                    No export events logged yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
