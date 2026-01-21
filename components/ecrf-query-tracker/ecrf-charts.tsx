"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer, 
  LabelList,
  Legend 
} from "recharts";

// Complementary color palette
const CHART_COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#14b8a6", // Teal
];

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

  const hasData = chartData.agingDistribution.length > 0 || 
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
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.agingDistribution} margin={{ top: 20, right: 20, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} cursor="pointer">
                  {chartData.agingDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 11 }} />
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
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.queriesByRole} margin={{ top: 20, right: 20, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="role" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                <Bar 
                  dataKey="count" 
                  radius={[4, 4, 0, 0]}
                  onClick={(data) => {
                    console.log('[Chart Click] Role:', data.role, 'Current filter:', filters.queryRaisedByRole);
                    onFilterChange('queryRaisedByRole', data.role === filters.queryRaisedByRole ? '' : data.role);
                  }}
                  cursor="pointer"
                >
                  {chartData.queriesByRole.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={CHART_COLORS[0]}
                      opacity={filters.queryRaisedByRole && entry.role !== filters.queryRaisedByRole ? 0.3 : 1}
                    />
                  ))}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 11 }} />
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
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.queriesBySite} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="site" tick={{ fontSize: 11 }} width={90} />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                <Bar 
                  dataKey="count" 
                  radius={[0, 4, 4, 0]}
                  onClick={(data) => {
                    onFilterChange('siteName', data.site === filters.siteName ? '' : data.site);
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
                  <LabelList dataKey="count" position="right" style={{ fontSize: 11 }} />
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
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <Pie
                  data={chartData.queriesByState}
                  dataKey="count"
                  nameKey="state"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ state, count }) => `${state}: ${count}`}
                  labelLine={{ style: { fontSize: 10 } }}
                  onClick={(data) => {
                    onFilterChange('queryState', data.state === filters.queryState ? '' : data.state);
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
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.queriesByType} margin={{ top: 20, right: 20, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="type" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                <Bar 
                  dataKey="count" 
                  radius={[4, 4, 0, 0]}
                  onClick={(data) => {
                    onFilterChange('queryType', data.type === filters.queryType ? '' : data.type);
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
                  <LabelList dataKey="count" position="top" style={{ fontSize: 11 }} />
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
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.resolutionTimeBySite} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} label={{ value: "Days", position: "insideBottom", offset: -5, fontSize: 11 }} />
                <YAxis type="category" dataKey="site" tick={{ fontSize: 11 }} width={90} />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                <Bar 
                  dataKey="avgDays" 
                  radius={[0, 4, 4, 0]}
                  onClick={(data) => {
                    onFilterChange('siteName', data.site === filters.siteName ? '' : data.site);
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
                  <LabelList dataKey="avgDays" position="right" style={{ fontSize: 11 }} />
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
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.queriesByForm} margin={{ top: 20, right: 20, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="form" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                <Bar 
                  dataKey="count" 
                  radius={[4, 4, 0, 0]}
                  onClick={(data) => {
                    onFilterChange('formName', data.form === filters.formName ? '' : data.form);
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
                  <LabelList dataKey="count" position="top" style={{ fontSize: 11 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
