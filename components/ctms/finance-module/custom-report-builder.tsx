'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CustomReportBuilder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Custom Report Builder</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          Build a custom report by selecting study data sources, filters, and grouping. The builder
          will be enabled when scheduled reports go live.
        </p>
      </CardContent>
    </Card>
  );
}
