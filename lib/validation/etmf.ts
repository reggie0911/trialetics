import { z } from 'zod';

// Document status enum
export const etmfDocumentStatusSchema = z.enum(['placeholder', 'qc_review', 'rejected', 'approved']);

// Create document schema
export const createEtmfDocumentSchema = z.object({
  study_id: z.string().uuid('Invalid study ID'),
  study_country_id: z.string().uuid('Invalid country ID').nullable().optional(),
  site_id: z.string().uuid('Invalid site ID').nullable().optional(),
  staff_member_id: z.string().uuid('Invalid staff member ID').nullable().optional(),
  tmf_ref_id: z.string().uuid('Invalid TMF reference ID').nullable().optional(),
  document_name: z.string().min(1, 'Document name is required').max(500, 'Document name too long'),
  version: z.string().max(50, 'Version too long').nullable().optional(),
  version_type: z.string().max(50, 'Version type too long').nullable().optional(),
  language: z.string().max(50, 'Language too long').nullable().optional(),
  document_date: z.string().nullable().optional(),
  document_signed_date: z.string().nullable().optional(),
  approval_date: z.string().nullable().optional(),
  expiration_date: z.string().nullable().optional(),
  version_date: z.string().nullable().optional(),
});

// Update document schema
export const updateEtmfDocumentSchema = z.object({
  id: z.string().uuid('Invalid document ID'),
  document_name: z.string().min(1, 'Document name is required').max(500, 'Document name too long').optional(),
  version: z.string().max(50, 'Version too long').nullable().optional(),
  version_type: z.string().max(50, 'Version type too long').nullable().optional(),
  language: z.string().max(50, 'Language too long').nullable().optional(),
  document_date: z.string().nullable().optional(),
  document_signed_date: z.string().nullable().optional(),
  approval_date: z.string().nullable().optional(),
  expiration_date: z.string().nullable().optional(),
  version_date: z.string().nullable().optional(),
});

// Update document status schema
export const updateEtmfDocumentStatusSchema = z.object({
  id: z.string().uuid('Invalid document ID'),
  document_status: etmfDocumentStatusSchema,
  rejection_reason: z.string().max(1000, 'Rejection reason too long').nullable().optional(),
});

// Toggle EDL schema
export const toggleEdlSchema = z.object({
  study_id: z.string().uuid('Invalid study ID'),
  tmf_ref_id: z.string().uuid('Invalid TMF reference ID'),
  field: z.enum(['edl_yes', 'site_level_yes', 'country_level_yes']),
  value: z.boolean(),
});

// Toggle Staff EDL schema
export const toggleStaffEdlSchema = z.object({
  site_id: z.string().uuid('Invalid site ID'),
  tmf_ref_id: z.string().uuid('Invalid TMF reference ID'),
  role_name: z.string().min(1, 'Role name is required').max(100, 'Role name too long'),
  required: z.boolean(),
});

// Add country schema (creates study_country entry)
export const addEtmfCountrySchema = z.object({
  study_id: z.string().uuid('Invalid study ID'),
  country_code: z.string().min(2, 'Country code is required').max(3, 'Country code too long'),
  country_name: z.string().min(1, 'Country name is required').max(100, 'Country name too long'),
});

// Add site schema (creates study_site entry and generates placeholders)
export const addEtmfSiteSchema = z.object({
  study_id: z.string().uuid('Invalid study ID'),
  study_country_id: z.string().uuid('Invalid country ID'),
  site_number: z.string().min(1, 'Site number is required').max(50, 'Site number too long'),
  name: z.string().min(1, 'Site name is required').max(200, 'Site name too long'),
});

// Add staff member schema (creates study_team_member and generates staff placeholders)
export const addEtmfStaffMemberSchema = z.object({
  study_id: z.string().uuid('Invalid study ID'),
  site_id: z.string().uuid('Invalid site ID'),
  profile_id: z.string().uuid('Invalid profile ID'),
  role: z.string().min(1, 'Role is required').max(100, 'Role too long'),
});

// Document filters schema
export const etmfDocumentFiltersSchema = z.object({
  search: z.string().max(200).optional(),
  document_status: z.array(etmfDocumentStatusSchema).optional(),
  country_id: z.string().uuid().optional(),
  site_id: z.string().uuid().optional(),
  staff_member_id: z.string().uuid().optional(),
  study_role: z.string().optional(),
  zone_number: z.number().int().min(1).max(11).optional(),
  section_number: z.string().optional(),
  artifact_number: z.string().optional(),
  sub_artifact: z.string().optional(),
});

// EDL filters schema
export const etmfEdlFiltersSchema = z.object({
  search: z.string().max(200).optional(),
  zone_number: z.number().int().min(1).max(11).optional(),
  section_number: z.string().optional(),
  artifact_number: z.string().optional(),
  core_or_recommended: z.enum(['Core', 'Recommended']).optional(),
  edl_yes: z.boolean().optional(),
  site_level_yes: z.boolean().optional(),
  country_level_yes: z.boolean().optional(),
});

// Staff EDL filters schema
export const etmfStaffEdlFiltersSchema = z.object({
  search: z.string().max(200).optional(),
  artifact_name: z.string().optional(),
  sub_artifact: z.string().optional(),
});

// Bulk upload file metadata schema
export const bulkUploadFileSchema = z.object({
  file_name: z.string().min(1, 'File name is required'),
  file_size: z.number().positive('File size must be positive'),
  file_type: z.string().min(1, 'File type is required'),
});

// Initialize study EDL schema
export const initializeStudyEdlSchema = z.object({
  study_id: z.string().uuid('Invalid study ID'),
});

export type CreateEtmfDocumentInput = z.infer<typeof createEtmfDocumentSchema>;
export type UpdateEtmfDocumentInput = z.infer<typeof updateEtmfDocumentSchema>;
export type UpdateEtmfDocumentStatusInput = z.infer<typeof updateEtmfDocumentStatusSchema>;
export type ToggleEdlInput = z.infer<typeof toggleEdlSchema>;
export type ToggleStaffEdlInput = z.infer<typeof toggleStaffEdlSchema>;
export type AddEtmfCountryInput = z.infer<typeof addEtmfCountrySchema>;
export type AddEtmfSiteInput = z.infer<typeof addEtmfSiteSchema>;
export type AddEtmfStaffMemberInput = z.infer<typeof addEtmfStaffMemberSchema>;
export type EtmfDocumentFiltersInput = z.infer<typeof etmfDocumentFiltersSchema>;
export type EtmfEdlFiltersInput = z.infer<typeof etmfEdlFiltersSchema>;
export type EtmfStaffEdlFiltersInput = z.infer<typeof etmfStaffEdlFiltersSchema>;
