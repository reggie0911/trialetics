import { z } from 'zod';

import { registerCopilotForm } from '../base';

/**
 * Mirrors `visitSchema` from `visits-tab.tsx` (the per-study scheduled
 * monitoring visit, distinct from the visit-report flow handled by the
 * `monitoring-visit` registration). Lets the Copilot bulk-import a
 * monitoring plan or schedule grid into the visits table.
 */
export const visitScheduleFormSchema = z.object({
  site_id: z.string().min(1, 'Site is required'),
  visit_type: z.string().min(1, 'Visit type is required'),
  planned_date: z.string().optional(),
  actual_date: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

registerCopilotForm({
  id: 'ctms.visit-schedule',
  label: 'Visit schedule',
  description: 'Plan a monitoring visit from a sponsor schedule grid or monitoring plan extract.',
  scope: 'visit',
  schema: visitScheduleFormSchema,
  defaultAgentId: 'form-filler',
  contextHint:
    'Drop a monitoring plan or schedule sheet — the Copilot maps visit types, dates, and sites.',
  hints: [
    { path: 'site_id', label: 'Site', synonyms: ['Site', 'Site Number', 'Site #'] },
    { path: 'visit_type', label: 'Visit type', synonyms: ['Visit Type', 'Type', 'Monitoring Type'] },
    { path: 'planned_date', label: 'Planned date', synonyms: ['Scheduled Date', 'Visit Date', 'Planned Visit'] },
    { path: 'actual_date', label: 'Actual date', synonyms: ['Date Completed', 'Actual Visit Date'] },
    { path: 'status', label: 'Status', synonyms: ['Visit Status'] },
    { path: 'notes', label: 'Notes', synonyms: ['Comments', 'Visit Notes'] },
  ],
});
