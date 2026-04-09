'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalyticsKpis } from '@/lib/utils/ip-analytics-metrics';
import { cn } from '@/lib/utils';

interface IpAnalyticsKpiCardsProps {
  kpis: AnalyticsKpis;
}

function rateColor(rate: number): string {
  if (rate >= 90) return 'text-emerald-700 dark:text-emerald-400';
  if (rate >= 50) return 'text-amber-700 dark:text-amber-400';
  return 'text-red-700 dark:text-red-400';
}

export function IpAnalyticsKpiCards({ kpis }: IpAnalyticsKpiCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
      <Card className="print:break-inside-avoid">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Total inventory units</CardTitle>
          <CardDescription className="text-xs">All rows in current view</CardDescription>
        </CardHeader>
        <CardContent className="text-2xl font-semibold tabular-nums">{kpis.totalUnits}</CardContent>
      </Card>

      <Card className="print:break-inside-avoid">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Available</CardTitle>
          <CardDescription className="text-xs">Disposition = Available</CardDescription>
        </CardHeader>
        <CardContent className="text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
          {kpis.availableCount}
        </CardContent>
      </Card>

      <Card className="print:break-inside-avoid">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Used</CardTitle>
          <CardDescription className="text-xs">Disposition = Used</CardDescription>
        </CardHeader>
        <CardContent className="text-2xl font-semibold tabular-nums">{kpis.usedCount}</CardContent>
      </Card>

      <Card className="print:break-inside-avoid">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Verified</CardTitle>
          <CardDescription className="text-xs">Items with verification recorded</CardDescription>
        </CardHeader>
        <CardContent className="text-2xl font-semibold tabular-nums text-blue-700 dark:text-blue-400">
          {kpis.verifiedCount}
        </CardContent>
      </Card>

      <Card className="print:break-inside-avoid">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Pending verification</CardTitle>
          <CardDescription className="text-xs">Used items not yet verified</CardDescription>
        </CardHeader>
        <CardContent className="text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
          {kpis.pendingVerificationCount}
        </CardContent>
      </Card>

      <Card className="print:break-inside-avoid">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Missing serial number</CardTitle>
          <CardDescription className="text-xs">Rows with blank serial number</CardDescription>
        </CardHeader>
        <CardContent className="text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
          {kpis.missingSerialCount}
        </CardContent>
      </Card>

      <Card className="print:break-inside-avoid">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Missing lot number</CardTitle>
          <CardDescription className="text-xs">Rows with blank lot number</CardDescription>
        </CardHeader>
        <CardContent className="text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
          {kpis.missingLotCount}
        </CardContent>
      </Card>

      <Card className="print:break-inside-avoid">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Utilization rate</CardTitle>
          <CardDescription className="text-xs">Used / Total inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <span className={cn('text-2xl font-semibold tabular-nums', rateColor(kpis.utilizationRate))}>
            {kpis.utilizationRate}%
          </span>
          <span className="text-sm text-muted-foreground ml-2">
            ({kpis.usedCount} / {kpis.totalUnits})
          </span>
        </CardContent>
      </Card>

      <Card className="print:break-inside-avoid">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Verification rate</CardTitle>
          <CardDescription className="text-xs">Verified / Used inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <span className={cn('text-2xl font-semibold tabular-nums', rateColor(kpis.verificationRate))}>
            {kpis.verificationRate}%
          </span>
          <span className="text-sm text-muted-foreground ml-2">
            ({kpis.verifiedCount} / {kpis.usedCount})
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
