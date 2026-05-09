'use client';

import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FmApprovalRequest } from '@/lib/finance-module/types';

interface ApproverWorkloadProps {
  rows: FmApprovalRequest[];
}

export function ApproverWorkload({ rows }: ApproverWorkloadProps) {
  const data = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (['approved', 'rejected', 'completed'].includes(row.status)) continue;
      const key = row.submitted_by ?? 'Unassigned';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const entries = Array.from(counts.entries()).map(([approver, count]) => ({
      approver,
      label: approver === 'Unassigned' ? 'Unassigned' : `Approver ${approver.slice(0, 8)}`,
      count,
    }));
    entries.sort((a, b) => b.count - a.count);
    return entries.slice(0, 5);
  }, [rows]);

  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Approver Workload</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No active approvers in queue. Workload distribution will appear once approvals are
            routed.
          </p>
        ) : (
          <ul className="space-y-2">
            {data.map((d) => (
              <li key={d.approver} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium truncate">{d.label}</span>
                  <span className="text-muted-foreground">{d.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${(d.count / max) * 100}%` }}
                    aria-hidden
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
