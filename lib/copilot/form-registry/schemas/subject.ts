import { z } from 'zod';

import { registerCopilotForm } from '../base';

/**
 * Mirrors the subject schema in `subject-form-dialog.tsx`. Used primarily
 * by `CopilotImportTrigger` on the subjects list to bulk-enroll from a
 * randomization roster, screening log, or sponsor extract.
 */
export const subjectFormSchema = z.object({
  subject_number: z.string().min(1, 'Subject number is required'),
  site_id: z.string().min(1, 'Site is required'),
  screening_number: z.string().optional(),
  randomization_number: z.string().optional(),
  status: z
    .enum([
      'pre_screening',
      'screening',
      'screen_failure',
      'enrolled',
      'randomized',
      'active',
      'completed',
      'withdrawn',
      'lost_to_follow_up',
    ])
    .optional(),
  screening_date: z.string().optional(),
  randomization_date: z.string().optional(),
});

registerCopilotForm({
  id: 'ctms.subject',
  label: 'Subject',
  description: 'Enroll a subject from a screening log, randomization roster, or eCRF extract.',
  scope: 'subject',
  schema: subjectFormSchema,
  defaultAgentId: 'form-filler',
  contextHint:
    'Drop a screening log or randomization roster — the Copilot maps subject numbers, sites, and lifecycle dates.',
  hints: [
    { path: 'subject_number', label: 'Subject number', synonyms: ['Subject #', 'Subject ID', 'Patient ID', 'Participant ID'] },
    { path: 'site_id', label: 'Site', synonyms: ['Site', 'Site Number', 'Site ID', 'Investigator Site'] },
    { path: 'screening_number', label: 'Screening number', synonyms: ['Screening #', 'Screen ID', 'SCR Number'] },
    { path: 'randomization_number', label: 'Randomization number', synonyms: ['Rand #', 'Rand ID', 'Random Number'] },
    { path: 'status', label: 'Status', synonyms: ['Subject Status', 'Lifecycle'] },
    { path: 'screening_date', label: 'Screening date', synonyms: ['Date Screened', 'Screening Visit Date'] },
    { path: 'randomization_date', label: 'Randomization date', synonyms: ['Date Randomized', 'Rand Date'] },
  ],
});
