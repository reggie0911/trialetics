/**
 * Finance Module — server-side permission helpers.
 *
 * These wrap the existing `assertStudyWritable` logic with Finance-Module
 * specific access checks. Server actions must call one of these helpers
 * before any mutation. The default behavior:
 *
 *   1. Resolve the current user.
 *   2. Resolve their `company_id` from `profiles`.
 *   3. Confirm the target study exists, belongs to the same company, and
 *      (for write helpers) is not closed.
 *   4. Return the `userId`, `companyId`, and the resolved `studyId`, ready
 *      to be inserted into `fm_*` rows.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { createClient } from '@/lib/server';
import {
  STUDY_DEACTIVATED_MESSAGE,
  assertStudyWritable,
} from '@/lib/server/study-write-guard';

export interface FinanceModuleContext {
  userId: string;
  companyId: string;
  studyId: string;
  supabase: SupabaseClient;
}

export interface FinanceModuleReadContext extends FinanceModuleContext {
  studyStatus: 'active' | 'closed' | string;
}

export interface FinanceModulePermissionResult {
  context: FinanceModuleContext | null;
  error: string | null;
}

export interface FinanceModuleReadPermissionResult {
  context: FinanceModuleReadContext | null;
  error: string | null;
}

/** Read access: study must exist and belong to the caller's company. */
export async function loadFinanceReadContext(
  studyId: string,
  options: { supabase?: SupabaseClient } = {},
): Promise<FinanceModuleReadPermissionResult> {
  const supabase = options.supabase ?? (await createClient());

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { context: null, error: 'Not signed in.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.company_id) return { context: null, error: 'Profile not found.' };

  const { data: study, error } = await supabase
    .from('studies')
    .select('id, company_id, status')
    .eq('id', studyId)
    .maybeSingle();

  if (error) return { context: null, error: error.message };
  if (!study || study.company_id !== profile.company_id) {
    return { context: null, error: 'Study not found.' };
  }

  return {
    context: {
      userId: user.id,
      companyId: profile.company_id,
      studyId: study.id,
      studyStatus: study.status ?? 'active',
      supabase,
    },
    error: null,
  };
}

/** Write access: read access plus the study must not be closed. */
export async function loadFinanceWriteContext(
  studyId: string,
  options: { supabase?: SupabaseClient } = {},
): Promise<FinanceModulePermissionResult> {
  const supabase = options.supabase ?? (await createClient());

  const read = await loadFinanceReadContext(studyId, { supabase });
  if (!read.context) return { context: null, error: read.error };

  const guard = await assertStudyWritable(supabase, studyId, read.context.companyId);
  if (guard.error) return { context: null, error: guard.error };

  return {
    context: {
      userId: read.context.userId,
      companyId: read.context.companyId,
      studyId: read.context.studyId,
      supabase,
    },
    error: null,
  };
}

export { STUDY_DEACTIVATED_MESSAGE };
