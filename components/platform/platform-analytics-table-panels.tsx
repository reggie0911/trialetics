'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  PlatformAnalyticsAuditFeedRow,
  PlatformAnalyticsCompanyRow,
} from '@/lib/types/platform-analytics';
import { cn } from '@/lib/utils';

type SortKey =
  | 'name'
  | 'plan'
  | 'subscription_status'
  | 'member_count'
  | 'has_ctms_access'
  | 'has_etmf_access'
  | 'has_tracker_access'
  | 'enabled_study_tracker_key_count'
  | 'custom_definitions_count'
  | 'last_audit_at';

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function downloadCompaniesCsv(rows: PlatformAnalyticsCompanyRow[]) {
  const headers = [
    'name',
    'plan',
    'subscription_status',
    'member_count',
    'has_ctms_access',
    'has_etmf_access',
    'has_tracker_access',
    'enabled_study_tracker_key_count',
    'custom_definitions_count',
    'last_audit_at',
  ];
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        csvEscape(r.name),
        csvEscape(r.plan),
        csvEscape(r.subscription_status),
        String(r.member_count),
        r.has_ctms_access ? 'true' : 'false',
        r.has_etmf_access ? 'true' : 'false',
        r.has_tracker_access ? 'true' : 'false',
        String(r.enabled_study_tracker_key_count),
        String(r.custom_definitions_count),
        csvEscape(r.last_audit_at ?? ''),
      ].join(',')
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `platform-companies-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function SortHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: 'asc' | 'desc';
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('-ml-3 h-8 gap-1 font-medium', active && 'text-primary')}
      onClick={onClick}
    >
      {label}
      {active &&
        (direction === 'asc' ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" />
        ))}
    </Button>
  );
}

export function PlatformAnalyticsTablePanels({
  companies,
  recentAudit,
}: {
  companies: PlatformAnalyticsCompanyRow[];
  recentAudit: PlatformAnalyticsAuditFeedRow[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const arr = [...companies];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (sortKey === 'last_audit_at') {
        const as = a.last_audit_at ? new Date(a.last_audit_at).getTime() : 0;
        const bs = b.last_audit_at ? new Date(b.last_audit_at).getTime() : 0;
        return (as - bs) * dir;
      }
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      if (typeof av === 'boolean' && typeof bv === 'boolean') {
        return (Number(av) - Number(bv)) * dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });
    return arr;
  }, [companies, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const categoryLabel = (c: string) => {
    switch (c) {
      case 'module_flags':
        return 'Modules';
      case 'study_keys':
        return 'Study keys';
      case 'tracker_def':
        return 'Tracker';
      default:
        return c;
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
          <div>
            <CardTitle className="text-base">Companies</CardTitle>
            <p className="text-xs text-muted-foreground">Same columns as CSV export · sort by header</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => downloadCompaniesCsv(sorted)}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortHeader
                    label="Name"
                    active={sortKey === 'name'}
                    direction={sortDir}
                    onClick={() => toggleSort('name')}
                  />
                </TableHead>
                <TableHead>
                  <SortHeader
                    label="Plan"
                    active={sortKey === 'plan'}
                    direction={sortDir}
                    onClick={() => toggleSort('plan')}
                  />
                </TableHead>
                <TableHead>
                  <SortHeader
                    label="Sub status"
                    active={sortKey === 'subscription_status'}
                    direction={sortDir}
                    onClick={() => toggleSort('subscription_status')}
                  />
                </TableHead>
                <TableHead className="text-right">
                  <SortHeader
                    label="Members"
                    active={sortKey === 'member_count'}
                    direction={sortDir}
                    onClick={() => toggleSort('member_count')}
                  />
                </TableHead>
                <TableHead>CTMS</TableHead>
                <TableHead>eTMF</TableHead>
                <TableHead>Trk</TableHead>
                <TableHead className="text-right">Keys</TableHead>
                <TableHead className="text-right">Defs</TableHead>
                <TableHead>
                  <SortHeader
                    label="Last audit"
                    active={sortKey === 'last_audit_at'}
                    direction={sortDir}
                    onClick={() => toggleSort('last_audit_at')}
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium max-w-[160px] truncate">{r.name}</TableCell>
                  <TableCell className="capitalize">{r.plan}</TableCell>
                  <TableCell className="text-muted-foreground">{r.subscription_status}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.member_count}</TableCell>
                  <TableCell>{r.has_ctms_access ? '·' : '—'}</TableCell>
                  <TableCell>{r.has_etmf_access ? '·' : '—'}</TableCell>
                  <TableCell>{r.has_tracker_access ? '·' : '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.enabled_study_tracker_key_count}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.custom_definitions_count}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {r.last_audit_at
                      ? format(new Date(r.last_audit_at), 'MMM d, yyyy HH:mm')
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent configuration audit</CardTitle>
          <p className="text-xs text-muted-foreground">Last 50 events · cross-tenant</p>
        </CardHeader>
        <CardContent className="max-h-[480px] overflow-y-auto space-y-3 pr-1">
          {recentAudit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit rows yet.</p>
          ) : (
            recentAudit.map((ev) => (
              <div
                key={ev.id}
                className="rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-sm space-y-0.5"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-medium truncate" title={ev.company_name}>
                    {ev.company_name}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
                    {categoryLabel(ev.category)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(ev.changed_at), 'MMM d, yyyy HH:mm')} · {ev.summary}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
