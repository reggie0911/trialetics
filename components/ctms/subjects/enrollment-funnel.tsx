'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EnrollmentFunnelData } from '@/lib/types/ctms';

interface EnrollmentFunnelProps {
  data: EnrollmentFunnelData;
}

const stages: {
  key: keyof Omit<EnrollmentFunnelData, 'total'>;
  label: string;
  color: string;
}[] = [
  { key: 'preScreening', label: 'Pre-Screening', color: 'bg-slate-400' },
  { key: 'screening', label: 'Screening', color: 'bg-blue-400' },
  { key: 'screenFailed', label: 'Screen Failed', color: 'bg-red-400' },
  { key: 'randomized', label: 'Randomized', color: 'bg-indigo-400' },
  { key: 'active', label: 'Active', color: 'bg-emerald-500' },
  { key: 'completed', label: 'Completed', color: 'bg-green-600' },
  { key: 'withdrawn', label: 'Withdrawn', color: 'bg-orange-400' },
  { key: 'discontinued', label: 'Discontinued', color: 'bg-rose-500' },
];

export function EnrollmentFunnel({ data }: EnrollmentFunnelProps) {
  const max = Math.max(...stages.map((s) => data[s.key]), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          Enrollment Funnel
          <span className="ml-2 text-muted-foreground font-normal">
            ({data.total} total)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {stages.map((stage) => {
            const count = data[stage.key];
            const pct = max > 0 ? (count / max) * 100 : 0;
            return (
              <div key={stage.key} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-28 text-right shrink-0">
                  {stage.label}
                </span>
                <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                  <div
                    className={`h-full ${stage.color} rounded-sm transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-8 text-right shrink-0">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
