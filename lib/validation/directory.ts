import { z } from 'zod';

const optionalUuid = z
  .union([z.string().uuid(), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' || v === undefined || v === null ? null : v));

const optionalAvatarUrl = z
  .string()
  .optional()
  .transform((s) => (typeof s === 'string' && s.trim() ? s.trim() : undefined))
  .refine((s) => s === undefined || /^https:\/\/.+/i.test(s), {
    message: 'Photo must be a valid https link',
  });

const optionalTrimmedText = z
  .string()
  .optional()
  .transform((s) => (typeof s === 'string' && s.trim() ? s.trim() : undefined));

/** Object schema only (no `.superRefine`) so callers can `.omit()` before re-applying refinements. */
export const directoryContactFormFieldsSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  title: z.string().optional(),
  avatar_url: optionalAvatarUrl,
  email: z
    .string()
    .optional()
    .refine((s) => !s || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), 'Invalid email'),
  phone: z.string().optional(),
  department: z.string().optional(),
  address_line1: optionalTrimmedText,
  city: optionalTrimmedText,
  postal_code: optionalTrimmedText,
  contact_address_source: z.enum(['manual', 'site']).default('manual'),
  contact_address_study_site_id: optionalUuid,
  country_code: z.string().optional(),
  region: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
  profile_id: optionalUuid,
  secondary_role_ids: z.array(z.string().uuid()).optional(),
});

function refineDirectoryContactAddressSource(
  val: Pick<
    z.infer<typeof directoryContactFormFieldsSchema>,
    'contact_address_source' | 'contact_address_study_site_id'
  >,
  ctx: z.RefinementCtx
) {
  if (val.contact_address_source === 'site' && !val.contact_address_study_site_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select a site when using site assignment address',
      path: ['contact_address_study_site_id'],
    });
  }
}

export const directoryContactFormSchema = directoryContactFormFieldsSchema.superRefine(
  refineDirectoryContactAddressSource
);

/** Contact profile editor on the detail page (no `profile_id` field in the form). */
export const directoryContactDetailFormSchema = directoryContactFormFieldsSchema
  .omit({ profile_id: true })
  .superRefine(refineDirectoryContactAddressSource);

export type DirectoryContactFormValues = z.infer<typeof directoryContactFormSchema>;

export const institutionFormSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  organization_type: z.enum([
    'sponsor',
    'cro',
    'clinical_site',
    'vendor',
    'irb_ec',
    'lab',
    'government',
    'other',
  ]),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state_region: z.string().optional(),
  postal_code: z.string().optional(),
  country_code: z.string().optional(),
  region: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
  parent_institution_id: optionalUuid,
});

export type InstitutionFormValues = z.infer<typeof institutionFormSchema>;

export const committeeFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  committee_type: z.enum([
    'steering',
    'dsmb',
    'cec',
    'medical_adjudication',
    'safety_monitoring',
    'protocol_review',
    'other',
  ]),
  study_id: optionalUuid,
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
});

export type CommitteeFormValues = z.infer<typeof committeeFormSchema>;

/** Directory contact ↔ study junction (create/update payload subset). */
export const contactStudyLinkSchema = z.object({
  study_id: z.string().uuid(),
  directory_role_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().default(true),
  notes: z.string().max(500).nullable().optional(),
});

/** Directory contact ↔ study_site junction. */
export const contactSiteLinkSchema = z.object({
  study_site_id: z.string().uuid(),
  directory_role_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().default(true),
});

/** Directory contact ↔ institution junction. */
export const contactInstitutionLinkSchema = z.object({
  institution_id: z.string().uuid(),
  is_primary: z.boolean().default(false),
});

/** Committee member row (create). */
export const contactCommitteeLinkSchema = z.object({
  committee_id: z.string().uuid(),
  directory_role_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().default(true),
});

/** Batch add from the unified assignment dialog (validated server-side). */
export const contactAddAssignmentSchema = z.object({
  directory_contact_id: z.string().uuid(),
  studyLinks: z.array(contactStudyLinkSchema).default([]),
  siteLinks: z.array(contactSiteLinkSchema).default([]),
  orgLink: contactInstitutionLinkSchema.nullable().optional(),
  committeeLinks: z.array(contactCommitteeLinkSchema).default([]),
});

export type ContactAddAssignmentInput = z.infer<typeof contactAddAssignmentSchema>;

/** Quick-add single study link (client form). */
export const quickAddStudyLinkFormSchema = z.object({
  study_id: z.string().min(1, 'Select a study').uuid(),
  /** Always set on the form (null = no role); avoids z.optional vs RHF resolver mismatch. */
  directory_role_id: z.union([z.string().uuid(), z.null()]),
});

export type QuickAddStudyLinkFormValues = z.infer<typeof quickAddStudyLinkFormSchema>;

export const quickAddSiteLinkFormSchema = z.object({
  study_site_id: z.string().min(1, 'Select a site').uuid(),
  directory_role_id: z.union([z.string().uuid(), z.null()]),
});

export type QuickAddSiteLinkFormValues = z.infer<typeof quickAddSiteLinkFormSchema>;

export const quickAddInstitutionLinkFormSchema = z.object({
  institution_id: z.string().min(1, 'Select an organization').uuid(),
  is_primary: z.boolean(),
});

export type QuickAddInstitutionLinkFormValues = z.infer<typeof quickAddInstitutionLinkFormSchema>;

export const quickAddCommitteeLinkFormSchema = z.object({
  committee_id: z.string().min(1, 'Select a committee').uuid(),
  directory_role_id: z.union([z.string().uuid(), z.null()]),
});

export type QuickAddCommitteeLinkFormValues = z.infer<typeof quickAddCommitteeLinkFormSchema>;
