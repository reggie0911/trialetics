import { z } from 'zod';

import { registerCopilotForm } from '../base';

export const deviationFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  occurred_on: z.string().min(1, 'Occurred date is required'),
  detected_on: z.string().optional(),
  site_id: z.string().optional(),
  subject_id: z.string().optional(),
  category: z.enum([
    'protocol',
    'consent',
    'inclusion_exclusion',
    'visit_window',
    'study_drug',
    'safety',
    'data_integrity',
    'regulatory',
    'other',
  ]),
  severity: z.enum(['minor', 'major', 'critical']),
  description: z.string().min(1, 'Description is required'),
  impact: z.string().optional(),
  immediate_action: z.string().optional(),
});

registerCopilotForm({
  id: 'ctms.deviation',
  label: 'Protocol deviation',
  description: 'Capture a protocol deviation from monitoring notes or a site report.',
  scope: 'global',
  schema: deviationFormSchema,
  requiresESignature: true,
  defaultAgentId: 'form-filler',
  contextHint: 'Drop the monitoring report or site email describing the event.',
  hints: [
    { path: 'title', label: 'Title' },
    { path: 'occurred_on', label: 'Occurred date', synonyms: ['Date of Event', 'Event Date'] },
    { path: 'detected_on', label: 'Detected date', synonyms: ['Date Identified'] },
    { path: 'site_id', label: 'Site', synonyms: ['Site #', 'Site ID'] },
    { path: 'subject_id', label: 'Subject', synonyms: ['Subject ID', 'Subject Number'] },
    { path: 'category', label: 'Category', synonyms: ['Type', 'Deviation Type'] },
    { path: 'severity', label: 'Severity', synonyms: ['Classification', 'Severity Level'] },
    { path: 'description', label: 'Description', synonyms: ['Event Description', 'Details'] },
    { path: 'impact', label: 'Impact' },
    { path: 'immediate_action', label: 'Immediate action', synonyms: ['Action Taken'] },
  ],
});
