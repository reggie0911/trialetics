'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { TripReportSummary } from '@/lib/types/trip-reports';

interface TripReportSummaryChartsProps {
  summary: TripReportSummary;
}

export function TripReportSummaryCharts({ summary }: TripReportSummaryChartsProps) {
  const chartData = [
    { name: 'Checklists', completed: summary.checklists_completed, total: summary.checklists_total, fill: 'var(--chart-1)' },
    { name: 'Action Items', completed: summary.follow_ups_completed, total: summary.follow_ups_total, fill: 'var(--chart-2)' },
    { name: 'CRF Tracking', completed: summary.crf_completed, total: summary.crf_total, fill: 'var(--chart-3)' },
  ];

  const chartConfig = {
    completed: { label: 'Completed', color: 'var(--chart-1)' },
    total: { label: 'Total', color: 'var(--chart-2)' },
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium">Checklists</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.checklists_completed}/{summary.checklists_total}
          </div>
          <p className="text-xs text-muted-foreground">Completed</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium">Action Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.follow_ups_completed}/{summary.follow_ups_total}
          </div>
          <p className="text-xs text-muted-foreground">Completed</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium">CRF Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.crf_completed}/{summary.crf_total}
          </div>
          <p className="text-xs text-muted-foreground">Source Verified</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium">Attendees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.attendees_count}</div>
          <p className="text-xs text-muted-foreground">Site personnel met</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium">Completion Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
              <Bar dataKey="completed" radius={[4, 4, 0, 0]} fill="var(--chart-1)" />
              <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="var(--chart-2)" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
