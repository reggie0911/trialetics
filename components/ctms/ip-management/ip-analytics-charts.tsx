'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  LabelList,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DispositionBucket, LifecycleMetrics, SiteAnalyticsRow } from '@/lib/utils/ip-analytics-metrics';

const BAR_CORNER_RADIUS: [number, number, number, number] = [5, 5, 0, 0];
const BAR_LABEL_FILL = 'hsl(var(--foreground))';

const DISPOSITION_COLORS: Record<string, string> = {
  available: 'hsl(142 45% 42%)',
  used: 'hsl(var(--muted-foreground))',
  verified: 'hsl(199 89% 48%)',
  returned: 'hsl(38 92% 50%)',
  destroyed: 'hsl(0 72% 51%)',
  transferred: 'hsl(173 58% 42%)',
  archived: 'hsl(var(--muted))',
};

const DISPOSITION_LABELS: Record<string, string> = {
  available: 'Available',
  used: 'Used',
  verified: 'Verified',
  returned: 'Returned',
  destroyed: 'Destroyed',
  transferred: 'Transferred',
  archived: 'Archived',
};

function formatBarLabel(value: unknown): string {
  if (typeof value === 'number' && value > 0) return String(value);
  return '';
}

function truncateLabel(s: string, max = 18): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

interface IpAnalyticsChartsProps {
  dispositionBreakdown: DispositionBucket[];
  lifecycle: LifecycleMetrics;
  siteAnalytics: SiteAnalyticsRow[];
  availableCount: number;
  usedCount: number;
  verifiedCount: number;
}

export function IpAnalyticsCharts({
  dispositionBreakdown,
  lifecycle,
  siteAnalytics,
  availableCount,
  usedCount,
  verifiedCount,
}: IpAnalyticsChartsProps) {
  const pieData = dispositionBreakdown.map((b) => ({
    name: DISPOSITION_LABELS[b.disposition] ?? b.disposition,
    value: b.count,
    fill: DISPOSITION_COLORS[b.disposition] ?? 'hsl(var(--primary))',
  }));

  const statusBarData = [
    { name: 'Available', value: availableCount, fill: DISPOSITION_COLORS.available },
    { name: 'Used', value: usedCount, fill: DISPOSITION_COLORS.used },
    { name: 'Verified', value: verifiedCount, fill: DISPOSITION_COLORS.verified },
  ];

  const verificationSiteData = siteAnalytics
    .filter((s) => s.used > 0 || s.pendingVerification > 0)
    .slice(0, 15)
    .map((s) => ({
      name: truncateLabel(s.siteLabel, 20),
      verified: s.used - s.pendingVerification,
      pending: s.pendingVerification,
    }));

  const agingData = [
    { bucket: '30-60 days', count: lifecycle.agingBuckets.over30 },
    { bucket: '60-90 days', count: lifecycle.agingBuckets.over60 },
    { bucket: '90+ days', count: lifecycle.agingBuckets.over90 },
  ];

  const timingData = [
    { metric: 'Avg days to use', days: lifecycle.avgDaysToUse ?? 0 },
    { metric: 'Avg days to verify', days: lifecycle.avgDaysToVerify ?? 0 },
    { metric: 'Avg lifecycle age', days: lifecycle.avgLifecycleAge ?? 0 },
  ];

  const siteVolumeData = siteAnalytics.slice(0, 10).map((s) => ({
    name: truncateLabel(s.siteLabel, 20),
    total: s.total,
    available: s.available,
    used: s.used,
  }));

  return (
    <div className="space-y-4 print:[print-color-adjust:exact] print:[-webkit-print-color-adjust:exact]">
      <div className="grid gap-4 lg:grid-cols-2 print:grid-cols-1">
        {/* Disposition donut */}
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-base">Inventory by disposition</CardTitle>
            <CardDescription className="text-xs">Breakdown of all inventory units</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    label={({ name, value }) => `${String(name)}: ${value}`}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Availability vs Usage */}
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-base">Availability vs usage</CardTitle>
            <CardDescription className="text-xs">Available, used, and verified counts</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusBarData} margin={{ top: 22, right: 8, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={36} />
                <Tooltip />
                <Bar dataKey="value" name="Count" radius={BAR_CORNER_RADIUS}>
                  {statusBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="value" position="top" fontSize={9} fill={BAR_LABEL_FILL} formatter={formatBarLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Verification by site (stacked) */}
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-base">Verified vs pending verification (by site)</CardTitle>
            <CardDescription className="text-xs">Sites with used inventory</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {verificationSiteData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No used lines for this view.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={verificationSiteData} margin={{ top: 16, right: 8, left: 0, bottom: 56 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} tickMargin={8} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={36} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="verified" name="Verified" stackId="a" fill="hsl(142 45% 42%)">
                    <LabelList dataKey="verified" position="top" fontSize={9} fill={BAR_LABEL_FILL} formatter={formatBarLabel} />
                  </Bar>
                  <Bar dataKey="pending" name="Pending" stackId="a" fill="hsl(38 92% 50%)" radius={BAR_CORNER_RADIUS}>
                    <LabelList dataKey="pending" position="top" fontSize={9} fill={BAR_LABEL_FILL} formatter={formatBarLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Aging buckets */}
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-base">Inventory aging buckets</CardTitle>
            <CardDescription className="text-xs">Available items by days since received</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingData} margin={{ top: 22, right: 8, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={36} />
                <Tooltip />
                <Bar dataKey="count" name="Items" fill="hsl(38 92% 50%)" radius={BAR_CORNER_RADIUS}>
                  <LabelList dataKey="count" position="top" fontSize={9} fill={BAR_LABEL_FILL} formatter={formatBarLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Timing metrics */}
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-base">Lifecycle timing</CardTitle>
            <CardDescription className="text-xs">Average days between key milestones</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timingData} layout="vertical" margin={{ top: 8, right: 32, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="metric" tick={{ fontSize: 10 }} width={120} />
                <Tooltip />
                <Bar dataKey="days" name="Days" fill="hsl(var(--primary))" radius={[0, 5, 5, 0]}>
                  <LabelList dataKey="days" position="right" fontSize={9} fill={BAR_LABEL_FILL} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top sites by volume */}
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-base">Top sites by inventory volume</CardTitle>
            <CardDescription className="text-xs">Available and used counts per site</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {siteVolumeData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No site data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={siteVolumeData} margin={{ top: 22, right: 8, left: 0, bottom: 56 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} tickMargin={8} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={36} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="available" name="Available" fill="hsl(142 45% 42%)" radius={BAR_CORNER_RADIUS}>
                    <LabelList dataKey="available" position="top" fontSize={9} fill={BAR_LABEL_FILL} formatter={formatBarLabel} />
                  </Bar>
                  <Bar dataKey="used" name="Used" fill="hsl(var(--muted-foreground))" radius={BAR_CORNER_RADIUS}>
                    <LabelList dataKey="used" position="top" fontSize={9} fill={BAR_LABEL_FILL} formatter={formatBarLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
