'use client';

import { useEffect, useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { getIntegrationConfigs, getSyncLogs } from '@/lib/actions/integrations';
import type { IntegrationConfig, IntegrationSyncLog } from '@/lib/types/integrations';
import { IRTSyncPanel } from './irt-sync-panel';

interface IRTConfigClientProps {
  companyId: string;
  profileId: string;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  error: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
};

export function IRTConfigClient({ companyId, profileId }: IRTConfigClientProps) {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [syncLogs, setSyncLogs] = useState<IntegrationSyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const configsRes = await getIntegrationConfigs(companyId, { integration_type: 'irt' });
    if (configsRes.success && configsRes.data) {
      setConfigs(configsRes.data.items);
      if (configsRes.data.items.length > 0) {
        const logsRes = await getSyncLogs(companyId, configsRes.data.items[0].id);
        if (logsRes.success && logsRes.data) setSyncLogs(logsRes.data);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [companyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Loading IRT configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-medium mb-3">IRT Connections</h3>
        {configs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-3">
              No IRT integrations configured. Set up a connection to sync randomization and supply data.
            </p>
            <p className="text-xs text-muted-foreground">
              Use the Integrations page to create a new IRT integration configuration.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">{config.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[config.status] || ''}>
                      {config.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono max-w-[200px] truncate">
                    {(config.config_json as Record<string, unknown>)?.endpoint as string || '—'}
                  </TableCell>
                  <TableCell>{new Date(config.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <IRTSyncPanel syncLogs={syncLogs} onRefresh={load} />
    </div>
  );
}
