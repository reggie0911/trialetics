'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { PsdvChartData } from '@/lib/actions/psdv';

interface PsdvChartsProps {
  chartData: PsdvChartData | null;
}

export function PsdvCharts({ chartData }: PsdvChartsProps) {
  if (!chartData) return null;

  const chartConfig = {
    value: { label: 'Count', color: 'var(--chart-1)' },
    count: { label: 'Count', color: 'var(--chart-1)' },
  };

  const hasOverview = chartData.overviewPie.length > 0;
  const hasSdvPolicy = chartData.sdvPolicyBySite.some((d) => d.count > 0);
  const hasCrfStatus = chartData.crfVerificationStatus.some((d) => d.count > 0);

  if (!hasOverview && !hasSdvPolicy && !hasCrfStatus) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {hasOverview && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium">PSDV Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={chartData.overviewPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {chartData.overviewPie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {hasSdvPolicy && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium">SDV Policy by Site</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart
                data={chartData.sdvPolicyBySite}
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="policy" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="var(--chart-2)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {hasCrfStatus && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium">CRF Verification Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={chartData.crfVerificationStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  label={({ status, count }) => `${status}: ${count}`}
                >
                  {chartData.crfVerificationStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
