'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Activity {
  id: string;
  name: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  status: string;
}

interface GanttChartProps {
  activities: Activity[];
}

const STATUS_COLORS: Record<string, string> = {
  not_started: '#94a3b8',
  in_progress: '#f59e0b',
  completed: '#22c55e',
  on_hold: '#ef4444',
  cancelled: '#6b7280',
};

export function ActivityGanttChart({ activities }: GanttChartProps) {
  const { dateRange, barData } = useMemo(() => {
    const withDates = activities.filter(a => a.planned_start_date && a.planned_end_date);
    if (withDates.length === 0) return { dateRange: { min: new Date(), max: new Date(), totalDays: 1 }, barData: [] };

    const allDates = withDates.flatMap(a => [
      new Date(a.planned_start_date!),
      new Date(a.planned_end_date!),
    ]);
    const min = new Date(Math.min(...allDates.map(d => d.getTime())));
    const max = new Date(Math.max(...allDates.map(d => d.getTime())));
    const totalDays = Math.max(1, Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)));

    const bars = withDates.map(a => {
      const start = new Date(a.planned_start_date!);
      const end = new Date(a.planned_end_date!);
      const offsetPct = ((start.getTime() - min.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
      const widthPct = Math.max(1, ((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100);
      return { ...a, offsetPct, widthPct };
    });

    return { dateRange: { min, max, totalDays }, barData: bars };
  }, [activities]);

  if (barData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No activities with planned dates to display on Gantt chart.
        </CardContent>
      </Card>
    );
  }

  const months: { label: string; offsetPct: number }[] = [];
  const cursor = new Date(dateRange.min);
  cursor.setDate(1);
  while (cursor <= dateRange.max) {
    const offsetDays = Math.max(0, (cursor.getTime() - dateRange.min.getTime()) / (1000 * 60 * 60 * 24));
    months.push({
      label: cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      offsetPct: (offsetDays / dateRange.totalDays) * 100,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="flex border-b mb-2 text-xs text-muted-foreground h-6 relative">
            {months.map((m, i) => (
              <div key={i} className="absolute top-0" style={{ left: `${Math.min(m.offsetPct, 95)}%` }}>
                {m.label}
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {barData.map((bar) => (
              <div key={bar.id} className="flex items-center gap-2 h-7">
                <div className="w-40 truncate text-xs font-medium flex-shrink-0">{bar.name}</div>
                <div className="relative flex-1 h-5 bg-gray-50 rounded">
                  <div
                    className="absolute h-full rounded"
                    style={{
                      left: `${bar.offsetPct}%`,
                      width: `${bar.widthPct}%`,
                      backgroundColor: STATUS_COLORS[bar.status] || STATUS_COLORS.not_started,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
