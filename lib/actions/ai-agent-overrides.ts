'use server';

import { createClient } from '@/lib/server';

export interface AgentOverride {
  id: string;
  agent_id: string;
  persona: string | null;
  task_instructions: string | null;
  created_at: string;
  updated_at: string;
}

export async function listAgentOverrides(): Promise<AgentOverride[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('ai_agent_overrides')
    .select('id, agent_id, persona, task_instructions, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as AgentOverride[];
}

export async function getAgentOverride(agentId: string): Promise<AgentOverride | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('ai_agent_overrides')
    .select('id, agent_id, persona, task_instructions, created_at, updated_at')
    .eq('user_id', user.id)
    .eq('agent_id', agentId)
    .single();

  if (error) return null;
  return data as AgentOverride;
}

export interface UpsertAgentOverrideInput {
  agentId: string;
  persona?: string | null;
  taskInstructions?: string | null;
}

export async function upsertAgentOverride(input: UpsertAgentOverrideInput): Promise<AgentOverride> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single();

  const { data, error } = await supabase
    .from('ai_agent_overrides')
    .upsert(
      {
        user_id: user.id,
        company_id: profile?.company_id || null,
        agent_id: input.agentId,
        persona: input.persona ?? null,
        task_instructions: input.taskInstructions ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,agent_id' }
    )
    .select('id, agent_id, persona, task_instructions, created_at, updated_at')
    .single();

  if (error) throw new Error(error.message);
  return data as AgentOverride;
}

export async function deleteAgentOverride(agentId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('ai_agent_overrides')
    .delete()
    .eq('agent_id', agentId)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
}
