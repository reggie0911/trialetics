'use client';

import { useMemo, useState } from 'react';
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
import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { IpStudyMetricRow } from '@/lib/types/ip-management';
import { IP_CATEGORY_LABELS, type IpCategory } from '@/lib/types/ip-management';
import type { IpInventoryUiContext } from '@/lib/utils/ip-inventory-ui-copy';
import { getIpDrugWorkflowCardCopy, getIpInventoryChartsCopy } from '@/lib/utils/ip-inventory-ui-copy';
import { cn } from '@/lib/utils';

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(173 58% 39%)',
  'hsl(262 83% 58%)',
  'hsl(25 95% 53%)',
];

interface IpSummaryChartsProps {
  metrics: IpStudyMetricRow[];
  /** Drives chart helper text and investigational-product reference card. */
  uiContext?: IpInventoryUiContext;
}

export function IpSummaryCharts({ metrics, uiContext = 'neutral' }: IpSummaryChartsProps) {
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const chartsCopy = useMemo(() => getIpInventoryChartsCopy(uiContext), [uiContext]);
  const workflowCopy = useMemo(
    () => (uiContext === 'ip_drug' ? getIpDrugWorkflowCardCopy() : null),
    [uiContext]
  );

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
    <div className="space-y-4">
      {workflowCopy && (
        <Collapsible
          open={workflowOpen}
          onOpenChange={setWorkflowOpen}
          className="rounded-lg border bg-card text-card-foreground shadow-xs print:hidden"
        >
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="w-full h-auto justify-between gap-2 px-4 py-3 font-normal hover:bg-muted/50 rounded-none rounded-t-lg"
            >
              <span className="text-sm font-semibold text-left text-foreground">{workflowCopy.title}</span>
              <ChevronDown
                className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', workflowOpen && 'rotate-180')}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-4 px-4 pb-4 pt-0 text-sm text-muted-foreground border-t">
              <div className="pt-4">
                <p className="font-medium text-foreground text-xs mb-1.5">{workflowCopy.whatItTracksHeading}</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {workflowCopy.whatItTracks.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground text-xs mb-1.5">{workflowCopy.coreFocusHeading}</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {workflowCopy.coreFocus.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground text-xs mb-1.5">{workflowCopy.workflowHeading}</p>
                <ol className="list-decimal pl-4 space-y-0.5">
                  {workflowCopy.workflow.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ol>
              </div>
              <p className="text-xs border-t pt-3 text-pretty leading-relaxed">{workflowCopy.quantityNote}</p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

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
              <p className="text-xs text-muted-foreground leading-relaxed">{chartsCopy.barSubtitle}</p>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockFlowData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-28} textAnchor="end" height={72} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="globalInStock" name="Global in stock" fill="hsl(173 58% 42%)" />
                  <Bar dataKey="siteOnsite" name="Site on hand" fill="hsl(var(--primary))" />
                  <Bar dataKey="siteAvailable" name="Site available" fill="hsl(199 89% 48%)" />
                  <Bar dataKey="siteReceivedCumulative" name="Received at site" fill="hsl(142 45% 42%)" />
                  <Bar dataKey="globalSentCumulative" name="Shipped from global" fill="hsl(var(--muted-foreground))" />
                  <Bar dataKey="globalReturnsCumulative" name="Returns" fill="hsl(38 92% 50%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="print:break-inside-avoid">
            <CardHeader>
              <CardTitle className="text-base">Mix by category</CardTitle>
              <p className="text-xs text-muted-foreground leading-relaxed">{chartsCopy.mixSubtitle}</p>
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
      )}
    </div>
  );
}
