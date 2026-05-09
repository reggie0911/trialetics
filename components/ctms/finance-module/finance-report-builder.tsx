'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function FinanceReportBuilder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Run Report</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          Select a report from the library to render a study-scoped preview here. Run, export, and
          schedule controls will appear once a report is selected.
        </p>
      </CardContent>
    </Card>
  );
}
