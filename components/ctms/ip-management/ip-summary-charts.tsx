'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { IpStudyMetricRow } from '@/lib/types/ip-management';
import { IP_CATEGORY_LABELS, type IpCategory } from '@/lib/types/ip-management';

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(173 58% 39%)',
  'hsl(262 83% 58%)',
  'hsl(25 95% 53%)',
];

interface IpSummaryChartsProps {
  metrics: IpStudyMetricRow[];
}

export function IpSummaryCharts({ metrics }: IpSummaryChartsProps) {
  const stockFlowData = metrics.map((m) => ({
    name: m.item_name.length > 20 ? `${m.item_name.slice(0, 18)}…` : m.item_name,
    globalInStock: m.global_in_stock,
    globalSentCumulative: m.global_sent,
    globalReturnsCumulative: m.global_returns,
    siteInTransit: m.site_in_transit,
    siteReceivedCumulative: m.site_shipments,
    siteOnsite: m.site_onsite,
    siteAvailable: m.site_available,
  }));

  const byCategory: Record<string, number> = {};
  for (const m of metrics) {
    byCategory[m.category] = (byCategory[m.category] ?? 0) + m.site_onsite + m.global_in_stock;
  }
  const pieData = Object.entries(byCategory).map(([key, value]) => ({
    name: IP_CATEGORY_LABELS[key as IpCategory] ?? key,
    value,
  }));

  if (metrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inventory charts</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">No items to chart yet.</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 print:grid-cols-1">
      <Card className="print:break-inside-avoid">
        <CardHeader>
          <CardTitle className="text-base">Point-in-time vs cumulative (by item)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Grouped bars: point-in-time stock uses solid primary tones; cumulative ledger totals (sent, returns) use
            neutral and warning tones so they are not read as on-hand stock.
          </p>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stockFlowData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-28} textAnchor="end" height={72} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="globalInStock" name="Global in stock (now)" fill="hsl(173 58% 42%)" />
              <Bar dataKey="siteOnsite" name="Site on hand (now)" fill="hsl(var(--primary))" />
              <Bar dataKey="siteAvailable" name="Site available (now)" fill="hsl(199 89% 48%)" />
              <Bar dataKey="siteInTransit" name="In transit to site (ledger)" fill="hsl(280 65% 52%)" />
              <Bar dataKey="siteReceivedCumulative" name="Received at site (cumulative)" fill="hsl(142 45% 42%)" />
              <Bar dataKey="globalSentCumulative" name="Shipped from global (cumulative)" fill="hsl(var(--muted-foreground))" />
              <Bar dataKey="globalReturnsCumulative" name="Returns (cumulative)" fill="hsl(38 92% 50%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="print:break-inside-avoid">
        <CardHeader>
          <CardTitle className="text-base">Mix by category</CardTitle>
          <p className="text-xs text-muted-foreground">Sum of global in-stock and site on-hand quantities.</p>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={88}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
