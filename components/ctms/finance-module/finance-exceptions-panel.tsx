'use client';

import { AlertTriangle, AlertOctagon, Info } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FinanceDashboardAlertItem } from '@/lib/actions/study-finance-module';

interface FinanceExceptionsPanelProps {
  alerts: FinanceDashboardAlertItem[];
}

const ICON_BY_SEVERITY: Record<FinanceDashboardAlertItem['severity'], typeof AlertTriangle> = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertOctagon,
};

const VARIANT_BY_SEVERITY: Record<FinanceDashboardAlertItem['severity'], 'info' | 'warning' | 'destructive'> = {
  info: 'info',
  warning: 'warning',
  critical: 'destructive',
};

export function FinanceExceptionsPanel({ alerts }: FinanceExceptionsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Alerts &amp; Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No exceptions for this study right now.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {alerts.map((alert) => {
              const Icon = ICON_BY_SEVERITY[alert.severity];
              return (
                <li key={alert.id} className="flex items-start gap-2 text-xs">
                  <Icon
                    className={
                      alert.severity === 'critical'
                        ? 'mt-0.5 h-3.5 w-3.5 text-destructive'
                        : alert.severity === 'warning'
                          ? 'mt-0.5 h-3.5 w-3.5 text-amber-600'
                          : 'mt-0.5 h-3.5 w-3.5 text-blue-600'
                    }
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-foreground">{alert.label}</span>
                      <Badge variant={VARIANT_BY_SEVERITY[alert.severity]} className="capitalize">
                        {alert.severity}
                      </Badge>
                    </div>
                    {alert.detail ? (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{alert.detail}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
