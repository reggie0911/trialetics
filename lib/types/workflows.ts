export type WorkflowTriggerType = 'record_created' | 'record_updated' | 'status_changed' | 'date_reached' | 'manual';
export type WorkflowActionType = 'send_notification' | 'create_action_item' | 'update_field' | 'send_email' | 'assign_task';
export type WorkflowExecutionStatus = 'success' | 'failed' | 'skipped';

export const WORKFLOW_TRIGGER_LABELS: Record<WorkflowTriggerType, string> = {
  record_created: 'Record Created',
  record_updated: 'Record Updated',
  status_changed: 'Status Changed',
  date_reached: 'Date Reached',
  manual: 'Manual Trigger',
};

export const WORKFLOW_ACTION_LABELS: Record<WorkflowActionType, string> = {
  send_notification: 'Send Notification',
  create_action_item: 'Create Action Item',
  update_field: 'Update Field',
  send_email: 'Send Email',
  assign_task: 'Assign Task',
};

export const WORKFLOW_TARGET_TABLES = [
  { value: 'deviations', label: 'Deviations' },
  { value: 'action_items', label: 'Action Items' },
  { value: 'protocol_tasks', label: 'Tasks' },
  { value: 'clinical_protocols', label: 'Protocols' },
  { value: 'subjects', label: 'Subjects' },
  { value: 'site_contracts', label: 'Site Contracts' },
  { value: 'payment_records', label: 'Payments' },
] as const;

export interface TriggerConfig {
  field?: string;
  old_value?: string;
  new_value?: string;
  condition?: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
}

export interface ActionConfig {
  recipient_id?: string;
  message?: string;
  title?: string;
  priority?: string;
  field_name?: string;
  field_value?: string;
  email_template_id?: string;
  assigned_to_id?: string;
}

export interface WorkflowRule {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  active: boolean;
  target_table: string;
  trigger_type: WorkflowTriggerType;
  trigger_config: TriggerConfig;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  created_by?: { id: string; first_name: string | null; last_name: string | null } | null;
  actions?: WorkflowAction[];
}

export interface WorkflowAction {
  id: string;
  company_id: string;
  rule_id: string;
  action_type: WorkflowActionType;
  action_config: ActionConfig;
  sort_order: number;
  created_at: string;
}

export interface WorkflowExecutionLog {
  id: string;
  company_id: string;
  rule_id: string;
  trigger_record_id: string | null;
  trigger_table: string | null;
  status: WorkflowExecutionStatus;
  actions_executed: Record<string, unknown>[] | null;
  error_message: string | null;
  executed_at: string;
  rule?: { id: string; name: string } | null;
}

export interface CreateWorkflowRuleInput {
  name: string;
  description?: string;
  target_table: string;
  trigger_type: WorkflowTriggerType;
  trigger_config: TriggerConfig;
  actions: { action_type: WorkflowActionType; action_config: ActionConfig }[];
}
