'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { VendorSpendRow } from '@/lib/actions/study-finance-module';
import { FM_VENDOR_HEALTH_LABELS, type FmVendorHealthStatus } from '@/lib/finance-module/types';

interface VendorAlertsPanelProps {
  rows: VendorSpendRow[];
}

export function VendorAlertsPanel({ rows }: VendorAlertsPanelProps) {
  const items: { id: string; label: string }[] = [];
  for (const row of rows) {
    if (row.pctOfContract >= 80) {
      items.push({
        id: `util-${row.vendorId}`,
        label: `${row.name}: contract utilization is ${row.pctOfContract.toFixed(0)}%.`,
      });
    }
    if (row.healthStatus !== 'healthy') {
      items.push({
        id: `health-${row.vendorId}`,
        label: `${row.name} health: ${FM_VENDOR_HEALTH_LABELS[row.healthStatus as FmVendorHealthStatus] ?? row.healthStatus}.`,
      });
    }
    if (row.riskLevel === 'high') {
      items.push({
        id: `risk-${row.vendorId}`,
        label: `${row.name} risk level is High.`,
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No vendor alerts.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-xs">
            {items.slice(0, 6).map((item) => (
              <li key={item.id} className="text-foreground">
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
