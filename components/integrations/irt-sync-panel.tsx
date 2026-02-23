'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { IntegrationSyncLog } from '@/lib/types/integrations';

interface IRTSyncPanelProps {
  syncLogs: IntegrationSyncLog[];
  onRefresh: () => void;
}

const statusColors: Record<string, string> = {
  success: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  in_progress: 'bg-blue-100 text-blue-800',
  partial: 'bg-yellow-100 text-yellow-800',
};

export function IRTSyncPanel({ syncLogs, onRefresh }: IRTSyncPanelProps) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium">Sync History</h3>
          <p className="text-xs text-muted-foreground">
            IRT data synchronization logs. CSV import serves as API stand-in.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onRefresh}>
          Refresh
        </Button>
      </div>

      {syncLogs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No sync operations recorded
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Started</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Records</TableHead>
              <TableHead>Errors</TableHead>
              <TableHead>Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {syncLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  {new Date(log.started_at || log.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[log.status] || ''}>
                    {log.status}
                  </Badge>
                </TableCell>
                <TableCell>{log.records_processed ?? '—'}</TableCell>
                <TableCell className={log.records_failed && log.records_failed > 0 ? 'text-red-600' : ''}>
                  {log.records_failed ?? 0}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {log.completed_at && log.started_at
                    ? `${Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)}s`
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
