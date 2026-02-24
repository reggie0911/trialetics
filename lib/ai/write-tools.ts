import type { ToolDefinition, UserContext } from './types';

function requireCompany(ctx: UserContext): string {
  if (!ctx.companyId) throw new Error('No company context available');
  return ctx.companyId;
}

function requireWriteAccess(ctx: UserContext): void {
  if (ctx.userRole === 'viewer') {
    throw new Error('Insufficient permissions. Viewers cannot create or modify data.');
  }
}

export const writeToolDefinitions: Record<string, ToolDefinition> = {
  createActionItem: {
    name: 'createActionItem',
    description: 'Create a new action item with title, priority, and optional fields like due date, assignee, and protocol.',
    requiresConfirmation: true,
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the action item' },
        description: { type: 'string', description: 'Detailed description' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Priority level' },
        due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
        assigned_to_id: { type: 'string', description: 'Profile ID of the assignee' },
        protocol_id: { type: 'string', description: 'Protocol ID to associate with' },
        source_type: { type: 'string', enum: ['trip_report', 'monitoring', 'general', 'irb', 'vendor', 'kri'], description: 'Source type' },
        category: { type: 'string', description: 'Category label' },
      },
      required: ['title'],
    },
    handler: async (args, ctx) => {
      requireWriteAccess(ctx);
      const companyId = requireCompany(ctx);
      const { createActionItem } = await import('@/lib/actions/action-items');
      return createActionItem({ ...args, company_id: companyId } as any);
    },
  },

  updateActionItem: {
    name: 'updateActionItem',
    description: 'Update an existing action item by ID. Can change status, priority, assignee, due date, or add resolution notes.',
    requiresConfirmation: true,
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Action item ID to update' },
        title: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        assigned_to_id: { type: 'string', description: 'New assignee profile ID' },
        due_date: { type: 'string', description: 'New due date (YYYY-MM-DD)' },
        resolution_notes: { type: 'string' },
        escalated: { type: 'boolean' },
      },
      required: ['id'],
    },
    handler: async (args, ctx) => {
      requireWriteAccess(ctx);
      const { id, ...input } = args;
      const { updateActionItem } = await import('@/lib/actions/action-items');
      return updateActionItem(id as string, input as any);
    },
  },

  createTask: {
    name: 'createTask',
    description: 'Create a new task for a protocol with name, priority, assignee, and due date.',
    requiresConfirmation: true,
    parameters: {
      type: 'object',
      properties: {
        protocol_id: { type: 'string', description: 'Protocol ID (required)' },
        name: { type: 'string', description: 'Task name' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        assigned_to_id: { type: 'string', description: 'Assignee profile ID' },
        due_date: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
        planned_start_date: { type: 'string' },
        planned_end_date: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['protocol_id', 'name'],
    },
    handler: async (args, ctx) => {
      requireWriteAccess(ctx);
      const { createTask } = await import('@/lib/actions/tasks');
      return createTask(args as any);
    },
  },

  updateTask: {
    name: 'updateTask',
    description: 'Update an existing task by ID. Can change status, priority, assignee, or completion percentage.',
    requiresConfirmation: true,
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Task ID to update' },
        name: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', enum: ['planned', 'in_progress', 'completed', 'cancelled', 'on_hold'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        assigned_to_id: { type: 'string' },
        due_date: { type: 'string' },
        completion_percentage: { type: 'number', description: '0-100' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['id'],
    },
    handler: async (args, ctx) => {
      requireWriteAccess(ctx);
      const { id, ...input } = args;
      const { updateTask } = await import('@/lib/actions/tasks');
      return updateTask(id as string, input as any);
    },
  },

  createContact: {
    name: 'createContact',
    description: 'Create a new contact (investigator, coordinator, etc.) with name, email, title, and other details.',
    requiresConfirmation: true,
    parameters: {
      type: 'object',
      properties: {
        first_name: { type: 'string', description: 'First name (required)' },
        last_name: { type: 'string', description: 'Last name (required)' },
        email: { type: 'string' },
        phone: { type: 'string' },
        title: { type: 'string', description: 'Job title or role' },
        credentials: { type: 'string', description: 'Professional credentials' },
        primary_specialty: { type: 'string' },
        status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
        notes: { type: 'string' },
      },
      required: ['first_name', 'last_name'],
    },
    handler: async (args, ctx) => {
      requireWriteAccess(ctx);
      const companyId = requireCompany(ctx);
      const { createContact } = await import('@/lib/actions/contacts');
      return createContact(companyId, ctx.userId, '', args as any);
    },
  },

  updateContact: {
    name: 'updateContact',
    description: 'Update an existing contact by ID. Can change name, email, title, status, etc.',
    requiresConfirmation: true,
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Contact ID to update' },
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        title: { type: 'string' },
        credentials: { type: 'string' },
        primary_specialty: { type: 'string' },
        status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
        notes: { type: 'string' },
      },
      required: ['id'],
    },
    handler: async (args, ctx) => {
      requireWriteAccess(ctx);
      const { updateContact } = await import('@/lib/actions/contacts');
      return updateContact(args as any);
    },
  },

  createDeviation: {
    name: 'createDeviation',
    description: 'Create a new protocol deviation record with title, severity, and details.',
    requiresConfirmation: true,
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Deviation title (required)' },
        description: { type: 'string' },
        severity: { type: 'string', enum: ['minor', 'major', 'critical'] },
        protocol_id: { type: 'string' },
        site_id: { type: 'string' },
        subject_id: { type: 'string' },
        detected_date: { type: 'string', description: 'Date detected (YYYY-MM-DD)' },
        root_cause: { type: 'string' },
        impact_assessment: { type: 'string' },
      },
      required: ['title'],
    },
    handler: async (args, ctx) => {
      requireWriteAccess(ctx);
      const companyId = requireCompany(ctx);
      const { createDeviation } = await import('@/lib/actions/deviations');
      return createDeviation({ ...args, company_id: companyId } as any);
    },
  },

  updateDeviation: {
    name: 'updateDeviation',
    description: 'Update an existing deviation by ID. Can change status, severity, root cause, or impact assessment.',
    requiresConfirmation: true,
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Deviation ID to update' },
        title: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', enum: ['open', 'investigating', 'capa_required', 'capa_in_progress', 'closed'] },
        severity: { type: 'string', enum: ['minor', 'major', 'critical'] },
        root_cause: { type: 'string' },
        impact_assessment: { type: 'string' },
      },
      required: ['id'],
    },
    handler: async (args, ctx) => {
      requireWriteAccess(ctx);
      const { id, ...input } = args;
      const { updateDeviation } = await import('@/lib/actions/deviations');
      return updateDeviation(id as string, input as any);
    },
  },

  createCAPA: {
    name: 'createCAPA',
    description: 'Create a Corrective and Preventive Action (CAPA) linked to a deviation.',
    requiresConfirmation: true,
    parameters: {
      type: 'object',
      properties: {
        deviation_id: { type: 'string', description: 'Deviation ID to link (required)' },
        capa_type: { type: 'string', enum: ['corrective', 'preventive'], description: 'CAPA type (required)' },
        description: { type: 'string', description: 'Description of the action' },
        assigned_to_id: { type: 'string', description: 'Assignee profile ID' },
        due_date: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
      },
      required: ['deviation_id', 'capa_type', 'description'],
    },
    handler: async (args, ctx) => {
      requireWriteAccess(ctx);
      const { createCAPA } = await import('@/lib/actions/deviations');
      return createCAPA(args as any);
    },
  },
};
