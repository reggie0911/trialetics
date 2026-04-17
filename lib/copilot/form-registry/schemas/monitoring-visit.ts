import { z } from 'zod';

import { registerCopilotForm } from '../base';

/**
 * Monitoring visit form — used to schedule a new on-site or remote visit.
 * Mirrors the high-level fields of the visit scheduling flow; the structured
 * body of the visit report itself is filled via the `template-completer`
 * pipeline (see `lib/copilot/form-registry/templates/`).
 */
export const monitoringVisitFormSchema = z.object({
  visit_type: z.enum(['SIV', 'IMV', 'COV', 'remote_imv', 'site_close_out', 'other']),
  site_id: z.string().min(1, 'Site is required'),
  scheduled_date: z.string().min(1, 'Scheduled date is required'),
  monitor_name: z.string().optional(),
  monitor_email: z.string().email().optional(),
  agenda: z.string().optional(),
  expected_subjects_to_review: z.coerce.number().min(0).optional(),
  expected_documents_to_review: z.coerce.number().min(0).optional(),
});

registerCopilotForm({
  id: 'ctms.monitoring-visit',
  label: 'Monitoring visit',
  description: 'Schedule a monitoring visit (SIV, IMV, remote, or close-out).',
  scope: 'visit',
  schema: monitoringVisitFormSchema,
  requiresESignature: false,
  defaultAgentId: 'form-filler',
  contextHint:
    'Past visit reports, monitoring plan, or a forwarded site request work — the Copilot drafts the visit packet from any of them.',
  hints: [
    { path: 'visit_type', label: 'Visit type', synonyms: ['Visit', 'Type', 'Monitoring Type'] },
    { path: 'site_id', label: 'Site', synonyms: ['Site ID', 'Site Number'] },
    { path: 'scheduled_date', label: 'Scheduled date', synonyms: ['Date', 'Visit Date', 'Visit Schedule'] },
    { path: 'monitor_name', label: 'Monitor', synonyms: ['CRA', 'Monitor Name', 'Lead CRA'] },
    { path: 'monitor_email', label: 'Monitor email', synonyms: ['CRA Email'] },
    { path: 'agenda', label: 'Agenda', synonyms: ['Visit Agenda', 'Notes'] },
    { path: 'expected_subjects_to_review', label: 'Subjects to review' },
    { path: 'expected_documents_to_review', label: 'Documents to review' },
  ],
});
