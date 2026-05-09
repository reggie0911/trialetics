'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FinanceReportsData } from '@/lib/actions/study-finance-module';

interface ReportsRecentListProps {
  rows: FinanceReportsData['recentRuns'];
}

export function ReportsRecentList({ rows }: ReportsRecentListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent Reports</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No reports run yet. Run a report to populate this list.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between border-b border-border last:border-0 pb-1.5 last:pb-0"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-medium">{row.reportName}</span>
                  <span className="text-[11px] text-muted-foreground">{row.ranAt}</span>
                </div>
                <Badge variant="secondary">{row.format}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
