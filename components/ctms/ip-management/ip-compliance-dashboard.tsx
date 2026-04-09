'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LabelList,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  IpCategory,
  IpInTransitLineRow,
  IpLogRow,
  IpLotBreakdownRow,
  IpStudyMetricRow,
} from '@/lib/types/ip-management';
import { IP_DISPOSITION_LABELS } from '@/lib/types/ip-management';
import type { IpInventoryUiContext } from '@/lib/utils/ip-inventory-ui-copy';

const BAR_CORNER_RADIUS: [number, number, number, number] = [5, 5, 0, 0];
const BAR_LABEL_FILL = 'var(--foreground)';
const COMPLIANCE_CHART_CAP = 15;

function formatBarValueLabel(value: unknown): string {
  if (typeof value === 'number' && value > 0) return String(value);
  return '';
}

function truncateLabel(s: string, max = 18): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export interface IpComplianceFlagRow {
  location_id: string;
  lot_id: string;
  item_id: string;
  flag_unverified_used: boolean;
  flag_quantity_mismatch: boolean;
}

export interface IpComplianceDashboardProps {
  metrics: IpStudyMetricRow[];
  logRows: IpLogRow[];
  flags: IpComplianceFlagRow[];
  breakdown: IpLotBreakdownRow[];
  inTransitLines: IpInTransitLineRow[];
  loading: boolean;
  categoryFilter: IpCategory;
  uiContext: IpInventoryUiContext;
}

export function IpComplianceDashboard({
  metrics,
  logRows,
  flags,
  breakdown,
  inTransitLines,
  loading,
  categoryFilter,
  uiContext,
}: IpComplianceDashboardProps) {
  const categoryItemIds = useMemo(() => new Set(metrics.map((m) => m.item_id)), [metrics]);

  const scopedFlags = useMemo(
    () => flags.filter((f) => categoryItemIds.has(f.item_id)),
    [flags, categoryItemIds]
  );

  const scopedTransit = useMemo(
    () => inTransitLines.filter((l) => categoryItemIds.has(l.item_id)),
    [inTransitLines, categoryItemIds]
  );

  const metricsByItemId = useMemo(() => {
    const m = new Map<string, IpStudyMetricRow>();
    for (const row of metrics) m.set(row.item_id, row);
    return m;
  }, [metrics]);

  const kpis = useMemo(() => {
    let noDispenseCompliance = 0;
    let withCompliancePct = 0;
    let below100WithUse = 0;
    for (const row of metrics) {
      if (row.compliance_pct == null) noDispenseCompliance += 1;
      else {
        withCompliancePct += 1;
        if (row.site_used > 0 && row.compliance_pct < 100) below100WithUse += 1;
      }
    }
    const unverifiedFlagCount = scopedFlags.filter((f) => f.flag_unverified_used).length;
    const mismatchFlagCount = scopedFlags.filter((f) => f.flag_quantity_mismatch).length;
    const inTransitUnits = scopedTransit.reduce((s, l) => s + l.qty_in_transit, 0);
    return {
      noDispenseCompliance,
      withCompliancePct,
      below100WithUse,
      unverifiedFlagCount,
      mismatchFlagCount,
      inTransitUnits,
    };
  }, [metrics, scopedFlags, scopedTransit]);

  const complianceBarData = useMemo(() => {
    const rows = metrics
      .filter((m) => m.compliance_pct != null)
      .map((m) => ({
        itemId: m.item_id,
        name: truncateLabel(m.item_name, 20),
        fullName: m.item_name,
        pct: Math.round(Number(m.compliance_pct)),
      }))
      .sort((a, b) => a.pct - b.pct);
    return rows;
  }, [metrics]);

  const complianceChartData = useMemo(
    () => complianceBarData.slice(0, COMPLIANCE_CHART_CAP),
    [complianceBarData]
  );

  const siteVerificationData = useMemo(() => {
    const bySite = new Map<
      string,
      { key: string; label: string; verified: number; unverified: number }
    >();
    for (const row of logRows) {
      if (row.disposition !== 'used') continue;
      const label =
        row.site_number && row.site_name
          ? `${row.site_number} — ${row.site_name}`
          : row.site_name ?? row.site_number ?? 'Site';
      const key = row.study_site_id;
      if (!bySite.has(key)) {
        bySite.set(key, { key, label, verified: 0, unverified: 0 });
      }
      const bucket = bySite.get(key)!;
      if (row.verified_at != null) bucket.verified += 1;
      else bucket.unverified += 1;
    }
    return Array.from(bySite.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [logRows]);

  const drugContainerGap = useMemo(() => {
    if (categoryFilter !== 'investigational_drug' && uiContext !== 'ip_drug') return null;
    let missing = 0;
    for (const row of logRows) {
      if (row.disposition !== 'used') continue;
      if (row.dispensed_at == null) continue;
      const fill = row.dispensed_container_fill_state?.trim();
      if (!fill) missing += 1;
    }
    return missing;
  }, [logRows, categoryFilter, uiContext]);

  const exceptionRows = useMemo(() => {
    const out: Array<{
      key: string;
      itemName: string;
      lotLabel: string;
      siteLabel: string;
      issues: string[];
    }> = [];
    for (const f of scopedFlags) {
      if (!f.flag_unverified_used && !f.flag_quantity_mismatch) continue;
      const metric = metricsByItemId.get(f.item_id);
      const log = logRows.find((r) => r.location_id === f.location_id);
      const bd = breakdown.find((b) => b.lot_id === f.lot_id && b.study_site_id === log?.study_site_id);
      const lotLabel =
        [log?.lot_number, log?.serial_number, log?.batch_number].filter(Boolean).join(' · ') ||
        [bd?.lot_number, bd?.serial_number, bd?.batch_number].filter(Boolean).join(' · ') ||
        '—';
      const siteLabel =
        log?.site_number && log?.site_name
          ? `${log.site_number} — ${log.site_name}`
          : log?.site_name ?? '—';
      const issues: string[] = [];
      if (f.flag_unverified_used) issues.push('Used without verification');
      if (f.flag_quantity_mismatch) issues.push('Quantity mismatch');
      out.push({
        key: f.location_id,
        itemName: metric?.item_name ?? log?.item_name ?? '—',
        lotLabel,
        siteLabel,
        issues,
      });
    }
    return out;
  }, [scopedFlags, metricsByItemId, logRows, breakdown]);

  const attentionItems = useMemo(() => {
    return metrics.filter((m) => {
      const complianceGap =
        m.compliance_pct != null && m.site_used > 0 && m.compliance_pct < 100;
      const totalOnHand = m.global_in_stock + m.site_onsite;
      const stockGap =
        m.min_stock_threshold != null && totalOnHand < m.min_stock_threshold;
      return complianceGap || stockGap;
    });
  }, [metrics]);

  if (loading) {
    return (
      <div className="space-y-4 print:hidden">
        <p className="text-sm text-muted-foreground">Loading compliance data…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="print:block hidden border-b pb-3 mb-4">
        <h2 className="text-lg font-semibold">Compliance and oversight</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Compliance percentages come from study inventory metrics (same values as the inventory summary).
        </p>
      </div>

      <p className="text-muted-foreground text-sm print:hidden">
        Compliance percentages match the inventory summary: they reflect verified versus dispensed activity for
        each catalog item. Rows below use the same study, site, category, and search filters as the rest of this
        page. Reconciliation flags are limited to items in the current category.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
        <Card className="print:break-inside-avoid">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Catalog items</CardTitle>
            <CardDescription className="text-xs">
              With a compliance % vs no dispense-based % yet
            </CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {kpis.withCompliancePct} with % · {kpis.noDispenseCompliance} no %
          </CardContent>
        </Card>
        <Card className="print:break-inside-avoid">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Below full compliance</CardTitle>
            <CardDescription className="text-xs">Under 100% where site has used units</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
            {kpis.below100WithUse}
          </CardContent>
        </Card>
        <Card className="print:break-inside-avoid">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Open reconciliation flags</CardTitle>
            <CardDescription className="text-xs">In this category (current filters)</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>
              <span className="font-medium text-foreground">{kpis.unverifiedFlagCount}</span>{' '}
              {IP_DISPOSITION_LABELS.used.toLowerCase()} without verification
            </p>
            <p>
              <span className="font-medium text-foreground">{kpis.mismatchFlagCount}</span> quantity mismatch
            </p>
          </CardContent>
        </Card>
        <Card className="print:break-inside-avoid sm:col-span-2 lg:col-span-1">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">In transit (units)</CardTitle>
            <CardDescription className="text-xs">Shipped from central, not yet received — this category</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">{kpis.inTransitUnits}</CardContent>
        </Card>
      </div>

      {drugContainerGap != null && drugContainerGap > 0 && (
        <Card className="border-primary/30 print:break-inside-avoid">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Container accountability (investigational drug)</CardTitle>
            <CardDescription className="text-xs">
              Site lines marked used with a dispense time but no container condition recorded
            </CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
            {drugContainerGap}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2 print:grid-cols-1">
        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-base">Compliance % by catalog item</CardTitle>
            <CardDescription className="text-xs">
              Lowest first (chart shows up to {COMPLIANCE_CHART_CAP} items). Full list in the table below.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {complianceChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items with a compliance percentage for this view.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complianceChartData} margin={{ top: 16, right: 8, left: 0, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} tickMargin={8} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={32} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="pct" name="Compliance %" fill="var(--chart-2)" radius={BAR_CORNER_RADIUS}>
                    <LabelList
                      dataKey="pct"
                      position="top"
                      fontSize={9}
                      fill={BAR_LABEL_FILL}
                      formatter={(v: unknown) => (typeof v === 'number' ? `${v}%` : '')}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="print:break-inside-avoid">
          <CardHeader>
            <CardTitle className="text-base">Used lines: verified vs not verified (by site)</CardTitle>
            <CardDescription className="text-xs">
              Count of log rows with disposition “{IP_DISPOSITION_LABELS.used}” in this view
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {siteVerificationData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No used lines for this view.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={siteVerificationData} margin={{ top: 16, right: 8, left: 0, bottom: 56 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} tickMargin={8} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={36} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="verified" name="Verified" stackId="a" fill="hsl(142 45% 42%)" radius={[0, 0, 0, 0]}>
                    <LabelList
                      dataKey="verified"
                      position="top"
                      fontSize={9}
                      fill={BAR_LABEL_FILL}
                      formatter={formatBarValueLabel}
                    />
                  </Bar>
                  <Bar
                    dataKey="unverified"
                    name="Not verified"
                    stackId="a"
                    fill="hsl(38 92% 50%)"
                    radius={BAR_CORNER_RADIUS}
                  >
                    <LabelList
                      dataKey="unverified"
                      position="top"
                      fontSize={9}
                      fill={BAR_LABEL_FILL}
                      formatter={formatBarValueLabel}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="print:break-inside-avoid">
        <CardHeader>
          <CardTitle className="text-base">All items with a compliance % (sorted lowest first)</CardTitle>
        </CardHeader>
        <CardContent>
          {complianceBarData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No compliance percentages in this view.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Compliance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complianceBarData.map((row) => (
                  <TableRow key={row.itemId}>
                    <TableCell className="font-medium">{row.fullName}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.pct}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="print:break-inside-avoid">
        <CardHeader>
          <CardTitle className="text-base">Reconciliation exceptions</CardTitle>
          <CardDescription className="text-xs">Flagged lot locations in this category</CardDescription>
        </CardHeader>
        <CardContent>
          {exceptionRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No flagged rows for this view.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Lot / serial</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Issue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exceptionRows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">{row.itemName}</TableCell>
                    <TableCell className="text-muted-foreground">{row.lotLabel}</TableCell>
                    <TableCell>{row.siteLabel}</TableCell>
                    <TableCell>{row.issues.join('; ')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="print:break-inside-avoid">
        <CardHeader>
          <CardTitle className="text-base">Items needing attention</CardTitle>
          <CardDescription className="text-xs">
            Below 100% compliance where the site has used units, or total on hand below minimum stock threshold
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attentionItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">None for this view.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Compliance</TableHead>
                  <TableHead className="text-right">Used at site</TableHead>
                  <TableHead className="text-right">Total on hand</TableHead>
                  <TableHead className="text-right">Minimum stock</TableHead>
                  <TableHead>Why it needs attention</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attentionItems.map((m) => {
                  const total = m.global_in_stock + m.site_onsite;
                  const complianceGap =
                    m.compliance_pct != null && m.site_used > 0 && m.compliance_pct < 100;
                  const stockGap =
                    m.min_stock_threshold != null && total < m.min_stock_threshold;
                  const why = [
                    complianceGap ? 'Compliance under 100%' : null,
                    stockGap ? 'Below minimum stock' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <TableRow key={m.item_id}>
                      <TableCell className="font-medium">{m.item_name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.compliance_pct != null ? `${Math.round(m.compliance_pct)}%` : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{m.site_used}</TableCell>
                      <TableCell className="text-right tabular-nums">{total}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {m.min_stock_threshold ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-amber-800 dark:text-amber-300">{why}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
