/**
 * Invoice line to budget line matching utility.
 * Phase 5: Enhanced with section-type-aware matching.
 * When site budget lines carry a `section` value (inherited from study budget propagation),
 * the matcher considers section alignment in addition to description similarity.
 */

// ─── String similarity ────────────────────────────────────────────────────────

function normalizeDesc(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s: string): Set<string> {
  const t = normalizeDesc(s).split(/[^a-z0-9]+/).filter((x) => x.length > 1);
  return new Set(t);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter++;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function scoreDescriptionMatch(a: string, b: string): number {
  const na = normalizeDesc(a);
  const nb = normalizeDesc(b);
  if (!na || !nb) return 0;
  const ta = tokens(a);
  const tb = tokens(b);
  let score = jaccard(ta, tb);
  if (na.includes(nb) || nb.includes(na)) score = Math.max(score, 0.45);
  return score;
}

// ─── Section-aware scoring (Phase 5 enhancement) ──────────────────────────────

/**
 * Optional: infer a broad section type from extracted invoice line description.
 * This is heuristic-based for legacy/unsectioned budgets.
 */
function inferSectionFromDescription(desc: string): string | null {
  const d = desc.toLowerCase();
  if (/feasibility|initiation|irb|regulatory|startup|pass.through/.test(d)) return 'invoiceable';
  if (/mri|ct|scan|imaging|lab|cbc|bmp|procedure|vital|exam|consent/.test(d)) return 'per_patient_procedure';
  if (/coordinator|pi |cra|data manager|monitor|staff|effort/.test(d)) return 'staff_effort';
  if (/supply|supplies|per.visit|visit.cost/.test(d)) return 'per_visit_expense';
  if (/travel|stipend|reimburse/.test(d)) return 'subject_travel';
  return null;
}

/**
 * Score with optional section bonus.
 * @param invoiceDesc - Description from extracted invoice line
 * @param budgetDesc - Description from site budget line item
 * @param budgetSection - `section` field on the site budget line (may be null)
 * @param inferredInvoiceSection - Pre-computed section inference for the invoice line
 */
export function scoreWithSectionBonus(
  invoiceDesc: string,
  budgetDesc: string,
  budgetSection: string | null,
  inferredInvoiceSection: string | null
): number {
  const baseScore = scoreDescriptionMatch(invoiceDesc, budgetDesc);
  if (!budgetSection || !inferredInvoiceSection) return baseScore;

  // Normalize the budget section string (which is a human name like "Invoiceable Items...")
  const normalizedBudgetSection = budgetSection.toLowerCase();
  if (normalizedBudgetSection.includes(inferredInvoiceSection) ||
      inferredInvoiceSection === normalizedBudgetSection) {
    return Math.min(1, baseScore + 0.3);
  }
  return baseScore;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type ExtractedInvoiceLineForMatch = {
  description?: unknown;
  amount?: unknown;
};

const SUGGEST_MIN_SCORE = 0.28;

/**
 * Sum suggested amounts per budget line id from AI-extracted invoice line items.
 * Phase 5: Uses section-aware scoring when budget line items carry a `section` field.
 */
export function suggestInvoiceBudgetAmountsByDescription(
  extractedData: Record<string, unknown> | null,
  lineItems: { id: string; description: string; is_active: boolean; section?: string }[]
): Record<string, number> {
  const raw = extractedData?.lineItems;
  if (!Array.isArray(raw)) return {};

  const activeLines = lineItems.filter((l) => l.is_active);
  if (activeLines.length === 0) return {};

  const amounts: Record<string, number> = {};

  for (const item of raw as ExtractedInvoiceLineForMatch[]) {
    const desc = typeof item.description === 'string' ? item.description : '';
    const amtRaw = item.amount;
    const amt =
      typeof amtRaw === 'number' && !Number.isNaN(amtRaw)
        ? amtRaw
        : typeof amtRaw === 'string'
          ? parseFloat(amtRaw)
          : 0;
    if (!desc.trim() || amt <= 0) continue;

    // Infer section from description for section bonus scoring
    const inferredSection = inferSectionFromDescription(desc);

    let bestId: string | null = null;
    let bestScore = 0;

    for (const li of activeLines) {
      const s = scoreWithSectionBonus(desc, li.description, li.section ?? null, inferredSection);
      if (s > bestScore) {
        bestScore = s;
        bestId = li.id;
      }
    }

    if (bestId && bestScore >= SUGGEST_MIN_SCORE) {
      amounts[bestId] = Math.round(((amounts[bestId] ?? 0) + amt) * 100) / 100;
    }
  }

  return amounts;
}
