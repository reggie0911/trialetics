import { z } from 'zod';

import { registerCopilotForm } from '../base';

/**
 * Trimmed mirror of `studyFormSchema` from `study-form.tsx`. We keep the
 * Copilot-fillable subset narrow on purpose — fields like `regions` (array
 * of country codes) and structured overview blocks need bespoke prefill
 * logic later. Adding fields here is a one-line change.
 */
export const studyOverviewFormSchema = z.object({
  protocol_number: z.string().min(1, 'Protocol number is required'),
  study_name: z.string().trim().min(1, 'Study name is required'),
  title: z.string().min(1, 'Study title is required'),
  phase: z.enum(['Phase I', 'Phase II', 'Phase III', 'Phase IV', 'Phase I/II', 'Phase II/III']),
  therapeutic_area: z.string().optional(),
  indication: z.string().optional(),
  sponsor: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  description: z.string().optional(),
});

registerCopilotForm({
  id: 'ctms.study-overview',
  label: 'Study overview',
  description: 'Set up a new study from a protocol document or sponsor briefing deck.',
  scope: 'study',
  schema: studyOverviewFormSchema,
  defaultAgentId: 'form-filler',
  contextHint: 'Drop the protocol or sponsor brief — the Copilot will pull objectives, sponsor, and timeline.',
  hints: [
    { path: 'protocol_number', label: 'Protocol number', synonyms: ['Protocol #', 'Protocol ID'] },
    { path: 'study_name', label: 'Study name', synonyms: ['Short name', 'Display name', 'Trial nickname'] },
    { path: 'title', label: 'Study title', synonyms: ['Full title', 'Official title', 'Trial Title'] },
    { path: 'phase', label: 'Phase', synonyms: ['Trial Phase', 'Study Phase'] },
    { path: 'therapeutic_area', label: 'Therapeutic area', synonyms: ['TA', 'Indication Area'] },
    { path: 'indication', label: 'Indication' },
    { path: 'sponsor', label: 'Sponsor', synonyms: ['Sponsor Name', 'Funding Sponsor'] },
    { path: 'start_date', label: 'Start date', synonyms: ['Study Start', 'Estimated Start'] },
    { path: 'end_date', label: 'End date', synonyms: ['Study End', 'Estimated End'] },
    { path: 'description', label: 'Description', synonyms: ['Summary', 'Synopsis'] },
  ],
});
