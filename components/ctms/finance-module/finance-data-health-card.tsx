import Link from 'next/link';
import { AlertTriangle, Check, Circle } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { FinanceDataHealthSignals } from '@/lib/actions/study-finance-module';
import { buildFinanceModulePath } from '@/lib/finance-module/types';
import { cn } from '@/lib/utils';

export interface FinanceDataHealthCardProps {
  studyId: string;
  hasBudget: boolean;
  activeCategoryCount: number;
  activeVendorCount: number;
  /** Optional anomaly counts from `getFinanceDataHealthSignals`. */
  signals?: FinanceDataHealthSignals | null;
}

export function FinanceDataHealthCard({
  studyId,
  hasBudget,
  activeCategoryCount,
  activeVendorCount,
  signals,
}: FinanceDataHealthCardProps) {
  const root = `/protected/studies/${studyId}/finance-module`;

  const items: { ok: boolean; warn?: boolean; label: string; href: string; detail?: string }[] = [
    { ok: hasBudget, label: 'Study budget created', href: buildFinanceModulePath(studyId, 'budget') },
    {
      ok: activeCategoryCount > 0,
      label: 'At least one budget category',
      href: `${buildFinanceModulePath(studyId, 'settings')}#fm-settings-budget-categories`,
    },
    { ok: activeVendorCount > 0, label: 'At least one active vendor', href: `${root}/vendors` },
  ];

  if (signals) {
    items.push({
      ok: signals.orphanInvoiceLineItems === 0,
      warn: signals.orphanInvoiceLineItems > 0,
      label: 'Invoice lines reference valid categories',
      href: `${root}/invoices?fmHealth=orphan_lines`,
      detail:
        signals.orphanInvoiceLineItems > 0
          ? `${signals.orphanInvoiceLineItems} line item(s) point at missing categories`
          : undefined,
    });
    items.push({
      ok: signals.purchaseOrdersMissingVendor === 0,
      warn: signals.purchaseOrdersMissingVendor > 0,
      label: 'Purchase orders reference active vendors',
      href: `${root}/purchase-orders?fmHealth=no_vendor`,
      detail:
        signals.purchaseOrdersMissingVendor > 0
          ? `${signals.purchaseOrdersMissingVendor} PO(s) missing vendor or linked to archived/missing vendor`
          : undefined,
    });
    items.push({
      ok: signals.changeOrdersStaleTargets === 0,
      warn: signals.changeOrdersStaleTargets > 0,
      label: 'Change order targets resolve',
      href: `${root}/change-orders?fmHealth=stale_targets`,
      detail:
        signals.changeOrdersStaleTargets > 0
          ? `${signals.changeOrdersStaleTargets} change order(s) reference missing targets`
          : undefined,
    });
    items.push({
      ok: !signals.forecastPersistedWithoutBaseline,
      warn: signals.forecastPersistedWithoutBaseline,
      label: 'Forecast baseline set when scenarios exist',
      href: `${root}/forecasting?fmHealth=no_baseline`,
      detail: signals.forecastPersistedWithoutBaseline
        ? 'Select a baseline scenario in workspace settings or the scenario library'
        : undefined,
    });
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium">Data setup checklist</CardTitle>
        <CardDescription className="text-[11px]">
          Core master data plus automated data-quality checks. Follow links to filtered views when something needs
          attention.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="flex flex-col gap-2 text-xs">
          {items.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col gap-0.5 rounded-md border border-transparent px-2 py-1.5 transition-colors hover:bg-muted/60',
                  !item.ok && !item.warn && 'text-muted-foreground',
                  item.warn && 'border-amber-500/40 bg-amber-500/5',
                )}
              >
                <span className="flex items-center gap-2">
                  {item.ok ? (
                    <Check className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
                  ) : item.warn ? (
                    <AlertTriangle className="size-3.5 shrink-0 text-amber-600" aria-hidden />
                  ) : (
                    <Circle className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span className={item.ok ? 'text-foreground' : undefined}>{item.label}</span>
                </span>
                {item.detail ? <span className="pl-5 text-[10px] text-muted-foreground">{item.detail}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
