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
import { getRetentionMetrics } from '@/lib/actions/patient-engagement';
import type { RetentionMetric } from '@/lib/types/patient-engagement';

interface RetentionSiteComparisonProps {
  companyId: string;
}

export function RetentionSiteComparison({ companyId }: RetentionSiteComparisonProps) {
  const [metrics, setMetrics] = useState<RetentionMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await getRetentionMetrics(companyId);
      if (res.success && res.data) setMetrics(res.data);
      setLoading(false);
    };
    load();
  }, [companyId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading metrics...</p>;
  }

  const siteMetrics = metrics.filter((m) => m.site_id);

  const latestBySite = new Map<string, RetentionMetric>();
  for (const m of siteMetrics) {
    if (!m.site_id) continue;
    if (!latestBySite.has(m.site_id)) {
      latestBySite.set(m.site_id, m);
    }
  }

  const siteData = Array.from(latestBySite.values()).sort(
    (a, b) => (b.retention_rate || 0) - (a.retention_rate || 0)
  );

  return (
    <div className="rounded-lg border bg-white">
      <div className="p-4 border-b">
        <h3 className="text-sm font-medium">Site-by-Site Retention Comparison</h3>
        <p className="text-xs text-muted-foreground">Latest retention metrics per site</p>
      </div>

      {siteData.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No site-level retention metrics available
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site</TableHead>
              <TableHead className="text-right">Enrolled</TableHead>
              <TableHead className="text-right">Active</TableHead>
              <TableHead className="text-right">Withdrawn</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">Retention Rate</TableHead>
              <TableHead>Period</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {siteData.map((m) => {
              const rateColor =
                (m.retention_rate || 0) >= 80
                  ? 'text-green-700'
                  : (m.retention_rate || 0) >= 60
                    ? 'text-yellow-700'
                    : 'text-red-700';
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.site_id}</TableCell>
                  <TableCell className="text-right">{m.enrolled}</TableCell>
                  <TableCell className="text-right">{m.active}</TableCell>
                  <TableCell className="text-right">{m.withdrawn}</TableCell>
                  <TableCell className="text-right">{m.completed}</TableCell>
                  <TableCell className={`text-right font-semibold ${rateColor}`}>
                    {m.retention_rate != null ? `${m.retention_rate.toFixed(1)}%` : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.period_start} to {m.period_end}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
