import { z } from 'zod';

import { registerCopilotForm } from '../base';

/**
 * CAPA (Corrective and Preventive Action) — regulated form.
 * Requires e-signature on accept; per-field provenance is enforced.
 */
export const capaFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  source: z.enum(['monitoring_visit', 'audit', 'inspection', 'deviation', 'self_identified', 'other']),
  source_reference: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  root_cause: z.string().min(1, 'Root cause is required'),
  impact_assessment: z.string().min(1, 'Impact assessment is required'),
  corrective_action_plan: z.string().min(1, 'Corrective action plan is required'),
  preventive_action_plan: z.string().optional(),
  responsible_owner: z.string().optional(),
  target_completion_date: z.string().optional(),
});

registerCopilotForm({
  id: 'ctms.capa',
  label: 'CAPA',
  description: 'Corrective and Preventive Action — drafted from a deviation, monitoring finding, or audit observation.',
  scope: 'global',
  schema: capaFormSchema,
  requiresESignature: true,
  defaultAgentId: 'template-completer',
  contextHint: 'Attach the deviation report or audit observation — the Copilot drafts root cause and action plan.',
  hints: [
    { path: 'title', label: 'Title' },
    { path: 'source', label: 'Source', synonyms: ['Source Type'] },
    { path: 'source_reference', label: 'Source reference', synonyms: ['Source ID', 'Reference', 'Linked ID'] },
    { path: 'severity', label: 'Severity' },
    { path: 'root_cause', label: 'Root cause', synonyms: ['Root Cause Analysis', 'Cause'] },
    { path: 'impact_assessment', label: 'Impact assessment', synonyms: ['Impact'] },
    { path: 'corrective_action_plan', label: 'Corrective action plan', synonyms: ['CAP', 'Corrective Action'] },
    { path: 'preventive_action_plan', label: 'Preventive action plan', synonyms: ['PAP', 'Preventive Action'] },
    { path: 'responsible_owner', label: 'Owner', synonyms: ['Responsible', 'Assigned To'] },
    { path: 'target_completion_date', label: 'Target completion', synonyms: ['Due Date', 'Target Date'] },
  ],
});
