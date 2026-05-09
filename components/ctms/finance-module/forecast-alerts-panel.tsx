'use client';

import { AlertTriangle, Info, TriangleAlert } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ForecastAlertsPanelProps {
  alerts: { id: string; label: string; severity: 'info' | 'warning' | 'critical'; detail?: string | null }[];
}

const SEVERITY_ICON = {
  info: Info,
  warning: TriangleAlert,
  critical: AlertTriangle,
};

const SEVERITY_TONE = {
  info: 'text-sky-600 dark:text-sky-400',
  warning: 'text-amber-600 dark:text-amber-400',
  critical: 'text-destructive',
};

export function ForecastAlertsPanel({ alerts }: ForecastAlertsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Forecast Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No forecast alerts. Categories within approved budget tolerances.
          </p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert) => {
              const Icon = SEVERITY_ICON[alert.severity];
              return (
                <li
                  key={alert.id}
                  className="flex items-start gap-2 border-b border-border last:border-0 pb-2 last:pb-0"
                >
                  <Icon className={`size-3.5 mt-0.5 shrink-0 ${SEVERITY_TONE[alert.severity]}`} />
                  <div className="min-w-0">
                    <div className="text-xs font-medium">{alert.label}</div>
                    {alert.detail ? (
                      <div className="text-[11px] text-muted-foreground">{alert.detail}</div>
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
