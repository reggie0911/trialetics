'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Download } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  getExportConfigs,
  getExportLogs,
  triggerExport,
} from '@/lib/actions/financial-integration';
import { ExportConfigDialog } from './export-config-dialog';
import type { FinancialExportConfig, FinancialExportLog } from '@/lib/types/financial-integration';
import { EXPORT_FORMAT_LABELS, EXPORT_STATUS_LABELS } from '@/lib/types/financial-integration';

interface FinanceTabProps {
  companyId: string;
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (['active', 'completed', 'closed', 'acknowledged'].includes(status)) return 'default';
  if (['inactive', 'draft', 'pending'].includes(status)) return 'secondary';
  if (['error', 'failed'].includes(status)) return 'destructive';
  if (['running', 'generating', 'submitted'].includes(status)) return 'outline';
  return 'secondary';
}

export function FinanceTab({ companyId }: FinanceTabProps) {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<FinancialExportConfig[]>([]);
  const [logs, setLogs] = useState<FinancialExportLog[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    const [cfgRes, logRes] = await Promise.all([
      getExportConfigs(companyId, { pageSize: 50 }),
      getExportLogs(companyId),
    ]);
    if (cfgRes.success && cfgRes.data) {
      setConfigs(cfgRes.data.items);
      setTotal(cfgRes.data.total);
    }
    if (logRes.success && logRes.data) setLogs(logRes.data);
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleTriggerExport = async (configId: string) => {
    const result = await triggerExport(configId);
    if (result.success) {
      toast({ title: 'Export triggered' });
      load();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border bg-white p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Configs</p>
          <p className="text-xl font-semibold">{total}</p>
        </div>
        <div className="rounded-lg border bg-white p-3 text-center">
          <p className="text-xs text-muted-foreground">Export Logs</p>
          <p className="text-xl font-semibold">{logs.length}</p>
        </div>
        <div className="rounded-lg border bg-white p-3 text-center">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-xl font-semibold">{configs.filter((c) => c.active).length}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={() => setShowConfigDialog(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Create Config
        </Button>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Export Configs</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading...</div>
          ) : configs.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">No items found</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Target System</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Last Export</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-xs">{c.name}</TableCell>
                      <TableCell className="text-xs">{EXPORT_FORMAT_LABELS[c.export_format]}</TableCell>
                      <TableCell className="text-xs">{c.target_system || '—'}</TableCell>
                      <TableCell className="text-xs">{c.schedule || '—'}</TableCell>
                      <TableCell className="text-xs">
                        {c.last_export_at ? new Date(c.last_export_at).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTriggerExport(c.id)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Export
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Export Logs</p>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">No items found</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Config</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{l.config?.name ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(l.status)}>{EXPORT_STATUS_LABELS[l.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{l.file_name || '—'}</TableCell>
                      <TableCell className="text-xs">{l.record_count}</TableCell>
                      <TableCell className="text-xs">{new Date(l.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ExportConfigDialog open={showConfigDialog} onOpenChange={setShowConfigDialog} onSuccess={load} />
    </div>
  );
}
