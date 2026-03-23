import { z } from 'zod';

export const eisfDocumentStatusSchema = z.enum([
  'missing',
  'uploaded',
  'under_review',
  'approved',
  'rejected',
  'expired',
]);

export const createEisfCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
});

export const createEisfRuleSchema = z.object({
  study_id: z.string().uuid(),
  study_site_id: z.string().uuid().optional().nullable(),
  role_name: z.string().max(200).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  tmf_ref_id: z.string().uuid().optional().nullable(),
  rule_label: z.string().min(1).max(500),
});

export const createEisfDocumentSchema = z.object({
  folder_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  category_id: z.string().uuid().optional().nullable(),
  tmf_ref_id: z.string().uuid().optional().nullable(),
  primary_staff_member_id: z.string().uuid().optional().nullable(),
  primary_site_contact_id: z.string().uuid().optional().nullable(),
});

export const createEisfRequestSchema = z.object({
  folder_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  instructions: z.string().max(5000).optional(),
  category_id: z.string().uuid().optional().nullable(),
  tmf_ref_id: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  auto_create_document: z.boolean().optional(),
});

export const eisfReviewDecisionSchema = z.enum(['approved', 'rejected', 'request_changes']);

export const addEisfReviewSchema = z.object({
  document_id: z.string().uuid(),
  version_id: z.string().uuid(),
  decision: eisfReviewDecisionSchema,
  comment: z.string().max(2000).optional().nullable(),
});
