'use server';

import { createClient } from '@/lib/server';
import type { WorkflowRule, WorkflowAction, TriggerConfig } from '@/lib/types/workflows';
import { executeWorkflowAction } from './action-executor';

export async function evaluateWorkflowRules(
  companyId: string,
  tableName: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  oldRecord: Record<string, unknown> | null,
  newRecord: Record<string, unknown> | null
): Promise<void> {
  try {
    const supabase = await createClient();

    const triggerTypes: string[] = [];
    if (action === 'INSERT') triggerTypes.push('record_created');
    if (action === 'UPDATE') {
      triggerTypes.push('record_updated');
      if (oldRecord && newRecord && oldRecord.status !== newRecord.status) {
        triggerTypes.push('status_changed');
      }
    }

    if (triggerTypes.length === 0) return;

    const { data: rules, error } = await supabase
      .from('workflow_rules')
      .select('*, actions:workflow_actions(*)')
      .eq('company_id', companyId)
      .eq('target_table', tableName)
      .eq('active', true)
      .in('trigger_type', triggerTypes)
      .order('created_at');

    if (error || !rules || rules.length === 0) return;

    for (const rule of rules as (WorkflowRule & { actions: WorkflowAction[] })[]) {
      const matches = evaluateConditions(rule.trigger_config, action, oldRecord, newRecord);

      if (!matches) {
        await supabase.from('workflow_execution_log').insert({
          company_id: companyId,
          rule_id: rule.id,
          trigger_record_id: (newRecord?.id || oldRecord?.id) as string,
          trigger_table: tableName,
          status: 'skipped',
          actions_executed: [],
        });
        continue;
      }

      const actionsExecuted: Record<string, unknown>[] = [];
      let hasError = false;
      let errorMessage = '';

      const sortedActions = (rule.actions || []).sort((a, b) => a.sort_order - b.sort_order);

      for (const wfAction of sortedActions) {
        try {
          await executeWorkflowAction(companyId, wfAction, newRecord || oldRecord);
          actionsExecuted.push({
            action_type: wfAction.action_type,
            status: 'success',
          });
        } catch (err) {
          hasError = true;
          errorMessage = err instanceof Error ? err.message : 'Unknown error';
          actionsExecuted.push({
            action_type: wfAction.action_type,
            status: 'failed',
            error: errorMessage,
          });
        }
      }

      await supabase.from('workflow_execution_log').insert({
        company_id: companyId,
        rule_id: rule.id,
        trigger_record_id: (newRecord?.id || oldRecord?.id) as string,
        trigger_table: tableName,
        status: hasError ? 'failed' : 'success',
        actions_executed: actionsExecuted,
        error_message: hasError ? errorMessage : null,
      });
    }
  } catch (err) {
    console.error('Workflow evaluation error:', err);
  }
}

function evaluateConditions(
  config: TriggerConfig,
  action: string,
  oldRecord: Record<string, unknown> | null,
  newRecord: Record<string, unknown> | null
): boolean {
  if (!config.field) return true;

  const newVal = String(newRecord?.[config.field] ?? '');
  const oldVal = String(oldRecord?.[config.field] ?? '');

  if (config.new_value !== undefined) {
    switch (config.condition) {
      case 'equals':
        return newVal === config.new_value;
      case 'not_equals':
        return newVal !== config.new_value;
      case 'contains':
        return newVal.includes(config.new_value);
      default:
        return newVal === config.new_value;
    }
  }

  if (config.old_value !== undefined && config.new_value !== undefined) {
    return oldVal === config.old_value && newVal === config.new_value;
  }

  return true;
}
