'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type { WorkflowRule, WorkflowExecutionLog, CreateWorkflowRuleInput } from '@/lib/types/workflows';

async function getProfile(): Promise<{ id: string; company_id: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('id, company_id').eq('user_id', user.id).single();
  return data ?? null;
}

export async function getWorkflowRules(
  companyId: string
): Promise<{ success: boolean; data?: WorkflowRule[]; error?: string }> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('workflow_rules')
      .select('id, company_id, name, description, active, target_table, trigger_type, trigger_config, created_by_id, created_at, updated_at, created_by:profiles!workflow_rules_created_by_id_fkey(id, first_name, last_name), actions:workflow_actions(id, company_id, rule_id, action_type, action_config, sort_order, created_at)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as unknown as WorkflowRule[]) ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createWorkflowRule(
  input: CreateWorkflowRuleInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const profile = await getProfile();
    if (!profile) return { success: false, error: 'Not authenticated' };

    const { data: rule, error: ruleError } = await supabase
      .from('workflow_rules')
      .insert({
        company_id: profile.company_id,
        name: input.name,
        description: input.description ?? null,
        target_table: input.target_table,
        trigger_type: input.trigger_type,
        trigger_config: input.trigger_config,
        active: true,
        created_by_id: profile.id,
      })
      .select('id')
      .single();

    if (ruleError || !rule) return { success: false, error: ruleError?.message ?? 'Failed to create rule' };

    if (input.actions.length > 0) {
      const { error: actionsError } = await supabase.from('workflow_actions').insert(
        input.actions.map((a, i) => ({
          company_id: profile.company_id,
          rule_id: rule.id,
          action_type: a.action_type,
          action_config: a.action_config,
          sort_order: i,
        }))
      );
      if (actionsError) return { success: false, error: actionsError.message };
    }

    revalidatePath('/protected/workflows');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function toggleWorkflowRule(
  id: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('workflow_rules').update({ active }).eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/workflows');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function deleteWorkflowRule(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('workflow_rules').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/workflows');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getWorkflowExecutionLog(
  companyId: string,
  ruleId?: string
): Promise<{ success: boolean; data?: { entries: WorkflowExecutionLog[]; total: number }; error?: string }> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('workflow_execution_logs')
      .select('id, company_id, rule_id, trigger_record_id, trigger_table, status, actions_executed, error_message, executed_at, rule:workflow_rules(id, name)', { count: 'exact' })
      .eq('company_id', companyId)
      .order('executed_at', { ascending: false })
      .limit(100);

    if (ruleId) query = query.eq('rule_id', ruleId);
    const { data, error, count } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: { entries: (data as unknown as WorkflowExecutionLog[]) ?? [], total: count ?? 0 } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
