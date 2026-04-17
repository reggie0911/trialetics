import { z } from 'zod';

import { registerCopilotForm } from '../base';

/**
 * Mirrors `siteFormSchema` in `components/ctms/sites/site-form.tsx` so the
 * Copilot can prefill a new site from a roster spreadsheet. Updates to the
 * underlying form schema flow into this registration via the shared Zod
 * import — keep the two in sync (both files are short).
 */
export const siteActivationFormSchema = z.object({
  site_number: z.string().min(1, 'Site number is required'),
  name: z.string().min(1, 'Site name is required'),
  study_country_id: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  pi_name: z.string().optional(),
  pi_email: z.string().optional(),
  pi_directory_contact_id: z.string().optional(),
  status: z
    .enum(['identified', 'selected', 'initiated', 'activated', 'enrolling', 'closed'])
    .optional(),
  activation_date: z.string().optional(),
  target_enrollment: z.coerce.number().min(0).optional(),
});

registerCopilotForm({
  id: 'ctms.site-activation',
  label: 'Site activation',
  description: 'Create a new clinical trial site from a roster, contract, or initiation packet.',
  scope: 'site',
  schema: siteActivationFormSchema,
  defaultAgentId: 'form-filler',
  contextHint: 'Drag a site roster spreadsheet here or pick from your uploaded documents.',
  hints: [
    { path: 'site_number', label: 'Site number', synonyms: ['Site #', 'Site Number', 'Site ID', 'Site Code'] },
    { path: 'name', label: 'Site name', synonyms: ['Site Name', 'Institution', 'Hospital'] },
    { path: 'study_country_id', label: 'Country', synonyms: ['Country', 'Country Code'] },
    { path: 'address', label: 'Address', synonyms: ['Street Address', 'Address Line 1'] },
    { path: 'city', label: 'City' },
    { path: 'state', label: 'State', synonyms: ['Province', 'Region'] },
    { path: 'postal_code', label: 'Postal code', synonyms: ['Zip', 'Zip Code', 'Postcode'] },
    { path: 'pi_name', label: 'PI name', synonyms: ['Principal Investigator', 'PI', 'Lead Investigator'] },
    { path: 'pi_email', label: 'PI email', synonyms: ['PI Email', 'Investigator Email'] },
    { path: 'status', label: 'Status', synonyms: ['Site Status', 'Activation Status'] },
    { path: 'activation_date', label: 'Activation date', synonyms: ['SIV Date', 'Activated On'] },
    { path: 'target_enrollment', label: 'Target enrollment', synonyms: ['Target', 'Enrollment Goal'] },
  ],
});
