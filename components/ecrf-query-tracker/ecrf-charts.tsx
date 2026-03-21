"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
} from "recharts";

const CHART_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#14b8a6",
];

/** Theme foreground for SVG (oklch — do not wrap in hsl()) */
const FG = "var(--foreground)";

/**
 * Override ChartContainer defaults so ticks/labels stay readable in dark mode.
 * Custom tick <text> uses fill={FG}; these rules cover tspans, numeric axes, pie labels, LabelList.
 */
const ecrfChartSurfaceClass =
  "[&_.recharts-cartesian-axis-tick_text]:!fill-foreground [&_.recharts-cartesian-axis-tick_tspan]:!fill-foreground " +
  "[&_.recharts-cartesian-axis-label_text]:!fill-foreground [&_.recharts-cartesian-axis-label_tspan]:!fill-foreground " +
  "[&_.recharts-label-list_text]:!fill-foreground [&_.recharts-label-list_tspan]:!fill-foreground " +
  "[&_.recharts-pie-labels_text]:!fill-foreground [&_.recharts-pie-labels_tspan]:!fill-foreground " +
  "[&_.recharts-layer.recharts-cartesian-axis-tick_text]:!fill-foreground";

/** Word-wrap for SVG multi-line ticks / labels */
function wrapToLines(text: string, maxChars: number): string[] {
  const t = String(text).trim();
  if (!t) return [""];
  if (t.length <= maxChars) return [t];
  const words = t.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      if (w.length > maxChars) {
        lines.push(`${w.slice(0, maxChars - 1)}…`);
        cur = "";
      } else {
        cur = w;
      }
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [t];
}

function maxWrappedLineCount(strings: string[], charsPerLine: number) {
  if (strings.length === 0) return 1;
  return Math.max(1, ...strings.map((s) => wrapToLines(s, charsPerLine).length));
}

function yAxisWidthForWrappedStrings(strings: string[], charsPerLine: number) {
  if (strings.length === 0) return 200;
  const linesPerLabel = strings.map((s) => wrapToLines(String(s ?? ""), charsPerLine));
  const longestLine = Math.max(
    1,
    ...linesPerLabel.flat().map((line) => Math.min(line.length, charsPerLine))
  );
  return Math.min(520, Math.max(180, Math.round(longestLine * 6.6 + 48)));
}

function horizontalBarChartHeight(
  barCount: number,
  strings: string[],
  charsPerLine: number
) {
  const maxLines = maxWrappedLineCount(strings, charsPerLine);
  const rowH = 16 + maxLines * 12;
  return Math.min(640, Math.max(280, barCount * rowH + 72));
}

const horizontalChartContainerTickClass = `${ecrfChartSurfaceClass} [&_.recharts-cartesian-axis-tick_text]:font-semibold`;

const X_WRAP = 18;
const Y_WRAP = 22;
const LINE_H_X = 10;
const LINE_H_Y = 11;

/** Stacked labels under vertical bar charts (no rotation) */
function XAxisTickMultiline(props: Record<string, unknown>) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const payload = props.payload as { value?: string };
  const lines = wrapToLines(String(payload?.value ?? ""), X_WRAP);
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        textAnchor="middle"
        fill={FG}
        fontSize={10}
        fontWeight={500}
      >
        {lines.map((line, i) => (
          <tspan key={i} x={0} dy={i === 0 ? 4 : LINE_H_X}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

/** End-anchored stacked labels for horizontal bar Y-axis */
function YAxisTickMultiline(props: Record<string, unknown>) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const payload = props.payload as { value?: string };
  const lines = wrapToLines(String(payload?.value ?? ""), Y_WRAP);
  const startDy = -((lines.length - 1) * LINE_H_Y) / 2;
  return (
    <text
      x={x}
      y={y}
      textAnchor="end"
      fill={FG}
      fontSize={10}
      fontWeight={600}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? startDy : LINE_H_Y}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function PieLabelWrapped(props: Record<string, unknown>) {
  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const midAngle = Number(props.midAngle ?? 0);
  const outerRadius = Number(props.outerRadius ?? 0);
  const p = props as { state?: string; name?: string; count?: number; value?: number };
  const label = String(p.state ?? p.name ?? "");
  const count = Number(p.count ?? p.value ?? 0);
  const RADIAN = Math.PI / 180;
  const x = cx + (outerRadius + 12) * Math.cos(-midAngle * RADIAN);
  const y = cy + (outerRadius + 12) * Math.sin(-midAngle * RADIAN);
  const anchor = x > cx ? "start" : "end";
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="middle"
      fill={FG}
      style={{ fontSize: 10, fontWeight: 500 }}
      className="tabular-nums"
    >
      {`${label}: ${count.toLocaleString()}`}
    </text>
  );
}

interface ECRFChartsProps {
  chartData: {
    agingDistribution: Array<{ label: string; count: number; color: string }>;
    queriesByRole: Array<{ role: string; count: number }>;
    queriesBySite: Array<{ site: string; count: number }>;
    queriesByType: Array<{ type: string; count: number }>;
    queriesByState: Array<{ state: string; count: number; fill: string }>;
    queriesByForm: Array<{ form: string; count: number }>;
    resolutionTimeBySite: Array<{ site: string; avgDays: number }>;
  };
  filters: {
    siteName: string;
    queryType: string;
    queryState: string;
    formName: string;
    queryRaisedByRole: string;
  };
  onFilterChange: (filterName: string, value: string) => void;
}

export function ECRFCharts({ chartData, filters, onFilterChange }: ECRFChartsProps) {
  const chartConfig = {
    count: { label: "Count", color: CHART_COLORS[0] },
    avgDays: { label: "Average Days", color: CHART_COLORS[1] },
  };

  const queriesBySiteLayout = useMemo(
    () => ({
      yWidth: yAxisWidthForWrappedStrings(
        chartData.queriesBySite.map((s) => s.site),
        Y_WRAP
      ),
      height: horizontalBarChartHeight(
        chartData.queriesBySite.length,
        chartData.queriesBySite.map((s) => s.site),
        Y_WRAP
      ),
    }),
    [chartData.queriesBySite]
  );

  const resolutionBySiteLayout = useMemo(
    () => ({
      yWidth: yAxisWidthForWrappedStrings(
        chartData.resolutionTimeBySite.map((s) => s.site),
        Y_WRAP
      ),
      height: horizontalBarChartHeight(
        chartData.resolutionTimeBySite.length,
        chartData.resolutionTimeBySite.map((s) => s.site),
        Y_WRAP
      ),
    }),
    [chartData.resolutionTimeBySite]
  );

  const queriesByFormLayout = useMemo(
    () => ({
      yWidth: yAxisWidthForWrappedStrings(
        chartData.queriesByForm.map((f) => f.form),
        Y_WRAP
      ),
      height: horizontalBarChartHeight(
        chartData.queriesByForm.length,
        chartData.queriesByForm.map((f) => f.form),
        Y_WRAP
      ),
    }),
    [chartData.queriesByForm]
  );

  const agingBottomMargin = useMemo(() => {
    const maxL = maxWrappedLineCount(
      chartData.agingDistribution.map((d) => d.label),
      X_WRAP
    );
    return 28 + maxL * LINE_H_X + 16;
  }, [chartData.agingDistribution]);

  const roleBottomMargin = useMemo(() => {
    const maxL = maxWrappedLineCount(
      chartData.queriesByRole.map((d) => d.role),
      X_WRAP
    );
    return 28 + maxL * LINE_H_X + 16;
  }, [chartData.queriesByRole]);

  const typeBottomMargin = useMemo(() => {
    const maxL = maxWrappedLineCount(
      chartData.queriesByType.map((d) => d.type),
      X_WRAP
    );
    return 28 + maxL * LINE_H_X + 16;
  }, [chartData.queriesByType]);

  const hasData =
    chartData.agingDistribution.length > 0 ||
    chartData.queriesByRole.length > 0 ||
    chartData.queriesBySite.length > 0;

  if (!hasData) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Query Aging Histogram */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Query Aging (Days Open)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={chartConfig}
            className={cn("w-full", ecrfChartSurfaceClass)}
            style={{ height: Math.max(260, 200 + agingBottomMargin) }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData.agingDistribution}
                margin={{ top: 24, right: 16, left: 8, bottom: agingBottomMargin }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={<XAxisTickMultiline />}
                  height={agingBottomMargin - 8}
                  tickMargin={6}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 10, fill: FG }} width={44} />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "color-mix(in oklch, var(--foreground) 8%, transparent)" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} cursor="pointer">
                  {chartData.agingDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: FG }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Queries by Role */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Queries Raised by Role</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={chartConfig}
            className={cn("w-full", ecrfChartSurfaceClass)}
            style={{ height: Math.max(280, 200 + roleBottomMargin) }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData.queriesByRole}
                margin={{ top: 24, right: 16, left: 8, bottom: roleBottomMargin }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="role"
                  tick={<XAxisTickMultiline />}
                  height={roleBottomMargin - 8}
                  tickMargin={6}
                  interval={0}
                />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "color-mix(in oklch, var(--foreground) 8%, transparent)" }} />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  onClick={(data: any) => {
                    const role = data?.role ?? "";
                    onFilterChange(
                      "queryRaisedByRole",
                      role === filters.queryRaisedByRole ? "" : role
                    );
                  }}
                  cursor="pointer"
                >
                  {chartData.queriesByRole.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[0]}
                      opacity={
                        filters.queryRaisedByRole && entry.role !== filters.queryRaisedByRole
                          ? 0.3
                          : 1
                      }
                    />
                  ))}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: FG }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Queries by Site */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Queries per Site (Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={chartConfig}
            className={`aspect-auto w-full min-h-[280px] ${horizontalChartContainerTickClass}`}
            style={{ height: queriesBySiteLayout.height }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData.queriesBySite}
                layout="vertical"
                barCategoryGap={14}
                margin={{ top: 12, right: 44, left: 20, bottom: 28 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: FG }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="site"
                  width={queriesBySiteLayout.yWidth}
                  reversed
                  tick={(tp) => <YAxisTickMultiline {...tp} />}
                  interval={0}
                />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "color-mix(in oklch, var(--foreground) 8%, transparent)" }} />
                <Bar
                  dataKey="count"
                  radius={[0, 4, 4, 0]}
                  onClick={(data: any) => {
                    const site = data?.site ?? "";
                    onFilterChange("siteName", site === filters.siteName ? "" : site);
                  }}
                  cursor="pointer"
                >
                  {chartData.queriesBySite.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[5]}
                      opacity={filters.siteName && entry.site !== filters.siteName ? 0.3 : 1}
                    />
                  ))}
                  <LabelList dataKey="count" position="right" style={{ fontSize: 10, fill: FG }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Queries by State (Pie Chart) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Queries by State</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className={cn("h-[280px] w-full", ecrfChartSurfaceClass)}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 16, right: 16, left: 16, bottom: 16 }}>
                <Pie
                  data={chartData.queriesByState}
                  dataKey="count"
                  nameKey="state"
                  cx="50%"
                  cy="50%"
                  outerRadius={72}
                  label={(p: any) => <PieLabelWrapped {...p} />}
                  labelLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                  onClick={(data: any) => {
                    const st = data?.state ?? "";
                    onFilterChange("queryState", st === filters.queryState ? "" : st);
                  }}
                  cursor="pointer"
                >
                  {chartData.queriesByState.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.fill}
                      opacity={filters.queryState && entry.state !== filters.queryState ? 0.3 : 1}
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Queries by Type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Queries by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={chartConfig}
            className="w-full [&_.recharts-cartesian-axis-tick_text]:!fill-foreground"
            style={{ height: Math.max(300, 220 + typeBottomMargin) }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData.queriesByType}
                margin={{ top: 24, right: 16, left: 8, bottom: typeBottomMargin }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="type"
                  tick={<XAxisTickMultiline />}
                  height={typeBottomMargin - 8}
                  tickMargin={6}
                  interval={0}
                />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "color-mix(in oklch, var(--foreground) 8%, transparent)" }} />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  onClick={(data: any) => {
                    const ty = data?.type ?? "";
                    onFilterChange("queryType", ty === filters.queryType ? "" : ty);
                  }}
                  cursor="pointer"
                >
                  {chartData.queriesByType.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[2]}
                      opacity={filters.queryType && entry.type !== filters.queryType ? 0.3 : 1}
                    />
                  ))}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: FG }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Average Resolution Time by Site */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Average Resolution Time by Site (Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={chartConfig}
            className={cn("aspect-auto w-full min-h-[280px]", horizontalChartContainerTickClass)}
            style={{ height: resolutionBySiteLayout.height }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData.resolutionTimeBySite}
                layout="vertical"
                barCategoryGap={14}
                margin={{ top: 12, right: 44, left: 20, bottom: 36 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: FG }}
                  label={{
                    value: "Days",
                    position: "insideBottom",
                    offset: -2,
                    fontSize: 10,
                    fill: FG,
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="site"
                  width={resolutionBySiteLayout.yWidth}
                  reversed
                  tick={(tp) => <YAxisTickMultiline {...tp} />}
                  interval={0}
                />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "color-mix(in oklch, var(--foreground) 8%, transparent)" }} />
                <Bar
                  dataKey="avgDays"
                  radius={[0, 4, 4, 0]}
                  onClick={(data: any) => {
                    const site = data?.site ?? "";
                    onFilterChange("siteName", site === filters.siteName ? "" : site);
                  }}
                  cursor="pointer"
                >
                  {chartData.resolutionTimeBySite.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[7]}
                      opacity={filters.siteName && entry.site !== filters.siteName ? 0.3 : 1}
                    />
                  ))}
                  <LabelList dataKey="avgDays" position="right" style={{ fontSize: 10, fill: FG }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Queries by Form */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Queries by Form (Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={chartConfig}
            className={`aspect-auto w-full min-h-[300px] ${horizontalChartContainerTickClass}`}
            style={{ height: queriesByFormLayout.height }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData.queriesByForm}
                layout="vertical"
                barCategoryGap={14}
                margin={{ top: 12, right: 48, left: 20, bottom: 28 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: FG }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="form"
                  width={queriesByFormLayout.yWidth}
                  reversed
                  tick={(tp) => <YAxisTickMultiline {...tp} />}
                  interval={0}
                />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "color-mix(in oklch, var(--foreground) 8%, transparent)" }} />
                <Bar
                  dataKey="count"
                  radius={[0, 4, 4, 0]}
                  onClick={(data: any) => {
                    const form = data?.form ?? "";
                    onFilterChange("formName", form === filters.formName ? "" : form);
                  }}
                  cursor="pointer"
                >
                  {chartData.queriesByForm.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[1]}
                      opacity={filters.formName && entry.form !== filters.formName ? 0.3 : 1}
                    />
                  ))}
                  <LabelList dataKey="count" position="right" style={{ fontSize: 10, fill: FG }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
