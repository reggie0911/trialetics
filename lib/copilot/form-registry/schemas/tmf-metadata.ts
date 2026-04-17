import { z } from 'zod';

import { registerCopilotForm } from '../base';

/**
 * TMF document metadata. Used when filing a document into the eTMF — the
 * Copilot reads the document content (Phase 6) and proposes the metadata
 * fields on accept.
 */
export const tmfMetadataFormSchema = z.object({
  document_title: z.string().min(1, 'Title is required'),
  artifact_id: z.string().optional(),
  zone: z.enum([
    'trial_management',
    'central_trial_documents',
    'regulatory',
    'irb_iec_other_approvals',
    'site_management',
    'investigational_product',
    'safety_reporting',
    'central_third_party',
    'data_management',
    'statistics',
    'other',
  ]),
  section: z.string().optional(),
  document_date: z.string().optional(),
  expiration_date: z.string().optional(),
  version: z.string().optional(),
  language: z.string().optional(),
  country_id: z.string().optional(),
  site_id: z.string().optional(),
  document_status: z.enum(['draft', 'final', 'expired', 'superseded']).optional(),
});

registerCopilotForm({
  id: 'ctms.tmf-metadata',
  label: 'TMF document metadata',
  description: 'File a document into the eTMF with classification, zone, version, and effective dates.',
  scope: 'global',
  schema: tmfMetadataFormSchema,
  requiresESignature: false,
  defaultAgentId: 'form-filler',
  contextHint: 'Pick a recently-uploaded document — the Copilot lifts dates, version, and zone from the file itself.',
  hints: [
    { path: 'document_title', label: 'Title', synonyms: ['Document Title', 'Doc Name'] },
    { path: 'artifact_id', label: 'Artifact ID', synonyms: ['DIA TMF Reference', 'Artifact'] },
    { path: 'zone', label: 'Zone' },
    { path: 'section', label: 'Section', synonyms: ['Subsection'] },
    { path: 'document_date', label: 'Document date', synonyms: ['Effective Date', 'Issue Date'] },
    { path: 'expiration_date', label: 'Expiration date', synonyms: ['Expiry', 'Expires'] },
    { path: 'version', label: 'Version', synonyms: ['Version Number', 'Rev'] },
    { path: 'language', label: 'Language' },
    { path: 'country_id', label: 'Country', synonyms: ['Country Code'] },
    { path: 'site_id', label: 'Site', synonyms: ['Site #'] },
    { path: 'document_status', label: 'Status', synonyms: ['Document Status'] },
  ],
});
