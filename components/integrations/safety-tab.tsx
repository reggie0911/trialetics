'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getSafetyRecords, getSafetyStats } from '@/lib/actions/safety-integration';
import { SafetyRecordDialog } from './safety-record-dialog';
import type {
  SafetyReconciliationRecord,
  SafetyEventType,
  SafetyReportingStatus,
} from '@/lib/types/safety-integration';
import {
  SAFETY_EVENT_TYPE_LABELS,
  SAFETY_REPORTING_STATUS_LABELS,
} from '@/lib/types/safety-integration';

interface SafetyTabProps {
  companyId: string;
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (['active', 'completed', 'closed', 'acknowledged'].includes(status)) return 'default';
  if (['inactive', 'draft', 'pending'].includes(status)) return 'secondary';
  if (['error', 'failed'].includes(status)) return 'destructive';
  if (['running', 'generating', 'submitted'].includes(status)) return 'outline';
  return 'secondary';
}

export function SafetyTab({ companyId }: SafetyTabProps) {
  const { toast } = useToast();
  const [records, setRecords] = useState<SafetyReconciliationRecord[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    draft: number;
    submitted: number;
    acknowledged: number;
    closed: number;
    sae_count: number;
    susar_count: number;
    aesi_count: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [eventTypeFilter, setEventTypeFilter] = useState<SafetyEventType | 'all'>('all');
  const [reportingStatusFilter, setReportingStatusFilter] = useState<SafetyReportingStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    const [recRes, statRes] = await Promise.all([
      getSafetyRecords(companyId, {
        event_type: eventTypeFilter,
        reporting_status: reportingStatusFilter,
        search: search || undefined,
        pageSize: 50,
      }),
      getSafetyStats(companyId),
    ]);
    if (recRes.success && recRes.data) setRecords(recRes.data.items);
    if (statRes.success && statRes.data) setStats(statRes.data);
    setIsLoading(false);
  }, [companyId, eventTypeFilter, reportingStatusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-semibold">{stats.total}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Draft</p>
            <p className="text-xl font-semibold">{stats.draft}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Submitted</p>
            <p className="text-xl font-semibold">{stats.submitted}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Closed</p>
            <p className="text-xl font-semibold">{stats.closed}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">SAE</p>
            <p className="text-xl font-semibold">{stats.sae_count}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">SUSAR</p>
            <p className="text-xl font-semibold">{stats.susar_count}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">AESI</p>
            <p className="text-xl font-semibold">{stats.aesi_count}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>
        <Select value={eventTypeFilter} onValueChange={(v) => setEventTypeFilter(v as SafetyEventType | 'all')}>
          <SelectTrigger className="w-[120px] text-xs h-8">
            <SelectValue placeholder="Event type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {(Object.keys(SAFETY_EVENT_TYPE_LABELS) as SafetyEventType[]).map((k) => (
              <SelectItem key={k} value={k}>
                {SAFETY_EVENT_TYPE_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={reportingStatusFilter} onValueChange={(v) => setReportingStatusFilter(v as SafetyReportingStatus | 'all')}>
          <SelectTrigger className="w-[130px] text-xs h-8">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(SAFETY_REPORTING_STATUS_LABELS) as SafetyReportingStatus[]).map((k) => (
              <SelectItem key={k} value={k}>
                {SAFETY_REPORTING_STATUS_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setShowRecordDialog(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Create SAE
        </Button>
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Safety Reconciliation Records</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading...</div>
          ) : records.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">No items found</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Onset</TableHead>
                    <TableHead>Reported</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-xs">{r.event_number}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{SAFETY_EVENT_TYPE_LABELS[r.event_type]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(r.reporting_status)}>
                          {SAFETY_REPORTING_STATUS_LABELS[r.reporting_status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{r.event_description || '—'}</TableCell>
                      <TableCell className="text-xs">{r.onset_date ? new Date(r.onset_date).toLocaleDateString() : '—'}</TableCell>
                      <TableCell className="text-xs">{r.reported_date ? new Date(r.reported_date).toLocaleDateString() : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <SafetyRecordDialog open={showRecordDialog} onOpenChange={setShowRecordDialog} onSuccess={load} />
    </div>
  );
}
