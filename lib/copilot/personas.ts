import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { recordAudit } from './audit';

/**
 * Per-user persona overrides for the Copilot.
 *
 * A persona is a small bag of preferences that subtly shifts how the Copilot
 * speaks and what it surfaces:
 *
 *   - tone:       'concise' | 'balanced' | 'detailed'
 *   - role:       'CRA' | 'PM' | 'CRO_LEAD' | 'EXEC' | 'BIOSTAT' | ...
 *   - timezone:   IANA TZ string ('America/Chicago')
 *   - units:      'imperial' | 'metric'
 *   - guardrails: explicit text the user wants the Copilot to honor
 *                 ("never propose actions on Friday afternoons")
 *
 * Personas never override regulatory guardrails (no PHI in prompts, no
 * unsigned drafts in approved outputs); they only modulate style and surface.
 */

export type CopilotTone = 'concise' | 'balanced' | 'detailed';
export type CopilotUnits = 'imperial' | 'metric';

export interface CopilotPersona {
  id: string;
  userId: string;
  companyId: string;
  name: string;
  isActive: boolean;
  role: string | null;
  tone: CopilotTone;
  timezone: string | null;
  units: CopilotUnits;
  guardrails: string[];
  preferredAgents: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_PERSONA: Omit<CopilotPersona, 'id' | 'userId' | 'companyId' | 'createdAt' | 'updatedAt'> = {
  name: 'Default',
  isActive: true,
  role: null,
  tone: 'balanced',
  timezone: null,
  units: 'metric',
  guardrails: [],
  preferredAgents: [],
  metadata: {},
};

function rowToPersona(row: Record<string, unknown>): CopilotPersona {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    companyId: row.company_id as string,
    name: row.name as string,
    isActive: !!row.is_active,
    role: (row.role as string | null) ?? null,
    tone: (row.tone as CopilotTone) ?? 'balanced',
    timezone: (row.timezone as string | null) ?? null,
    units: (row.units as CopilotUnits) ?? 'metric',
    guardrails: (row.guardrails as string[] | null) ?? [],
    preferredAgents: (row.preferred_agents as string[] | null) ?? [],
    metadata: ((row.metadata as Record<string, unknown> | null) ?? {}),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listPersonas(
  supabase: SupabaseClient,
  userId: string,
  companyId: string
): Promise<CopilotPersona[]> {
  const { data, error } = await supabase
    .from('copilot_personas')
    .select('*')
    .eq('user_id', userId)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('[copilot/personas] listPersonas failed', error.message);
    return [];
  }
  if ((data ?? []).length > 0) return data!.map(rowToPersona);

  // Materialize the default persona on first read so the user always has one.
  const { data: inserted } = await supabase
    .from('copilot_personas')
    .insert({
      user_id: userId,
      company_id: companyId,
      ...{
        name: DEFAULT_PERSONA.name,
        is_active: true,
        role: DEFAULT_PERSONA.role,
        tone: DEFAULT_PERSONA.tone,
        timezone: DEFAULT_PERSONA.timezone,
        units: DEFAULT_PERSONA.units,
        guardrails: DEFAULT_PERSONA.guardrails,
        preferred_agents: DEFAULT_PERSONA.preferredAgents,
        metadata: DEFAULT_PERSONA.metadata,
      },
    })
    .select('*')
    .single();
  return inserted ? [rowToPersona(inserted)] : [];
}

export async function getActivePersona(
  supabase: SupabaseClient,
  userId: string,
  companyId: string
): Promise<CopilotPersona | null> {
  const personas = await listPersonas(supabase, userId, companyId);
  return personas.find(p => p.isActive) ?? personas[0] ?? null;
}

export interface UpsertPersonaParams {
  id?: string;
  userId: string;
  companyId: string;
  name: string;
  isActive?: boolean;
  role?: string | null;
  tone?: CopilotTone;
  timezone?: string | null;
  units?: CopilotUnits;
  guardrails?: string[];
  preferredAgents?: string[];
  metadata?: Record<string, unknown>;
}

export async function upsertPersona(
  supabase: SupabaseClient,
  params: UpsertPersonaParams
): Promise<CopilotPersona | null> {
  const payload: Record<string, unknown> = {
    user_id: params.userId,
    company_id: params.companyId,
    name: params.name,
    is_active: params.isActive ?? false,
    role: params.role ?? null,
    tone: params.tone ?? 'balanced',
    timezone: params.timezone ?? null,
    units: params.units ?? 'metric',
    guardrails: params.guardrails ?? [],
    preferred_agents: params.preferredAgents ?? [],
    metadata: params.metadata ?? {},
  };

  let row: Record<string, unknown> | null = null;
  if (params.id) {
    const { data } = await supabase
      .from('copilot_personas')
      .update(payload)
      .eq('id', params.id)
      .eq('user_id', params.userId)
      .select('*')
      .single();
    row = data as Record<string, unknown> | null;
  } else {
    const { data } = await supabase
      .from('copilot_personas')
      .insert(payload)
      .select('*')
      .single();
    row = data as Record<string, unknown> | null;
  }
  if (!row) return null;

  if (payload.is_active === true) {
    await supabase
      .from('copilot_personas')
      .update({ is_active: false })
      .eq('user_id', params.userId)
      .neq('id', row.id as string);
  }

  await recordAudit(supabase, {
    userId: params.userId,
    companyId: params.companyId,
    agentId: 'persona',
    agentVersion: '1.0.0',
    action: params.id ? 'persona_updated' : 'persona_created',
    resourceKind: 'copilot_persona',
    resourceId: row.id as string,
    details: { name: params.name, role: params.role, tone: params.tone },
  });

  return rowToPersona(row);
}

export async function activatePersona(
  supabase: SupabaseClient,
  personaId: string,
  userId: string,
  companyId: string
): Promise<CopilotPersona | null> {
  await supabase
    .from('copilot_personas')
    .update({ is_active: false })
    .eq('user_id', userId);

  const { data: updated, error } = await supabase
    .from('copilot_personas')
    .update({ is_active: true })
    .eq('id', personaId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !updated) return null;

  await recordAudit(supabase, {
    userId,
    companyId,
    agentId: 'persona',
    agentVersion: '1.0.0',
    action: 'persona_activated',
    resourceKind: 'copilot_persona',
    resourceId: personaId,
  });
  return rowToPersona(updated);
}

/**
 * Build the persona-flavored snippet to prepend to an agent system prompt.
 * Kept short on purpose so it doesn't crowd the agent's instructions.
 */
export function personaPromptSnippet(persona: CopilotPersona | null): string {
  if (!persona) return '';
  const lines: string[] = ['User persona preferences:'];
  if (persona.role) lines.push(`- Role: ${persona.role}`);
  lines.push(`- Tone: ${persona.tone}`);
  lines.push(`- Units: ${persona.units}`);
  if (persona.timezone) lines.push(`- Timezone: ${persona.timezone}`);
  if (persona.guardrails.length) {
    lines.push('- Personal guardrails:');
    for (const g of persona.guardrails.slice(0, 5)) lines.push(`  • ${g}`);
  }
  lines.push('Match this style without overriding regulatory or safety guardrails.');
  return lines.join('\n');
}
