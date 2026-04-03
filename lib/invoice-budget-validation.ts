/**
 * Pure invoice validation logic (no I/O).
 * Validates an invoice's allocation against an approved site budget.
 * Returns structured results: hard blocks, soft warnings, and info notices.
 */

import type { SiteBudgetLineItem } from '@/lib/types/ctms';

// ─── Input types ──────────────────────────────────────────────────────────────

export interface ValidationInvoice {
  id: string;
  total_amount: number;
  currency: string;
}

export interface ValidationAllocation {
  site_budget_line_item_id: string;
  amount: number;
}

export interface ValidationSiteBudget {
  approved_amount: number | null;
  currency: string;
  escalation_threshold_cents?: number;
}

// ─── Result types ─────────────────────────────────────────────────────────────

export interface HardBlock {
  type: 'hard_block';
  code: string;
  message: string;
  amount?: number;
}

export interface SoftWarning {
  type: 'soft_warning';
  code: string;
  message: string;
  lineItemId?: string;
  sectionName?: string;
  amount?: number;
}

export interface InfoNotice {
  type: 'info';
  code: string;
  message: string;
  sectionName?: string;
  utilizationPercent?: number;
}

export interface ValidationResult {
  errors: HardBlock[];
  warnings: SoftWarning[];
  info: InfoNotice[];
  /** Total allocated across all lines */
  totalAllocated: number;
  /** Remaining approved budget after this invoice */
  remainingAfter: number | null;
  /** Per-section utilization: sectionName -> { allocated, cap, percent } */
  sectionUtilization: Record<string, { allocated: number; cap: number; percent: number }>;
}

// ─── Validator ────────────────────────────────────────────────────────────────

/**
 * Run all validation rules for an invoice being submitted.
 *
 * @param invoice - The invoice being validated
 * @param siteBudget - The approved site budget for the site
 * @param lineItems - All site budget line items
 * @param allocations - Budget line allocations for this invoice
 * @param existingUsageByLine - Map of line_item_id -> total already allocated (excluding this invoice)
 * @param escalationThresholdCents - From the approval template; hard block if exceeded (default 0 = any overage blocks)
 */
export function validateInvoiceAgainstBudget(
  invoice: ValidationInvoice,
  siteBudget: ValidationSiteBudget,
  lineItems: SiteBudgetLineItem[],
  allocations: ValidationAllocation[],
  existingUsageByLine: Record<string, number>,
  escalationThresholdCents: number = 0
): ValidationResult {
  const errors: HardBlock[] = [];
  const warnings: SoftWarning[] = [];
  const info: InfoNotice[] = [];

  const lineItemMap = new Map<string, SiteBudgetLineItem>(lineItems.map((l) => [l.id, l]));

  // Total allocated by this invoice
  const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);

  // ── Rule 1: Hard block — invoice exceeds approved budget ──────────────────
  let remainingAfter: number | null = null;
  if (siteBudget.approved_amount != null) {
    const approvedAmount = siteBudget.approved_amount;
    // Sum existing allocations excluding this invoice (passed in as existingUsageByLine)
    const totalExistingUsage = Object.values(existingUsageByLine).reduce((s, v) => s + v, 0);
    const remainingBefore = approvedAmount - totalExistingUsage;
    remainingAfter = remainingBefore - totalAllocated;

    if (remainingAfter < 0) {
      const overageAmount = Math.abs(remainingAfter);
      const overageCents = Math.round(overageAmount * 100);
      if (overageCents > escalationThresholdCents) {
        errors.push({
          type: 'hard_block',
          code: 'BUDGET_EXCEEDED',
          message: `Invoice total exceeds remaining approved budget by ${formatCurrency(overageAmount, siteBudget.currency)}. Please reduce the allocation or escalate for approval.`,
          amount: overageAmount,
        });
      }
    }
  }

  // ── Rule 2: Soft warning — individual line item over cap ──────────────────
  const sectionAllocationMap: Record<string, { allocated: number; cap: number }> = {};

  for (const allocation of allocations) {
    const lineItem = lineItemMap.get(allocation.site_budget_line_item_id);
    if (!lineItem) continue;

    const existingOnLine = existingUsageByLine[lineItem.id] ?? 0;
    const totalOnLine = existingOnLine + allocation.amount;
    const lineCap = lineItem.cost_with_overhead;

    if (totalOnLine > lineCap + 0.01) {
      warnings.push({
        type: 'soft_warning',
        code: 'LINE_OVER_CAP',
        message: `"${lineItem.description}" allocation (${formatCurrency(totalOnLine, siteBudget.currency)}) exceeds line cap of ${formatCurrency(lineCap, siteBudget.currency)}.`,
        lineItemId: lineItem.id,
        sectionName: lineItem.section,
        amount: totalOnLine - lineCap,
      });
    }

    // Accumulate section utilization
    const sectionName = lineItem.section ?? 'Unsectioned';
    if (!sectionAllocationMap[sectionName]) {
      sectionAllocationMap[sectionName] = { allocated: 0, cap: 0 };
    }
    sectionAllocationMap[sectionName].allocated += totalOnLine;
    sectionAllocationMap[sectionName].cap += lineCap;
  }

  // Build full section utilization including lines not in this invoice
  const fullSectionMap: Record<string, { allocated: number; cap: number }> = {};
  for (const lineItem of lineItems) {
    const sectionName = lineItem.section ?? 'Unsectioned';
    if (!fullSectionMap[sectionName]) {
      fullSectionMap[sectionName] = { allocated: 0, cap: 0 };
    }
    fullSectionMap[sectionName].cap += lineItem.cost_with_overhead;
    const existingOnLine = existingUsageByLine[lineItem.id] ?? 0;
    const thisInvoiceAlloc = allocations.find((a) => a.site_budget_line_item_id === lineItem.id)?.amount ?? 0;
    fullSectionMap[sectionName].allocated += existingOnLine + thisInvoiceAlloc;
  }

  // ── Rule 3: Info notice — section utilization > 80% ───────────────────────
  const sectionUtilization: Record<string, { allocated: number; cap: number; percent: number }> = {};
  for (const [sectionName, { allocated, cap }] of Object.entries(fullSectionMap)) {
    const percent = cap > 0 ? (allocated / cap) * 100 : 0;
    sectionUtilization[sectionName] = { allocated, cap, percent };
    if (percent > 80 && percent < 100) {
      info.push({
        type: 'info',
        code: 'SECTION_UTILIZATION_HIGH',
        message: `Section "${sectionName}" is at ${percent.toFixed(0)}% utilization.`,
        sectionName,
        utilizationPercent: percent,
      });
    }
  }

  return { errors, warnings, info, totalAllocated, remainingAfter, sectionUtilization };
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}
