'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PoTrackerRow } from '@/lib/actions/study-finance-module';

interface PoAlertsPanelProps {
  rows: PoTrackerRow[];
}

export function PoAlertsPanel({ rows }: PoAlertsPanelProps) {
  const expiringSoon = rows.filter(
    (r) => r.daysToExpiration != null && r.daysToExpiration >= 0 && r.daysToExpiration <= 30,
  );
  const overdue = rows.filter((r) => r.isOverdue);
  const overUtilized = rows.filter((r) => r.utilizationPct >= 90);

  const items: { id: string; label: string; severity: 'info' | 'warning' | 'critical' }[] = [];
  for (const po of overdue) {
    items.push({
      id: `overdue-${po.id}`,
      label: `PO ${po.po_number} expired ${Math.abs(po.daysToExpiration ?? 0)} days ago.`,
      severity: 'critical',
    });
  }
  for (const po of expiringSoon) {
    items.push({
      id: `expiring-${po.id}`,
      label: `PO ${po.po_number} expires in ${po.daysToExpiration ?? 0} days.`,
      severity: 'warning',
    });
  }
  for (const po of overUtilized) {
    items.push({
      id: `utilization-${po.id}`,
      label: `PO ${po.po_number} is ${po.utilizationPct.toFixed(0)}% utilized.`,
      severity: 'warning',
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No alerts on purchase orders.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-xs">
            {items.slice(0, 8).map((item) => (
              <li
                key={item.id}
                className={
                  item.severity === 'critical'
                    ? 'text-destructive'
                    : item.severity === 'warning'
                      ? 'text-amber-600'
                      : 'text-blue-600'
                }
              >
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
