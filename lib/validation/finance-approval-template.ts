import { z } from 'zod';

/** One approval step in a finance template JSONB `steps` array (matches RPC expectations). */
export const financeApprovalTemplateStepSchema = z.object({
  order: z.number().int().min(0),
  label: z.string().min(1, 'Step label is required').max(200),
  study_roles_any: z
    .array(z.string().min(1))
    .min(1, 'Each step needs at least one study role'),
});

export type FinanceApprovalTemplateStep = z.infer<typeof financeApprovalTemplateStepSchema>;

export const financeApprovalTemplateFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  is_default: z.boolean(),
  escalation_threshold_cents: z.coerce
    .number()
    .int()
    .min(0, 'Must be zero or positive')
    .max(Number.MAX_SAFE_INTEGER),
  steps: z
    .array(financeApprovalTemplateStepSchema)
    .min(1, 'Add at least one approval step'),
});

export type FinanceApprovalTemplateFormValues = z.infer<typeof financeApprovalTemplateFormSchema>;

/** Normalize steps: sync `order` to array index for RPC compatibility. */
export function normalizeTemplateSteps(steps: FinanceApprovalTemplateStep[]): FinanceApprovalTemplateStep[] {
  return steps.map((s, i) => ({
    ...s,
    order: i,
    study_roles_any: [...new Set(s.study_roles_any)],
  }));
}

export function stepsToJsonb(steps: FinanceApprovalTemplateStep[]): unknown[] {
  return normalizeTemplateSteps(steps).map((s) => ({
    order: s.order,
    label: s.label,
    study_roles_any: s.study_roles_any,
  }));
}

export function parseStepsFromDb(raw: unknown): FinanceApprovalTemplateStep[] {
  if (!Array.isArray(raw)) return [];
  const out: FinanceApprovalTemplateStep[] = [];
  for (let i = 0; i < raw.length; i++) {
    const o = raw[i] as Record<string, unknown>;
    const label = typeof o.label === 'string' ? o.label : '';
    const rolesRaw = o.study_roles_any;
    const study_roles_any = Array.isArray(rolesRaw)
      ? rolesRaw.filter((x): x is string => typeof x === 'string' && x.length > 0)
      : [];
    out.push({
      order: typeof o.order === 'number' && Number.isFinite(o.order) ? Math.floor(o.order) : i,
      label,
      study_roles_any,
    });
  }
  return out;
}
