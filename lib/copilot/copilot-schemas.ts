import { z } from 'zod';

import type {
  ActionChipPayload,
  AgentCardPayload,
  CardSource,
  FieldSuggestPayload,
  FormFieldProposal,
  FormFillPayload,
  InsightCardPayload,
  RecommendationCardPayload,
  TableRowProposal,
  TableUpdatePayload,
  TemplateFillPayload,
  TemplateSectionProposal,
} from '@/lib/ai/types';

/**
 * Single source of truth for the structured outputs the Copilot can emit
 * (Phase 2). Both the orchestrator (server) and the card primitives (client)
 * import these schemas — if a payload doesn't `safeParse` we *do not render*
 * the card and surface a degraded fallback instead. This is the contract
 * that lets us evolve the agents without breaking the UI.
 */

export const cardConfidenceSchema = z.enum(['high', 'medium', 'low']);
export const cardSeveritySchema = z.enum(['info', 'warning', 'critical', 'positive']);
export const actionRiskLevelSchema = z.enum(['safe', 'reviewable', 'destructive']);

export const cardSourceSchema: z.ZodType<CardSource> = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum([
    'study',
    'site',
    'subject',
    'visit',
    'document',
    'financial_record',
    'task',
    'kri',
    'query',
    'agent_run',
    'document_chunk',
  ]),
  href: z.string().optional(),
  excerpt: z.string().optional(),
});

export const insightCardSchema: z.ZodType<InsightCardPayload> = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  severity: cardSeveritySchema,
  confidence: cardConfidenceSchema,
  whyThis: z.string().optional(),
  agentId: z.string().min(1),
  agentVersion: z.string().optional(),
  sources: z.array(cardSourceSchema).optional(),
  metric: z
    .object({
      label: z.string(),
      value: z.string(),
      delta: z.string().optional(),
      deltaDirection: z.enum(['up', 'down', 'flat']).optional(),
    })
    .optional(),
  generatedAt: z.string().min(1),
});

export const actionChipSchema: z.ZodType<ActionChipPayload> = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  agentId: z.string().min(1),
  agentVersion: z.string().optional(),
  tool: z.string().min(1),
  args: z.record(z.string(), z.unknown()).optional(),
  requiredRole: z.string().optional(),
  riskLevel: actionRiskLevelSchema,
  requiresApproval: z.boolean(),
  requiresESignature: z.boolean().optional(),
  whyThis: z.string().optional(),
  sources: z.array(cardSourceSchema).optional(),
  generatedAt: z.string().min(1),
});

export const recommendationCardSchema: z.ZodType<RecommendationCardPayload> = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rationale: z.string().min(1),
  agentId: z.string().min(1),
  agentVersion: z.string().optional(),
  action: actionChipSchema.optional(),
  confidence: cardConfidenceSchema,
  sources: z.array(cardSourceSchema).optional(),
  whyThis: z.string().optional(),
  generatedAt: z.string().min(1),
});

export const agentCardSchema: z.ZodType<AgentCardPayload> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  recommended: z.boolean(),
  recommendationReason: z.string().optional(),
  moduleContext: z.array(z.string()),
  agentVersion: z.string().optional(),
});

/* ===================================================================== */
/* Phase 7 — form_fill / table_update / template_fill / field_suggest    */
/* ===================================================================== */

const scopeSchema = z.object({
  kind: z.enum(['study', 'site', 'subject', 'visit', 'tracker', 'global']),
  id: z.string().optional(),
  label: z.string().optional(),
});

// Note: zod treats `z.unknown()` as optional in its inferred type, so we let
// zod infer here and assert against `FormFieldProposal` at the boundary
// (see COPILOT_CARD_SCHEMAS) to avoid a structural mismatch on the `value`
// field.
export const formFieldProposalSchema = z.object({
  path: z.string().min(1),
  label: z.string().optional(),
  value: z.unknown(),
  rationale: z.string().optional(),
  confidence: cardConfidenceSchema,
  sources: z.array(cardSourceSchema).optional(),
  requiresConfirmation: z.boolean().optional(),
}) as unknown as z.ZodType<FormFieldProposal>;

export const formFillSchema: z.ZodType<FormFillPayload> = z.object({
  id: z.string().min(1),
  schemaId: z.string().min(1),
  schemaLabel: z.string().optional(),
  agentId: z.string().min(1),
  agentVersion: z.string().optional(),
  fields: z.array(formFieldProposalSchema),
  missingRequired: z.array(z.string()),
  scope: scopeSchema.optional(),
  sourceDocumentIds: z.array(z.string()).optional(),
  generatedAt: z.string().min(1),
  requiresESignature: z.boolean().optional(),
});

export const tableRowProposalSchema: z.ZodType<TableRowProposal> = z.object({
  op: z.enum(['insert', 'update']),
  match: z.record(z.string(), z.union([z.string(), z.number(), z.null()])).optional(),
  values: z.record(z.string(), z.unknown()),
  confidence: cardConfidenceSchema,
  fieldConfidence: z.record(z.string(), cardConfidenceSchema).optional(),
  sources: z.array(cardSourceSchema).optional(),
  conflictWith: z
    .object({
      id: z.string().min(1),
      preview: z.record(z.string(), z.unknown()),
    })
    .optional(),
});

export const tableUpdateSchema: z.ZodType<TableUpdatePayload> = z.object({
  id: z.string().min(1),
  tableId: z.string().min(1),
  tableLabel: z.string().optional(),
  agentId: z.string().min(1),
  agentVersion: z.string().optional(),
  ops: z.array(tableRowProposalSchema),
  mapping: z
    .record(
      z.string(),
      z.object({ fieldPath: z.string().min(1), confidence: cardConfidenceSchema })
    )
    .optional(),
  conflictCount: z.number().int().nonnegative().optional(),
  scope: z
    .object({ kind: z.enum(['study', 'site', 'global']), id: z.string().optional(), label: z.string().optional() })
    .optional(),
  sourceDocumentIds: z.array(z.string()).optional(),
  generatedAt: z.string().min(1),
});

export const templateSectionProposalSchema: z.ZodType<TemplateSectionProposal> = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(['narrative', 'structured', 'placeholder']),
  content: z.string(),
  placeholders: z.array(z.string()).optional(),
  confidence: cardConfidenceSchema,
  sources: z.array(cardSourceSchema).optional(),
});

export const templateFillSchema: z.ZodType<TemplateFillPayload> = z.object({
  id: z.string().min(1),
  templateId: z.string().min(1),
  templateLabel: z.string().optional(),
  templateKind: z.enum(['visit_report', 'capa', 'letter', 'exec_update', 'custom']),
  agentId: z.string().min(1),
  agentVersion: z.string().optional(),
  sections: z.array(templateSectionProposalSchema),
  scope: z
    .object({
      kind: z.enum(['study', 'site', 'subject', 'visit', 'global']),
      id: z.string().optional(),
      label: z.string().optional(),
    })
    .optional(),
  sourceDocumentIds: z.array(z.string()).optional(),
  generatedAt: z.string().min(1),
  requiresESignature: z.boolean().optional(),
});

export const fieldSuggestSchema = z.object({
  id: z.string().min(1),
  schemaId: z.string().min(1),
  fieldPath: z.string().min(1),
  fieldLabel: z.string().optional(),
  value: z.unknown(),
  rationale: z.string().optional(),
  confidence: cardConfidenceSchema,
  sources: z.array(cardSourceSchema).optional(),
  agentId: z.string().min(1),
  agentVersion: z.string().optional(),
  generatedAt: z.string().min(1),
}) as unknown as z.ZodType<FieldSuggestPayload>;

/**
 * Discriminator helper: takes any structured payload and returns whether it
 * passes its respective schema. Used by the streaming adapter and by tests.
 */
export const COPILOT_CARD_SCHEMAS = {
  insight_card: insightCardSchema,
  action_chip: actionChipSchema,
  recommendation_card: recommendationCardSchema,
  agent_card: agentCardSchema,
  form_fill: formFillSchema,
  table_update: tableUpdateSchema,
  template_fill: templateFillSchema,
  field_suggest: fieldSuggestSchema,
} as const;

export type CopilotCardKind = keyof typeof COPILOT_CARD_SCHEMAS;

export function parseCopilotCard<K extends CopilotCardKind>(
  kind: K,
  payload: unknown
): z.infer<(typeof COPILOT_CARD_SCHEMAS)[K]> | null {
  const schema = COPILOT_CARD_SCHEMAS[kind];
  const parsed = schema.safeParse(payload);
  return parsed.success ? (parsed.data as z.infer<(typeof COPILOT_CARD_SCHEMAS)[K]>) : null;
}
