'use server';

import { createClient } from '@/lib/server';
import type { WorkflowAction } from '@/lib/types/workflows';

export async function executeWorkflowAction(
  companyId: string,
  action: WorkflowAction,
  triggerRecord: Record<string, unknown> | null
): Promise<void> {
  const supabase = await createClient();
  const config = action.action_config;

  switch (action.action_type) {
    case 'send_notification':
      // Task notifications removed; no-op for backwards compatibility
      break;

    case 'create_action_item': {
      await supabase.from('action_items').insert({
        company_id: companyId,
        title: config.title || `Auto: Action from workflow`,
        description: config.message || null,
        priority: config.priority || 'medium',
        source_type: 'general',
        source_id: triggerRecord?.id as string,
        protocol_id: (triggerRecord?.protocol_id as string) || null,
      });
      break;
    }

    case 'update_field': {
      if (!config.field_name || config.field_value === undefined || !triggerRecord?.id) return;
      const tableName = action.action_config.field_name?.split('.')[0];
      if (!tableName) return;
      await supabase
        .from(tableName)
        .update({ [config.field_name]: config.field_value })
        .eq('id', triggerRecord.id as string);
      break;
    }

    case 'send_email': {
      console.log(`[Workflow] Email action triggered for record ${triggerRecord?.id}, template: ${config.email_template_id}`);
      break;
    }

    default:
      // assign_task and other removed action types; no-op for backwards compatibility
      break;
  }
}
