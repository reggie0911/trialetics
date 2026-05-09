'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PoBalanceStatusPanelProps {
  buckets: { bucket: string; count: number }[];
}

export function PoBalanceStatusPanel({ buckets }: PoBalanceStatusPanelProps) {
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">PO Balance Status</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-xs text-muted-foreground">No purchase orders yet.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-xs">
            {buckets.map((bucket) => (
              <li key={bucket.bucket} className="flex items-center justify-between gap-3">
                <span className="text-foreground">{bucket.bucket}</span>
                <span className="text-muted-foreground tabular-nums">
                  {bucket.count} {bucket.count === 1 ? 'PO' : 'POs'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
