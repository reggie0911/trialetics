'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

interface PortfolioKPIGridProps {
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

export function PortfolioKPIGrid({ snapshots }: PortfolioKPIGridProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Protocol</TableHead>
          <TableHead>Health</TableHead>
          <TableHead>Enrollment</TableHead>
          <TableHead>Sites</TableHead>
          <TableHead>Budget</TableHead>
          <TableHead>Deviations</TableHead>
          <TableHead>Action Items</TableHead>
          <TableHead>KRI Alerts</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {snapshots.map((s) => {
          const name = s.protocol?.title || s.protocol?.protocol_number || s.protocol_id;
          return (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{name}</TableCell>
              <TableCell>
                <Badge variant={HEALTH_VARIANTS[s.overall_health]} className={HEALTH_COLORS[s.overall_health]}>
                  {PORTFOLIO_HEALTH_LABELS[s.overall_health]}
                </Badge>
              </TableCell>
              <TableCell>{s.enrollment_actual} / {s.enrollment_target || '—'}</TableCell>
              <TableCell>{s.active_sites} / {s.site_count}</TableCell>
              <TableCell>{formatCurrency(s.budget_spent)} / {formatCurrency(s.budget_total)}</TableCell>
              <TableCell>{s.open_deviations}</TableCell>
              <TableCell>{s.open_action_items}</TableCell>
              <TableCell>{s.kri_alerts_active}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
