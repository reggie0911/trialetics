import { randomUUID } from 'crypto';

import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { recordAudit } from '@/lib/copilot/audit';
import type { TemplateFillPayload, TemplateSectionProposal, CardConfidence } from '@/lib/ai/types';

/**
 * Templates store + deterministic template-fill builder.
 *
 * Templates are reusable section structures (visit report, CAPA, letter,
 * exec update, custom). The `template-completer` agent calls into this
 * builder to assemble the final `template_fill` payload after producing
 * narrative section text.
 */

export type TemplateKind = 'visit_report' | 'capa' | 'letter' | 'exec_update' | 'custom';

export interface TemplateSectionDefinition {
  id: string;
  label: string;
  kind: 'narrative' | 'structured' | 'placeholder';
  guidance?: string;
  /** Optional free-text placeholders the user must fill themselves. */
  placeholders?: string[];
}

export interface TemplateRecord {
  id: string;
  companyId: string;
  userId: string | null;
  name: string;
  description: string | null;
  kind: TemplateKind;
  sections: TemplateSectionDefinition[];
  studyScope: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

function rowToTemplate(row: Record<string, unknown>): TemplateRecord {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    userId: (row.user_id as string | null) ?? null,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    kind: row.kind as TemplateKind,
    sections: (row.sections as TemplateSectionDefinition[]) ?? [],
    studyScope: (row.study_scope as string | null) ?? null,
    version: (row.version as number) ?? 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function createTemplate(
  supabase: SupabaseClient,
  input: {
    companyId: string;
    userId: string;
    name: string;
    description?: string;
    kind: TemplateKind;
    sections: TemplateSectionDefinition[];
    studyScope?: string;
  }
): Promise<TemplateRecord | null> {
  const { data, error } = await supabase
    .from('copilot_templates')
    .insert({
      company_id: input.companyId,
      user_id: input.userId,
      name: input.name,
      description: input.description ?? null,
      kind: input.kind,
      sections: input.sections,
      study_scope: input.studyScope ?? null,
    })
    .select('*')
    .maybeSingle();

  if (error || !data) {
    console.warn('[copilot/templates] create failed', error?.message);
    return null;
  }

  await recordAudit(supabase, {
    userId: input.userId,
    companyId: input.companyId,
    agentId: 'template-completer',
    action: 'template_created',
    resourceKind: 'template',
    resourceId: data.id as string,
  });

  return rowToTemplate(data as Record<string, unknown>);
}

export async function listTemplates(
  supabase: SupabaseClient,
  companyId: string,
  options: { kind?: TemplateKind; limit?: number } = {}
): Promise<TemplateRecord[]> {
  let query = supabase
    .from('copilot_templates')
    .select('*')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(Math.min(options.limit ?? 50, 200));
  if (options.kind) query = query.eq('kind', options.kind);
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToTemplate);
}

export async function getTemplate(
  supabase: SupabaseClient,
  templateId: string
): Promise<TemplateRecord | null> {
  const { data, error } = await supabase
    .from('copilot_templates')
    .select('*')
    .eq('id', templateId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error || !data) return null;
  return rowToTemplate(data as Record<string, unknown>);
}

/**
 * Built-in template definitions — seeded once into `copilot_templates` per
 * company by the demo seeder, but also available in code so the
 * template-completer agent can fall back to them when no DB template
 * matches.
 */
export const BUILTIN_TEMPLATES: Record<string, { name: string; kind: TemplateKind; sections: TemplateSectionDefinition[] }> = {
  'builtin.visit-report': {
    name: 'Monitoring visit report',
    kind: 'visit_report',
    sections: [
      { id: 'visit-summary', label: 'Visit summary', kind: 'narrative', guidance: 'One paragraph: type, date, attendees, scope.' },
      { id: 'enrollment-status', label: 'Enrollment status', kind: 'structured' },
      { id: 'protocol-deviations', label: 'Protocol deviations', kind: 'narrative' },
      { id: 'source-data-verification', label: 'Source data verification', kind: 'structured' },
      { id: 'investigational-product', label: 'Investigational product', kind: 'narrative' },
      { id: 'open-action-items', label: 'Open action items', kind: 'structured' },
      { id: 'next-steps', label: 'Next steps', kind: 'narrative' },
      { id: 'monitor-signature', label: 'Monitor signature', kind: 'placeholder', placeholders: ['monitor_name', 'monitor_signature_date'] },
    ],
  },
  'builtin.capa': {
    name: 'CAPA template',
    kind: 'capa',
    sections: [
      { id: 'background', label: 'Background', kind: 'narrative' },
      { id: 'root-cause', label: 'Root cause analysis', kind: 'narrative' },
      { id: 'impact-assessment', label: 'Impact assessment', kind: 'narrative' },
      { id: 'corrective-action', label: 'Corrective action plan', kind: 'narrative' },
      { id: 'preventive-action', label: 'Preventive action plan', kind: 'narrative' },
      { id: 'effectiveness-check', label: 'Effectiveness check', kind: 'narrative' },
      { id: 'approval', label: 'Approval', kind: 'placeholder', placeholders: ['quality_approver', 'approval_date'] },
    ],
  },
  'builtin.follow-up-letter': {
    name: 'Site follow-up letter',
    kind: 'letter',
    sections: [
      { id: 'salutation', label: 'Salutation', kind: 'placeholder', placeholders: ['site_pi_name'] },
      { id: 'visit-context', label: 'Visit context', kind: 'narrative' },
      { id: 'findings-summary', label: 'Findings summary', kind: 'narrative' },
      { id: 'open-actions', label: 'Open action items', kind: 'structured' },
      { id: 'closing', label: 'Closing', kind: 'narrative' },
      { id: 'sign-off', label: 'Sign-off', kind: 'placeholder', placeholders: ['monitor_name', 'monitor_title'] },
    ],
  },
  'builtin.exec-update': {
    name: 'Executive update',
    kind: 'exec_update',
    sections: [
      { id: 'headline', label: 'Headline', kind: 'narrative' },
      { id: 'kpi-snapshot', label: 'KPI snapshot', kind: 'structured' },
      { id: 'risks', label: 'Risks and mitigations', kind: 'narrative' },
      { id: 'asks', label: 'Asks', kind: 'narrative' },
    ],
  },
};

interface BuildTemplateFillOptions {
  templateId: string;
  templateLabel?: string;
  templateKind: TemplateKind;
  agentId: string;
  agentVersion?: string;
  scope?: TemplateFillPayload['scope'];
  sourceDocumentIds?: string[];
  requiresESignature?: boolean;
  /** Section id → drafted content (markdown for narrative, JSON for structured). */
  draftedContent: Record<string, { content: string; confidence?: number; placeholders?: string[] }>;
  /** Template definition (sections to render). */
  sections: TemplateSectionDefinition[];
}

function numberToConfidence(n?: number): CardConfidence {
  if (n == null) return 'medium';
  if (n >= 0.85) return 'high';
  if (n >= 0.6) return 'medium';
  return 'low';
}

/** Assemble the final TemplateFillPayload from drafted section content. */
export function buildTemplateFill(options: BuildTemplateFillOptions): TemplateFillPayload {
  const sections: TemplateSectionProposal[] = options.sections.map(section => {
    const drafted = options.draftedContent[section.id];
    if (!drafted) {
      return {
        id: section.id,
        label: section.label,
        kind: section.kind,
        content: '',
        placeholders: section.placeholders,
        confidence: 'low',
      };
    }
    return {
      id: section.id,
      label: section.label,
      kind: section.kind,
      content: drafted.content,
      placeholders: drafted.placeholders ?? section.placeholders,
      confidence: numberToConfidence(drafted.confidence),
    };
  });

  return {
    id: randomUUID(),
    templateId: options.templateId,
    templateLabel: options.templateLabel,
    templateKind: options.templateKind,
    agentId: options.agentId,
    agentVersion: options.agentVersion,
    sections,
    scope: options.scope,
    sourceDocumentIds: options.sourceDocumentIds,
    generatedAt: new Date().toISOString(),
    requiresESignature: options.requiresESignature,
  };
}
