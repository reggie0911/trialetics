'use server';

import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { revalidateStudyCtmsLayout } from '@/lib/cache/revalidate-ctms';
import { allIsoCountriesForSelectList } from '@/lib/data/iso-countries-select';
import { createClient } from '@/lib/server';
import { assertStudyWritable } from '@/lib/server/study-write-guard';
import {
  normalizeSubscriptionPlan,
  PLAN_CONFIGS,
  type Study,
  type StudyPhase,
  type StudyStatus,
} from '@/lib/types/ctms';
import type { StudyOverview } from '@/lib/validation/study-overview';
import { parseStudyOverview, studyOverviewToDbValue } from '@/lib/validation/study-overview';

function mapStudyRow(data: unknown): Study {
  const row = data as Study & { overview?: unknown };
  return {
    ...row,
    study_name: row.study_name ?? null,
    overview: parseStudyOverview(row.overview) ?? null,
    finance_approval_template_id: row.finance_approval_template_id ?? null,
  };
}

export interface CreateStudyInput {
  protocol_number: string;
  study_name: string;
  title: string;
  phase: StudyPhase;
  therapeutic_area?: string;
  indication?: string;
  status?: StudyStatus;
  sponsor?: string;
  sponsor_institution_id?: string | null;
  start_date?: string;
  end_date?: string;
  description?: string;
  /** Protocol summary; persisted as JSON. Pass null to clear. */
  overview?: StudyOverview | null;
}

export interface UpdateStudyInput extends Partial<CreateStudyInput> {
  id: string;
}

export interface StudyFilters {
  search?: string;
  status?: StudyStatus;
  phase?: StudyPhase;
}

/**
 * Keep `study_countries` rows aligned with `studies.overview.study_sites.regions` (alpha-2 codes).
 * Inserts before deletes. Errors are logged only — study save remains authoritative; re-save converges.
 */
async function syncStudyCountriesFromOverview(
  supabase: SupabaseClient,
  studyId: string,
  regions: string[],
): Promise<void> {
  try {
    const targetCodes = new Set(regions.filter(Boolean));
    const { data: existing, error: fetchError } = await supabase
      .from('study_countries')
      .select('id, country_code')
      .eq('study_id', studyId);

    if (fetchError) {
      console.error('[syncStudyCountriesFromOverview] fetch', fetchError.message);
      return;
    }

    const existingCodes = new Set((existing ?? []).map((r) => r.country_code));
    const toInsert = [...targetCodes].filter((c) => !existingCodes.has(c));
    const toDelete = (existing ?? []).filter((r) => !targetCodes.has(r.country_code));

    if (toInsert.length) {
      const list = allIsoCountriesForSelectList();
      const nameByCode = new Map(list.map((o) => [o.code, o.name] as const));
      const rows = toInsert.map((code) => ({
        study_id: studyId,
        country_code: code,
        country_name: nameByCode.get(code) ?? code,
        status: 'planned' as const,
        regulatory_status: 'not_started' as const,
      }));
      const { error: insertError } = await supabase.from('study_countries').insert(rows);
      if (insertError) {
        console.error('[syncStudyCountriesFromOverview] insert', insertError.message);
        return;
      }
    }

    if (toDelete.length) {
      const ids = toDelete.map((r) => r.id);
      const { error: delError } = await supabase.from('study_countries').delete().in('id', ids);
      if (delError) {
        console.error('[syncStudyCountriesFromOverview] delete', delError.message);
      }
    }
  } catch (e) {
    console.error('[syncStudyCountriesFromOverview]', e);
  }
}

async function getCompanyId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.company_id) throw new Error('No company found');
  return profile.company_id;
}

async function enforceActiveStudyLimit(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  companyId: string;
  nextStatus: StudyStatus;
  studyIdToIgnore?: string;
}): Promise<string | null> {
  if (params.nextStatus !== 'active') return null;

  const { data: subscription } = await params.supabase
    .from('subscriptions')
    .select('plan, status, current_period_end')
    .eq('company_id', params.companyId)
    .maybeSingle();

  const paidStatus =
    subscription?.status === 'active' ||
    subscription?.status === 'trialing' ||
    subscription?.status === 'past_due' ||
    (subscription?.status === 'cancelled' &&
      !!subscription?.current_period_end &&
      new Date(subscription.current_period_end).getTime() > Date.now());
  const plan = paidStatus
    ? normalizeSubscriptionPlan(subscription?.plan)
    : 'independent_consultant';
  const limit = PLAN_CONFIGS[plan].maxActiveStudies;
  if (limit === null) return null;

  let activeCountQuery = params.supabase
    .from('studies')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', params.companyId)
    .eq('status', 'active');
  if (params.studyIdToIgnore) {
    activeCountQuery = activeCountQuery.neq('id', params.studyIdToIgnore);
  }
  const { count } = await activeCountQuery;
  const activeCount = count ?? 0;

  if (activeCount >= limit) {
    return `Your ${PLAN_CONFIGS[plan].name} plan supports up to ${limit} active studies. Upgrade in Billing to activate more studies.`;
  }
  return null;
}

export async function getCompanyName(): Promise<string | null> {
  const supabase = await createClient();
  const companyId = await getCompanyId();

  const { data } = await supabase
    .from('companies')
    .select('name')
    .eq('id', companyId)
    .single();

  return data?.name ?? null;
}

export async function getStudies(filters?: StudyFilters): Promise<Study[]> {
  const supabase = await createClient();

  let query = supabase
    .from('studies')
    .select('*')
    .order('updated_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.phase) {
    query = query.eq('phase', filters.phase);
  }

  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,study_name.ilike.%${filters.search}%,protocol_number.ilike.%${filters.search}%,sponsor.ilike.%${filters.search}%,therapeutic_area.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return ((data as unknown as Study[]) ?? []).map(mapStudyRow);
}

export async function getStudyById(id: string): Promise<Study | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('studies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return mapStudyRow(data);
}

/** Dedupes study fetches within a single RSC pass (layout + page). */
export const getStudyByIdCached = cache(getStudyById);

export async function createStudy(input: CreateStudyInput): Promise<{ data: Study | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const companyId = await getCompanyId();
    const requestedStatus = input.status || 'draft';
    const limitError = await enforceActiveStudyLimit({
      supabase,
      companyId,
      nextStatus: requestedStatus,
    });
    if (limitError) {
      return { data: null, error: limitError };
    }

    const { data, error } = await supabase
      .from('studies')
      .insert({
        company_id: companyId,
        protocol_number: input.protocol_number,
        study_name: input.study_name.trim() || null,
        title: input.title,
        phase: input.phase,
        therapeutic_area: input.therapeutic_area || null,
        indication: input.indication || null,
        status: requestedStatus,
        sponsor: input.sponsor || null,
        sponsor_institution_id: input.sponsor_institution_id || null,
        start_date: input.start_date || null,
        end_date: input.end_date || null,
        description: input.description || null,
        overview: studyOverviewToDbValue(input.overview ?? null) ?? null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'A study with this protocol number already exists.' };
      }
      return { data: null, error: error.message };
    }

    const studyId = data.id as string;
    const regionCodes = input.overview?.study_sites?.regions ?? [];
    await syncStudyCountriesFromOverview(supabase, studyId, regionCodes);

    revalidatePath('/protected');
    revalidatePath('/protected/studies');
    revalidateStudyCtmsLayout(studyId);
    return { data: mapStudyRow(data), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function updateStudyFinanceApprovalTemplate(input: {
  studyId: string;
  templateId: string | null;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.company_id) return { error: 'Profile not found.' };
  if (profile.role !== 'admin') {
    return { error: 'Only company administrators can change the study approval workflow.' };
  }

  const { data: study } = await supabase
    .from('studies')
    .select('company_id')
    .eq('id', input.studyId)
    .maybeSingle();
  if (!study || study.company_id !== profile.company_id) return { error: 'Study not found.' };

  if (input.templateId) {
    const { data: tpl } = await supabase
      .from('finance_approval_templates')
      .select('id')
      .eq('id', input.templateId)
      .eq('company_id', profile.company_id)
      .maybeSingle();
    if (!tpl) return { error: 'Approval workflow not found.' };
  }

  const { error: writeGuard } = await assertStudyWritable(supabase, input.studyId, profile.company_id);
  if (writeGuard) return { error: writeGuard };

  const { error } = await supabase
    .from('studies')
    .update({ finance_approval_template_id: input.templateId })
    .eq('id', input.studyId)
    .eq('company_id', profile.company_id);
  if (error) return { error: error.message };
  revalidatePath('/protected');
  revalidatePath('/protected/studies');
  revalidateStudyCtmsLayout(input.studyId);
  revalidatePath('/protected/financials');
  return { error: null };
}

export async function updateStudy(input: UpdateStudyInput): Promise<{ data: Study | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: 'Not signed in.' };
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!profile?.company_id) {
      return { data: null, error: 'Profile not found.' };
    }

    const overviewProvided = 'overview' in input;
    const { id, ...updates } = input;
    const { error: writeGuard } = await assertStudyWritable(supabase, id, profile.company_id);
    if (writeGuard) {
      return { data: null, error: writeGuard };
    }

    const requestedStatus = updates.status;
    if (requestedStatus) {
      const limitError = await enforceActiveStudyLimit({
        supabase,
        companyId: profile.company_id,
        nextStatus: requestedStatus,
        studyIdToIgnore: id,
      });
      if (limitError) {
        return { data: null, error: limitError };
      }
    }

    const cleanUpdates: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        if (key === 'overview') {
          cleanUpdates[key] = studyOverviewToDbValue(value) ?? null;
        } else {
          cleanUpdates[key] = value === '' ? null : value;
        }
      }
    }

    const { data, error } = await supabase
      .from('studies')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'A study with this protocol number already exists.' };
      }
      return { data: null, error: error.message };
    }

    if (overviewProvided) {
      const regionCodes =
        input.overview === null ? [] : (input.overview?.study_sites?.regions ?? []);
      await syncStudyCountriesFromOverview(supabase, id, regionCodes);
    }

    revalidatePath('/protected');
    revalidatePath('/protected/studies');
    revalidateStudyCtmsLayout(id);
    return { data: mapStudyRow(data), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteStudy(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not signed in.' };
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!profile?.company_id) {
      return { error: 'Profile not found.' };
    }
    const { error: writeGuard } = await assertStudyWritable(supabase, id, profile.company_id);
    if (writeGuard) {
      return { error: writeGuard };
    }

    const { error } = await supabase
      .from('studies')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };

    revalidatePath('/protected');
    revalidatePath('/protected/studies');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function closeStudy(id: string, password: string): Promise<{ error: string | null }> {
  const trimmed = password?.trim() ?? '';
  if (!trimmed) {
    return { error: 'Password is required.' };
  }

  const supabase = await createClient();

  try {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return { error: 'Not signed in.' };
    }
    if (!user.email) {
      return { error: 'You must be signed in with an email and password to deactivate a study.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!profile?.company_id) {
      return { error: 'Profile not found.' };
    }
    if (profile.role !== 'admin') {
      return { error: 'Only company administrators can deactivate a study.' };
    }

    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: trimmed,
    });
    if (signErr) {
      return { error: 'Invalid password or this account cannot re-authenticate with a password.' };
    }

    const { data: study } = await supabase
      .from('studies')
      .select('id, company_id, status')
      .eq('id', id)
      .maybeSingle();
    if (!study || study.company_id !== profile.company_id) {
      return { error: 'Study not found.' };
    }
    if (study.status === 'closed') {
      return { error: 'This study is already deactivated.' };
    }

    const { error } = await supabase
      .from('studies')
      .update({ status: 'closed' })
      .eq('id', id)
      .eq('company_id', profile.company_id);

    if (error) return { error: error.message };

    revalidatePath('/protected');
    revalidatePath('/protected/studies');
    revalidateStudyCtmsLayout(id);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function reactivateStudy(id: string, password: string): Promise<{ error: string | null }> {
  const trimmed = password?.trim() ?? '';
  if (!trimmed) {
    return { error: 'Password is required.' };
  }

  const supabase = await createClient();

  try {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return { error: 'Not signed in.' };
    }
    if (!user.email) {
      return { error: 'You must be signed in with an email and password to reactivate a study.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!profile?.company_id) {
      return { error: 'Profile not found.' };
    }
    if (profile.role !== 'admin') {
      return { error: 'Only company administrators can reactivate a study.' };
    }

    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: trimmed,
    });
    if (signErr) {
      return { error: 'Invalid password or this account cannot re-authenticate with a password.' };
    }

    const { data: study } = await supabase
      .from('studies')
      .select('id, company_id, status')
      .eq('id', id)
      .maybeSingle();
    if (!study || study.company_id !== profile.company_id) {
      return { error: 'Study not found.' };
    }
    if (study.status !== 'closed') {
      return { error: 'Study is not deactivated.' };
    }

    const limitError = await enforceActiveStudyLimit({
      supabase,
      companyId: profile.company_id,
      nextStatus: 'active',
      studyIdToIgnore: id,
    });
    if (limitError) {
      return { error: limitError };
    }

    const { error } = await supabase
      .from('studies')
      .update({ status: 'active' })
      .eq('id', id)
      .eq('company_id', profile.company_id);

    if (error) return { error: error.message };

    revalidatePath('/protected');
    revalidatePath('/protected/studies');
    revalidateStudyCtmsLayout(id);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function getStudyCounts(studyId: string): Promise<{
  countries: number;
  sites: number;
}> {
  const supabase = await createClient();

  const [countriesResult, sitesResult] = await Promise.all([
    supabase.from('study_countries').select('id', { count: 'exact', head: true }).eq('study_id', studyId),
    supabase.from('study_sites').select('id', { count: 'exact', head: true }).eq('study_id', studyId),
  ]);

  return {
    countries: countriesResult.count ?? 0,
    sites: sitesResult.count ?? 0,
  };
}
