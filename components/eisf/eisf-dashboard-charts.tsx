'use client';

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { EisfDashboardStats } from '@/lib/types/eisf';
import { cn } from '@/lib/utils';

const ecrfChartSurfaceClass =
  '[&_.recharts-cartesian-axis-tick_text]:!fill-foreground [&_.recharts-cartesian-axis-tick_tspan]:!fill-foreground ' +
  '[&_.recharts-cartesian-axis-label_text]:!fill-foreground [&_.recharts-cartesian-axis-label_tspan]:!fill-foreground ' +
  '[&_.recharts-label-list_text]:!fill-foreground [&_.recharts-label-list_tspan]:!fill-foreground ' +
  '[&_.recharts-pie-labels_text]:!fill-foreground [&_.recharts-pie-labels_tspan]:!fill-foreground';

const STATUS_LABELS: Record<string, string> = {
  missing: 'Missing',
  uploaded: 'Uploaded',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
};

const statusChartConfig = {
  count: { label: 'Documents', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig;

const siteChartConfig = {
  pct: { label: 'Completeness %', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;

function statusRows(byStatus: Record<string, number> | null | undefined) {
  if (!byStatus) return [];
  return Object.entries(byStatus).map(([key, value]) => ({
    name: STATUS_LABELS[key] ?? key,
    key,
    value,
  }));
}

export function EisfDashboardCharts({ stats }: { stats: EisfDashboardStats | null }) {
  if (!stats) {
    return (
      <p className="text-sm text-muted-foreground">Select a study or add site folders to see analytics.</p>
    );
  }

  const statusData = statusRows(stats.by_status).filter((d) => d.value > 0);
  const siteData = (stats.by_site ?? []).map((s) => ({
    name: s.site_number ? `${s.site_number} — ${s.site_name}` : s.site_name,
    pct: Number(s.completeness_pct),
    folderId: s.folder_id,
  }));
  const req = stats.requests ?? { open: 0, fulfilled: 0, overdue: 0 };
  const requestBar = [
    { name: 'Open', value: req.open },
    { name: 'Fulfilled', value: req.fulfilled },
    { name: 'Overdue', value: req.overdue },
  ];
  const exp = (stats.expiring_buckets ?? []).map((b) => ({
    name: b.bucket,
    cnt: Number(b.cnt),
  }));

  const pieData = statusData.map((d, i) => ({
    ...d,
    fill: `hsl(var(--chart-${(i % 5) + 1}))`,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-medium mb-3">Document status</h3>
        {pieData.length === 0 ? (
          <p className="text-xs text-muted-foreground">No documents yet.</p>
        ) : (
          <ChartContainer config={statusChartConfig} className={cn('mx-auto aspect-square max-h-[280px]', ecrfChartSurfaceClass)}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        )}
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-medium mb-3">Site completeness (% approved)</h3>
        {siteData.length === 0 ? (
          <p className="text-xs text-muted-foreground">No site folders.</p>
        ) : (
          <ChartContainer config={siteChartConfig} className={cn('h-[280px] w-full aspect-auto', ecrfChartSurfaceClass)}>
            <BarChart data={siteData} layout="vertical" margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" domain={[0, 100]} tickLine={false} />
              <YAxis type="category" dataKey="name" width={120} tickLine={false} tickMargin={4} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="pct" fill="hsl(var(--chart-2))" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-medium mb-3">Document requests</h3>
        <ChartContainer config={{ value: { label: 'Count', color: 'hsl(var(--chart-3))' } }} className={cn('h-[220px] w-full', ecrfChartSurfaceClass)}>
          <BarChart data={requestBar}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" tickLine={false} />
            <YAxis tickLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={4} />
          </BarChart>
        </ChartContainer>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-medium mb-3">Expiration buckets</h3>
        {exp.length === 0 ? (
          <p className="text-xs text-muted-foreground">No expiration data.</p>
        ) : (
          <ChartContainer config={{ cnt: { label: 'Documents', color: 'hsl(var(--chart-4))' } }} className={cn('h-[220px] w-full', ecrfChartSurfaceClass)}>
            <BarChart data={exp}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tickLine={false} />
              <YAxis tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="cnt" fill="hsl(var(--chart-4))" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
