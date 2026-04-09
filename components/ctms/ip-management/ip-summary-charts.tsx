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

const PIE_OUTER_RADIUS = 88;
/** Inner cut-out for donut chart (must be less than outer) */
const PIE_INNER_RADIUS = 52;

const BAR_LABEL_FILL = 'hsl(var(--foreground))';

/** Top-left, top-right, bottom-right, bottom-left — top only for upright columns */
const BAR_CORNER_RADIUS: [number, number, number, number] = [5, 5, 0, 0];

function formatBarValueLabel(value: unknown): string {
  if (typeof value === 'number' && value > 0) return String(value);
  return '';
}

interface IpSummaryChartsProps {
  metrics: IpStudyMetricRow[];
}

export function IpSummaryCharts({ metrics }: IpSummaryChartsProps) {
  const stockFlowData = metrics.map((m) => ({
    name: m.item_name.length > 20 ? `${m.item_name.slice(0, 18)}…` : m.item_name,
    globalInStock: m.global_in_stock,
    globalSentCumulative: m.global_sent,
    globalReturnsCumulative: m.global_returns,
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

  return (
    <div className="space-y-4 print:[print-color-adjust:exact] print:[-webkit-print-color-adjust:exact]">
      {metrics.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory charts</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">No items to chart yet.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 print:grid-cols-1">
          <Card className="print:break-inside-avoid">
            <CardHeader>
              <CardTitle className="text-base">Point-in-time vs cumulative (by item)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockFlowData} margin={{ top: 22, right: 8, left: 0, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9 }}
                    interval={0}
                    tickMargin={8}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={false}
                    tickLine={false}
                    axisLine={false}
                    width={0}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar
                    dataKey="globalInStock"
                    name="Global in stock"
                    fill="hsl(173 58% 42%)"
                    radius={BAR_CORNER_RADIUS}
                  >
                    <LabelList
                      dataKey="globalInStock"
                      position="top"
                      fontSize={9}
                      fill={BAR_LABEL_FILL}
                      formatter={formatBarValueLabel}
                    />
                  </Bar>
                  <Bar dataKey="siteOnsite" name="Site on hand" fill="hsl(var(--primary))" radius={BAR_CORNER_RADIUS}>
                    <LabelList
                      dataKey="siteOnsite"
                      position="top"
                      fontSize={9}
                      fill={BAR_LABEL_FILL}
                      formatter={formatBarValueLabel}
                    />
                  </Bar>
                  <Bar dataKey="siteAvailable" name="Site available" fill="hsl(199 89% 48%)" radius={BAR_CORNER_RADIUS}>
                    <LabelList
                      dataKey="siteAvailable"
                      position="top"
                      fontSize={9}
                      fill={BAR_LABEL_FILL}
                      formatter={formatBarValueLabel}
                    />
                  </Bar>
                  <Bar
                    dataKey="siteReceivedCumulative"
                    name="Received at site"
                    fill="hsl(142 45% 42%)"
                    radius={BAR_CORNER_RADIUS}
                  >
                    <LabelList
                      dataKey="siteReceivedCumulative"
                      position="top"
                      fontSize={9}
                      fill={BAR_LABEL_FILL}
                      formatter={formatBarValueLabel}
                    />
                  </Bar>
                  <Bar
                    dataKey="globalSentCumulative"
                    name="Shipped from global"
                    fill="hsl(var(--muted-foreground))"
                    radius={BAR_CORNER_RADIUS}
                  >
                    <LabelList
                      dataKey="globalSentCumulative"
                      position="top"
                      fontSize={9}
                      fill={BAR_LABEL_FILL}
                      formatter={formatBarValueLabel}
                    />
                  </Bar>
                  <Bar dataKey="globalReturnsCumulative" name="Returns" fill="hsl(38 92% 50%)" radius={BAR_CORNER_RADIUS}>
                    <LabelList
                      dataKey="globalReturnsCumulative"
                      position="top"
                      fontSize={9}
                      fill={BAR_LABEL_FILL}
                      formatter={formatBarValueLabel}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="print:break-inside-avoid">
            <CardHeader>
              <CardTitle className="text-base">Mix by category</CardTitle>
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
                    innerRadius={PIE_INNER_RADIUS}
                    outerRadius={PIE_OUTER_RADIUS}
                    label={({ name, value }) => `${String(name ?? '')}: ${value}`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
