export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  moduleContext: string[];
  systemPrompt: string;
  tools: ToolDefinition[];
  /**
   * Either a raw model slug (e.g. `'gpt-4o'`) or a logical purpose tier
   * resolved by `lib/ai/model-tier.ts`. Tiers are preferred — they let us
   * change the model behind every list/score call without touching agents.
   */
  model?: string;
  /**
   * Semver version recorded in audit + telemetry. Bump on prompt or tool
   * changes so inspectors can answer "what produced this six months ago?"
   * Defaults to `'1.0.0'` if omitted.
   */
  version?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  requiresConfirmation?: boolean;
  handler: (args: Record<string, unknown>, ctx: UserContext) => Promise<unknown>;
}

export interface UserContext {
  currentPage: string;
  protocolId: string | null;
  companyId: string | null;
  userId: string;
  userRole: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  agentId?: string;
  context: {
    currentPage: string;
    protocolId?: string;
  };
}

export interface ChatMessageAttachment {
  id: string;
  type: 'image' | 'document';
  filename: string;
  mimeType: string;
  imageUrl?: string;
  textContent?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: ChatMessageAttachment[];
}

export type StreamEventType =
  | 'text_delta'
  | 'tool_call_start'
  | 'tool_result'
  | 'done'
  | 'error'
  | 'confirm_action'
  | 'file_download'
  | 'generated_questions'
  // Phase 2: structured outputs the orchestrator can emit on top of plain
  // text. Each card carries `confidence` + `sources` so the UI can render
  // trust micro-affordances without parsing free text.
  | 'insight_card'
  | 'action_chip'
  | 'recommendation_card'
  | 'agent_card'
  // Phase 7: form filling, table updates, and template completion. Each
  // event surfaces a typed proposal that the matching primitive renders
  // (FormFillCard / TableUpdateGrid / TemplateDraftCard / InlineSuggest).
  | 'form_fill'
  | 'table_update'
  | 'template_fill'
  | 'field_suggest';

export interface StreamEvent {
  type: StreamEventType;
  data: string;
}

export interface ConfirmActionPayload {
  toolCallId: string;
  toolName: string;
  description: string;
  args: Record<string, unknown>;
}

/**
 * Provenance pointer attached to every structured card. Used by
 * `<SourceCitations />` to deep-link back into the module the data lives in.
 */
export interface CardSource {
  /** Stable identifier for the deep link target (record id, query id, ...). */
  id: string;
  /** Short, human-readable label (e.g. "Site #103 — Mercy Health"). */
  label: string;
  /**
   * One of the recognized record kinds the UI knows how to deep-link.
   * Unknown kinds fall back to a plain badge with no link.
   */
  kind:
    | 'study'
    | 'site'
    | 'subject'
    | 'visit'
    | 'document'
    | 'financial_record'
    | 'task'
    | 'kri'
    | 'query'
    | 'agent_run'
    | 'document_chunk';
  /** Optional in-app href; if omitted, `<SourceCitations />` resolves it from `kind` + `id`. */
  href?: string;
  /** Optional excerpt shown in a popover when the citation is hovered. */
  excerpt?: string;
}

export type CardConfidence = 'high' | 'medium' | 'low';
export type CardSeverity = 'info' | 'warning' | 'critical' | 'positive';
export type ActionRiskLevel = 'safe' | 'reviewable' | 'destructive';

export interface InsightCardPayload {
  id: string;
  title: string;
  body: string;
  severity: CardSeverity;
  confidence: CardConfidence;
  /** Short rationale rendered in the "Why this?" popover. */
  whyThis?: string;
  /** Originating agent — feeds telemetry + audit. */
  agentId: string;
  agentVersion?: string;
  sources?: CardSource[];
  /** Numeric KPI delta if applicable (e.g., enrollment trend). */
  metric?: { label: string; value: string; delta?: string; deltaDirection?: 'up' | 'down' | 'flat' };
  /** ISO timestamp the underlying data was last refreshed. */
  generatedAt: string;
}

export interface ActionChipPayload {
  id: string;
  label: string;
  description?: string;
  agentId: string;
  agentVersion?: string;
  /** Tool name to invoke when the chip is run. Resolved against the agent's tool list. */
  tool: string;
  args?: Record<string, unknown>;
  /** Required role to run; UI hides or disables the chip otherwise. */
  requiredRole?: string;
  riskLevel: ActionRiskLevel;
  /** When true, chip flows through `<ApprovalFooter />` before commit. */
  requiresApproval: boolean;
  /** When true, additionally requires e-signature on Approve (Phase 5). */
  requiresESignature?: boolean;
  whyThis?: string;
  sources?: CardSource[];
  generatedAt: string;
}

export interface RecommendationCardPayload {
  id: string;
  title: string;
  rationale: string;
  agentId: string;
  agentVersion?: string;
  /** Optional one-click action chip surfaced under the recommendation. */
  action?: ActionChipPayload;
  confidence: CardConfidence;
  sources?: CardSource[];
  whyThis?: string;
  generatedAt: string;
}

export interface AgentCardPayload {
  id: string;
  name: string;
  description: string;
  /** True when the agent is the best fit for the current page context. */
  recommended: boolean;
  /** Why this agent was recommended (rendered in "Why this?"). */
  recommendationReason?: string;
  /** Module routes the agent is tuned for. */
  moduleContext: string[];
  agentVersion?: string;
}

/* ===================================================================== */
/* Phase 7 — form_fill / table_update / template_fill / field_suggest    */
/* ===================================================================== */

/**
 * One proposed value for a single field in a registered form. Each value
 * carries provenance and a confidence score so the UI can surface trust
 * affordances per field, not just per card.
 */
export interface FormFieldProposal {
  /** Dot-path within the target form schema (e.g., `sites.0.principal_investigator_name`). */
  path: string;
  /** Human-readable label (mirrors the form label) for accessibility. */
  label?: string;
  /** Proposed value (typed by the target Zod schema; serialized as JSON). */
  value: unknown;
  /** One-sentence explanation surfaced in the field's "Why this?" popover. */
  rationale?: string;
  confidence: CardConfidence;
  /** Where the value was extracted from. */
  sources?: CardSource[];
  /** True when the user must confirm before this value is filled (low confidence / regulated field). */
  requiresConfirmation?: boolean;
}

export interface FormFillPayload {
  id: string;
  /** Identifier from `lib/copilot/form-registry`. */
  schemaId: string;
  /** Human-readable name for the surface (e.g., "Site Activation"). */
  schemaLabel?: string;
  agentId: string;
  agentVersion?: string;
  fields: FormFieldProposal[];
  /** Field paths still missing values that the form's Zod schema marks required. */
  missingRequired: string[];
  /** Optional contextual scope so the UI can show what record this targets. */
  scope?: { kind: 'study' | 'site' | 'subject' | 'visit' | 'tracker' | 'global'; id?: string; label?: string };
  /** Documents used as the source of this proposal (for SourceCitations). */
  sourceDocumentIds?: string[];
  generatedAt: string;
  /** When true, accepting any field requires e-signature (regulated form). */
  requiresESignature?: boolean;
}

export type TableRowOpKind = 'insert' | 'update';

export interface TableRowProposal {
  op: TableRowOpKind;
  /** Optional matcher used to locate the existing row when `op === 'update'`. */
  match?: Record<string, string | number | null>;
  values: Record<string, unknown>;
  /** Per-row confidence; fields with their own confidence override this. */
  confidence: CardConfidence;
  /** Per-field confidence overrides (path → confidence). */
  fieldConfidence?: Record<string, CardConfidence>;
  sources?: CardSource[];
  /** Set when this row collides with an existing record by the table's natural key. */
  conflictWith?: { id: string; preview: Record<string, unknown> };
}

export interface TableUpdatePayload {
  id: string;
  /** Identifier of the registered table (e.g., `directory.contacts`). */
  tableId: string;
  tableLabel?: string;
  agentId: string;
  agentVersion?: string;
  ops: TableRowProposal[];
  /** Mapping confirmed for the source columns → target fields. */
  mapping?: Record<string, { fieldPath: string; confidence: CardConfidence }>;
  /** Number of duplicates found vs the existing dataset (echo of `ops[].conflictWith`). */
  conflictCount?: number;
  scope?: { kind: 'study' | 'site' | 'global'; id?: string; label?: string };
  sourceDocumentIds?: string[];
  generatedAt: string;
}

export type TemplateSectionKind = 'narrative' | 'structured' | 'placeholder';

export interface TemplateSectionProposal {
  id: string;
  label: string;
  kind: TemplateSectionKind;
  /** Markdown for `narrative`, JSON-stringified for `structured`, raw token name for `placeholder`. */
  content: string;
  /** Names of unresolved `{{placeholder}}` chips in this section. */
  placeholders?: string[];
  confidence: CardConfidence;
  sources?: CardSource[];
}

export interface TemplateFillPayload {
  id: string;
  templateId: string;
  templateLabel?: string;
  templateKind: 'visit_report' | 'capa' | 'letter' | 'exec_update' | 'custom';
  agentId: string;
  agentVersion?: string;
  sections: TemplateSectionProposal[];
  scope?: { kind: 'study' | 'site' | 'subject' | 'visit' | 'global'; id?: string; label?: string };
  sourceDocumentIds?: string[];
  generatedAt: string;
  requiresESignature?: boolean;
}

export interface FieldSuggestPayload {
  id: string;
  schemaId: string;
  fieldPath: string;
  fieldLabel?: string;
  value: unknown;
  rationale?: string;
  confidence: CardConfidence;
  sources?: CardSource[];
  agentId: string;
  agentVersion?: string;
  generatedAt: string;
}
