'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { IpDispositionTotalRow } from '@/lib/types/ip-management';
import { IP_DISPOSITION_LABELS, type IpDisposition } from '@/lib/types/ip-management';

interface IpLogsChartsProps {
  dispositionTotals: IpDispositionTotalRow[];
  compliancePct: number | null;
}

export function IpLogsCharts({ dispositionTotals, compliancePct }: IpLogsChartsProps) {
  const agg: Record<string, number> = {};
  for (const r of dispositionTotals) {
    agg[r.disposition] = (agg[r.disposition] ?? 0) + r.total_qty;
  }
  const barData = Object.entries(agg).map(([k, value]) => ({
    name: IP_DISPOSITION_LABELS[k as IpDisposition] ?? k,
    value,
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2 print:grid-cols-1">
      <Card className="print:break-inside-avoid">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Disposition quantities (site inventory)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Totals match the disposition summary widget (database view of site lot locations).
          </p>
        </CardHeader>
        <CardContent className="h-[220px]">
          {barData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No site rows yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Quantity" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="print:break-inside-avoid">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Compliance rate</CardTitle>
          <p className="text-xs text-muted-foreground">
            Same formula as study metrics: verified ledger events divided by dispensed ledger events (×100).
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <span className="text-4xl font-semibold tabular-nums">
              {compliancePct != null && Number.isFinite(compliancePct)
                ? `${compliancePct.toFixed(1)}%`
                : '—'}
            </span>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-xs">
              Appears when at least one dispense exists in the ledger for the current filters.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
