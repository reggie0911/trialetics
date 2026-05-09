'use client';

import { Star } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FinanceReportSummary } from '@/lib/actions/study-finance-module';

interface ReportsFavoriteListProps {
  rows: FinanceReportSummary[];
}

export function ReportsFavoriteList({ rows }: ReportsFavoriteListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Favorite Reports</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Star a report from Popular Reports to add it here for quick access.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center gap-2 text-xs">
                <Star className="size-3.5 fill-amber-400 text-amber-500" />
                <span className="truncate">{row.name}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
