'use client';

import { useFmPermissions } from '@/hooks/use-fm-permissions';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';

type LimitKind = 'invoice' | 'po' | 'budget';

interface FmApprovalLimitHintProps {
  studyId: string;
  kind: LimitKind;
  amount: number;
  currency: string;
  className?: string;
}

/**
 * Inline row hint when an amount exceeds the study-configured approval ceiling
 * for the current user (same-currency rows only; avoids silent FX mistakes).
 */
export function FmApprovalLimitHint({ studyId, kind, amount, currency, className }: FmApprovalLimitHintProps) {
  const q = useFmPermissions(studyId);
  if (!q.data) return null;
  const { approvalLimits, baseCurrency, nextApproverRoutingHint } = q.data;
  if (currency.trim().toUpperCase() !== baseCurrency.trim().toUpperCase()) return null;
  const limit = approvalLimits[kind];
  if (!Number.isFinite(amount) || amount <= limit) return null;
  return (
    <p className={className ?? 'mt-0.5 text-[10px] text-amber-700 dark:text-amber-400'}>
      Above your {formatCompactCurrency(limit, baseCurrency)} limit — will route to {nextApproverRoutingHint}.
    </p>
  );
}
