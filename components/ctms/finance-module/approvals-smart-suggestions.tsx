'use client';

import { Sparkles } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FM_APPROVAL_OBJECT_LABELS,
  type FmApprovalRequest,
} from '@/lib/finance-module/types';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';

interface ApprovalsSmartSuggestionsProps {
  rows: FmApprovalRequest[];
}

export function ApprovalsSmartSuggestions({ rows }: ApprovalsSmartSuggestionsProps) {
  const overdueHighValue = rows
    .filter((r) => r.status === 'overdue' && (r.amount ?? 0) >= 25000)
    .slice(0, 3);
  const highPriority = rows
    .filter((r) => r.priority === 'high' && r.status !== 'approved' && r.status !== 'rejected')
    .slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          Smart Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {overdueHighValue.length === 0 && highPriority.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No suggestions yet. Suggestions will appear when high-value or high-priority approvals
            require attention. AI insights are advisory only.
          </p>
        ) : (
          <ul className="space-y-2">
            {overdueHighValue.map((row) => (
              <li key={`overdue-${row.id}`} className="text-xs border-l-2 border-destructive pl-2">
                <div className="font-medium">High-value overdue</div>
                <div className="text-[11px] text-muted-foreground">
                  {FM_APPROVAL_OBJECT_LABELS[row.object_type]} ·{' '}
                  {formatCompactCurrency(Number(row.amount ?? 0), row.currency || 'USD')} due{' '}
                  {row.due_date ?? 'recently'}.
                </div>
              </li>
            ))}
            {highPriority.map((row) => (
              <li key={`priority-${row.id}`} className="text-xs border-l-2 border-amber-500 pl-2">
                <div className="font-medium">Prioritize review</div>
                <div className="text-[11px] text-muted-foreground">
                  {FM_APPROVAL_OBJECT_LABELS[row.object_type]} marked high priority.
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
