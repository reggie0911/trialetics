'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Upload, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  getIntegrationConfigs,
  getFieldMappings,
  getSyncLogs,
  triggerSync,
} from '@/lib/actions/integrations';
import { IntegrationConfigDialog } from './integration-config-dialog';
import type { IntegrationConfig, IntegrationFieldMapping, IntegrationSyncLog } from '@/lib/types/integrations';
import { INTEGRATION_STATUS_LABELS, SYNC_STATUS_LABELS } from '@/lib/types/integrations';
import { cn } from '@/lib/utils';

interface EdcTabProps {
  companyId: string;
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (['active', 'completed', 'closed', 'acknowledged'].includes(status)) return 'default';
  if (['inactive', 'draft', 'pending'].includes(status)) return 'secondary';
  if (['error', 'failed'].includes(status)) return 'destructive';
  if (['running', 'generating', 'submitted'].includes(status)) return 'outline';
  return 'secondary';
}

export function EdcTab({ companyId }: EdcTabProps) {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [mappings, setMappings] = useState<IntegrationFieldMapping[]>([]);
  const [syncLogs, setSyncLogs] = useState<IntegrationSyncLog[]>([]);
  const [total, setTotal] = useState(0);
  const [activeSyncs, setActiveSyncs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const [cfgRes, mapRes, logRes] = await Promise.all([
      getIntegrationConfigs(companyId, { integration_type: 'edc', pageSize: 50 }),
      getFieldMappings(companyId),
      getSyncLogs(companyId),
    ]);
    if (cfgRes.success && cfgRes.data) {
      setConfigs(cfgRes.data.items);
      setTotal(cfgRes.data.total);
    }
    if (mapRes.success && mapRes.data) setMappings(mapRes.data);
    if (logRes.success && logRes.data) {
      setSyncLogs(logRes.data);
      setActiveSyncs(logRes.data.filter((l) => l.status === 'running' || l.status === 'pending').length);
    }
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleTriggerSync = async (configId: string) => {
    const result = await triggerSync(configId, 'manual');
    if (result.success) {
      toast({ title: 'Sync triggered' });
      load();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast({ title: 'File selected', description: file.name });
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      toast({ title: 'File dropped', description: file.name });
    } else {
      toast({ title: 'Invalid file', description: 'Please upload a CSV file', variant: 'destructive' });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-white p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Configs</p>
          <p className="text-xl font-semibold">{total}</p>
        </div>
        <div className="rounded-lg border bg-white p-3 text-center">
          <p className="text-xs text-muted-foreground">Active Syncs</p>
          <p className="text-xl font-semibold">{activeSyncs}</p>
        </div>
        <div className="rounded-lg border bg-white p-3 text-center">
          <p className="text-xs text-muted-foreground">Field Mappings</p>
          <p className="text-xl font-semibold">{mappings.length}</p>
        </div>
        <div className="rounded-lg border bg-white p-3 text-center">
          <p className="text-xs text-muted-foreground">Sync Logs</p>
          <p className="text-xl font-semibold">{syncLogs.length}</p>
        </div>
      </div>

      <div
        className={cn(
          'rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-xs text-muted-foreground">Drop CSV file here or click to upload</p>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={() => setShowConfigDialog(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Create Config
        </Button>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">EDC Integration Configs</p>
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
                    <TableHead>Status</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-xs">{c.name}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(c.status)}>{INTEGRATION_STATUS_LABELS[c.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{c.last_sync_at ? new Date(c.last_sync_at).toLocaleString() : '—'}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTriggerSync(c.id)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Sync
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
          <p className="text-sm font-medium">Field Mappings</p>
        </CardHeader>
        <CardContent>
          {mappings.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">No items found</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source Field</TableHead>
                    <TableHead>Target Table</TableHead>
                    <TableHead>Target Field</TableHead>
                    <TableHead>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">{m.source_field}</TableCell>
                      <TableCell className="text-xs">{m.target_table}</TableCell>
                      <TableCell className="text-xs">{m.target_field}</TableCell>
                      <TableCell className="text-xs">{m.active ? 'Yes' : 'No'}</TableCell>
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
          <p className="text-sm font-medium">Sync Logs</p>
        </CardHeader>
        <CardContent>
          {syncLogs.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">No items found</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Config</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Started</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{l.config?.name ?? '—'}</TableCell>
                      <TableCell className="text-xs">{l.sync_type}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(l.status)}>{SYNC_STATUS_LABELS[l.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{l.records_processed}</TableCell>
                      <TableCell className="text-xs">{l.records_failed}</TableCell>
                      <TableCell className="text-xs">{l.started_at ? new Date(l.started_at).toLocaleString() : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <IntegrationConfigDialog
        open={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        onSuccess={load}
        integrationType="edc"
      />
    </div>
  );
}
