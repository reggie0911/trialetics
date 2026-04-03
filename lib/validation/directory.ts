import { z } from 'zod';

const optionalUuid = z
  .union([z.string().uuid(), z.literal('')])
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : v));

const optionalAvatarUrl = z
  .string()
  .optional()
  .transform((s) => (typeof s === 'string' && s.trim() ? s.trim() : undefined))
  .refine((s) => s === undefined || /^https:\/\/.+/i.test(s), {
    message: 'Photo must be a valid https link',
  });

export const directoryContactFormSchema = z.object({
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
  country_code: z.string().optional(),
  region: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
  primary_directory_role_id: optionalUuid,
  primary_institution_id: optionalUuid,
  profile_id: optionalUuid,
  secondary_role_ids: z.array(z.string().uuid()).optional(),
});

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
