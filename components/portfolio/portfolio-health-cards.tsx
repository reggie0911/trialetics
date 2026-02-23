'use client';

import { Badge } from '@/components/ui/badge';
import { PORTFOLIO_HEALTH_LABELS } from '@/lib/types/portfolio';
import type { PortfolioHealth, PortfolioKPISnapshot } from '@/lib/types/portfolio';

const HEALTH_VARIANTS: Record<PortfolioHealth, 'default' | 'secondary' | 'destructive'> = {
  on_track: 'default',
  at_risk: 'secondary',
  critical: 'destructive',
};

const HEALTH_COLORS: Record<PortfolioHealth, string> = {
  on_track: 'text-green-600',
  at_risk: 'text-yellow-600',
  critical: 'text-red-600',
};

interface PortfolioHealthCardsProps {
  snapshots: PortfolioKPISnapshot[];
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function PortfolioHealthCards({ snapshots }: PortfolioHealthCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {snapshots.map((s) => {
        const name = s.protocol?.title || s.protocol?.protocol_number || s.protocol_id;
        const number = s.protocol?.protocol_number;
        return (
          <div
            key={s.id}
            className="rounded-lg border bg-white p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{name}</p>
                {number && <p className="text-xs text-muted-foreground">{number}</p>}
              </div>
              <Badge variant={HEALTH_VARIANTS[s.overall_health]} className={HEALTH_COLORS[s.overall_health]}>
                {PORTFOLIO_HEALTH_LABELS[s.overall_health]}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Enrollment</p>
                <p>{s.enrollment_actual} / {s.enrollment_target || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Budget</p>
                <p>{formatCurrency(s.budget_spent)} / {formatCurrency(s.budget_total)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Deviations</p>
                <p>{s.open_deviations}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Action Items</p>
                <p>{s.open_action_items}</p>
              </div>
              <div>
                <p className="text-muted-foreground">KRI Alerts</p>
                <p>{s.kri_alerts_active}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
