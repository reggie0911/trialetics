'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  WorkflowRule,
  WorkflowExecutionLog,
  CreateWorkflowRuleInput,
} from '@/lib/types/workflows';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getWorkflowRules(
  companyId: string
): Promise<ActionResponse<WorkflowRule[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('workflow_rules')
      .select(`*, created_by:profiles!workflow_rules_created_by_id_fkey(id, first_name, last_name), actions:workflow_actions(*)`)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as WorkflowRule[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createWorkflowRule(
  input: CreateWorkflowRuleInput
): Promise<ActionResponse<WorkflowRule>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data: rule, error: ruleError } = await supabase
      .from('workflow_rules')
      .insert({
        company_id: profile.company_id,
        name: input.name,
        description: input.description ?? null,
        target_table: input.target_table,
        trigger_type: input.trigger_type,
        trigger_config: input.trigger_config,
        created_by_id: profile.id,
      })
      .select()
      .single();

    if (ruleError) return { success: false, error: ruleError.message };

    if (input.actions.length > 0) {
      const actionsToInsert = input.actions.map((a, i) => ({
        company_id: profile.company_id,
        rule_id: rule.id,
        action_type: a.action_type,
        action_config: a.action_config,
        sort_order: i,
      }));

      const { error: actionsError } = await supabase
        .from('workflow_actions')
        .insert(actionsToInsert);

      if (actionsError) {
        console.error('Error creating workflow actions:', actionsError);
      }
    }

    revalidatePath('/protected/workflows');
    return { success: true, data: rule as WorkflowRule };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function toggleWorkflowRule(
  ruleId: string,
  active: boolean
): Promise<ActionResponse<WorkflowRule>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('workflow_rules')
      .update({ active })
      .eq('id', ruleId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/workflows');
    return { success: true, data: data as WorkflowRule };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteWorkflowRule(ruleId: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('workflow_rules').delete().eq('id', ruleId);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/workflows');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getWorkflowExecutionLog(
  companyId: string,
  ruleId?: string,
  page: number = 1,
  pageSize: number = 50
): Promise<ActionResponse<{ entries: WorkflowExecutionLog[]; total: number }>> {
  try {
    const supabase = await createClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('workflow_execution_log')
      .select(`*, rule:workflow_rules(id, name)`, { count: 'exact' })
      .eq('company_id', companyId);

    if (ruleId) query = query.eq('rule_id', ruleId);

    const { data, error, count } = await query
      .order('executed_at', { ascending: false })
      .range(from, to);

    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: { entries: (data || []) as WorkflowExecutionLog[], total: count || 0 },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
