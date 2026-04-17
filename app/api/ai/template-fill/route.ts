import { NextRequest } from 'next/server';

import { createClient } from '@/lib/server';
import { recordAudit } from '@/lib/copilot/audit';
import {
  BUILTIN_TEMPLATES,
  buildTemplateFill,
  getTemplate,
  listTemplates,
  type TemplateKind,
  type TemplateSectionDefinition,
} from '@/lib/copilot/form-bridge/template-builder';
import { createProposal, recordFieldAudit, setProposalStatus } from '@/lib/copilot/form-bridge/proposal-store';
import type { TemplateFillPayload } from '@/lib/ai/types';

/**
 * GET  /api/ai/template-fill?kind=visit_report&include_builtin=1
 * POST /api/ai/template-fill        body: { templateId, scope?, draftedContent, sourceDocumentIds?, persistAsProposal? }
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!profile?.company_id) return json({ error: 'No company context' }, 400);

    const url = new URL(request.url);
    const kind = url.searchParams.get('kind') as TemplateKind | null;
    const includeBuiltin = url.searchParams.get('include_builtin') !== '0';

    const records = await listTemplates(supabase, profile.company_id, { kind: kind ?? undefined });
    const dbTemplates = records.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      kind: t.kind,
      sections: t.sections,
      isBuiltin: false,
    }));

    let builtins: ReturnType<typeof toBuiltin>[] = [];
    if (includeBuiltin) {
      builtins = Object.entries(BUILTIN_TEMPLATES)
        .filter(([, def]) => !kind || def.kind === kind)
        .map(([id, def]) => toBuiltin(id, def));
    }

    return json({ templates: [...builtins, ...dbTemplates] }, 200);
  } catch (err) {
    console.error('GET /api/ai/template-fill failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

function toBuiltin(id: string, def: { name: string; kind: TemplateKind; sections: TemplateSectionDefinition[] }) {
  return {
    id,
    name: def.name,
    description: 'Built-in template',
    kind: def.kind,
    sections: def.sections,
    isBuiltin: true,
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!profile?.company_id) return json({ error: 'No company context' }, 400);

    const body = (await request.json().catch(() => null)) as {
      templateId?: string;
      scope?: TemplateFillPayload['scope'];
      draftedContent?: Record<string, { content: string; confidence?: number; placeholders?: string[] }>;
      sourceDocumentIds?: string[];
      persistAsProposal?: boolean;
      requiresESignature?: boolean;
    } | null;

    if (!body?.templateId || !body.draftedContent) {
      return json({ error: 'templateId and draftedContent are required' }, 400);
    }

    let templateLabel: string | undefined;
    let templateKind: TemplateKind = 'custom';
    let sections: TemplateSectionDefinition[] = [];

    const builtin = BUILTIN_TEMPLATES[body.templateId];
    if (builtin) {
      templateLabel = builtin.name;
      templateKind = builtin.kind;
      sections = builtin.sections;
    } else {
      const dbTemplate = await getTemplate(supabase, body.templateId);
      if (!dbTemplate) return json({ error: `Unknown template: ${body.templateId}` }, 404);
      templateLabel = dbTemplate.name;
      templateKind = dbTemplate.kind;
      sections = dbTemplate.sections;
    }

    const payload = buildTemplateFill({
      templateId: body.templateId,
      templateLabel,
      templateKind,
      agentId: 'template-completer',
      agentVersion: '1.0.0',
      scope: body.scope,
      sourceDocumentIds: body.sourceDocumentIds,
      requiresESignature: body.requiresESignature,
      draftedContent: body.draftedContent,
      sections,
    });

    let proposalId: string | undefined;
    if (body.persistAsProposal !== false) {
      const proposal = await createProposal(supabase, {
        companyId: profile.company_id,
        userId: user.id,
        kind: 'template_fill',
        targetId: body.templateId,
        scopeKind: body.scope?.kind ?? null,
        scopeId: body.scope?.id ?? null,
        payload,
        sourceDocumentIds: body.sourceDocumentIds ?? [],
        agentId: payload.agentId,
        agentVersion: payload.agentVersion,
      });
      if (proposal) proposalId = proposal.id;
    }

    await recordAudit(supabase, {
      userId: user.id,
      companyId: profile.company_id,
      agentId: 'template-completer',
      action: 'template_drafted',
      resourceKind: 'template_fill',
      resourceId: body.templateId,
      details: { proposal_id: proposalId ?? null, sections: payload.sections.length },
    });

    return json({ payload, proposalId }, 200);
  } catch (err) {
    console.error('POST /api/ai/template-fill failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

/**
 * PATCH /api/ai/template-fill — accept a drafted template. Body:
 *   {
 *     proposalId?,
 *     templateId,
 *     sections: { id, content, sources? }[],
 *     reason?,
 *     eSignatureId?,
 *   }
 *
 * Records per-section audit entries and marks the proposal as accepted.
 * The destination write (e.g. saving the report into eTMF or sending an
 * email) is the host page's responsibility.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!profile?.company_id) return json({ error: 'No company context' }, 400);

    const body = (await request.json().catch(() => null)) as {
      proposalId?: string | null;
      templateId?: string;
      sections?: { id: string; content: string; sources?: unknown[] }[];
      reason?: string;
      eSignatureId?: string;
    } | null;

    if (!body?.templateId || !Array.isArray(body.sections)) {
      return json({ error: 'templateId and sections are required' }, 400);
    }

    const inserted = await recordFieldAudit(
      supabase,
      body.sections.map(section => ({
        companyId: profile.company_id!,
        userId: user.id,
        proposalId: body.proposalId ?? null,
        kind: 'template_fill' as const,
        targetId: body.templateId!,
        fieldPath: `section.${section.id}`,
        afterValue: section.content,
        sourceRefs: section.sources ?? [],
        reasonForChange: body.reason,
        eSignatureId: body.eSignatureId,
        agentId: 'template-completer',
      }))
    );

    if (body.proposalId) {
      await setProposalStatus(supabase, body.proposalId, user.id, 'accepted');
    }

    await recordAudit(supabase, {
      userId: user.id,
      companyId: profile.company_id,
      agentId: 'template-completer',
      action: 'template_fill_accepted',
      resourceKind: 'template_fill',
      resourceId: body.templateId,
      details: {
        sections_audited: inserted,
        proposal_id: body.proposalId ?? null,
      },
    });

    return json({ accepted: inserted }, 200);
  } catch (err) {
    console.error('PATCH /api/ai/template-fill failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
