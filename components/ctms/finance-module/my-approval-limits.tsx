'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';

interface ApprovalLimit {
  type: 'invoice' | 'po' | 'budget';
  label: string;
  limit: number;
  used: number;
}

interface MyApprovalLimitsProps {
  limits?: ApprovalLimit[];
  baseCurrency: string;
}

const DEFAULT_LIMITS: ApprovalLimit[] = [
  { type: 'invoice', label: 'Invoice Limit', limit: 50000, used: 0 },
  { type: 'po', label: 'PO Limit', limit: 100000, used: 0 },
  { type: 'budget', label: 'Budget Limit', limit: 250000, used: 0 },
];

export function MyApprovalLimits({ limits = DEFAULT_LIMITS, baseCurrency }: MyApprovalLimitsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">My Approval Limits</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {limits.map((limit) => {
            const remaining = Math.max(0, limit.limit - limit.used);
            const pct = limit.limit > 0 ? Math.min(100, (limit.used / limit.limit) * 100) : 0;
            return (
              <li key={limit.type} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{limit.label}</span>
                  <span className="text-muted-foreground">
                    {formatCompactCurrency(limit.used, baseCurrency)} /{' '}
                    {formatCompactCurrency(limit.limit, baseCurrency)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={
                      pct > 80
                        ? 'h-full bg-destructive'
                        : pct > 50
                          ? 'h-full bg-amber-500'
                          : 'h-full bg-emerald-500'
                    }
                    style={{ width: `${pct}%` }}
                    aria-hidden
                  />
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {formatCompactCurrency(remaining, baseCurrency)} remaining
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Need a higher limit? Contact your finance administrator.
        </p>
      </CardContent>
    </Card>
  );
}
