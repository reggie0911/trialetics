'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type { Study, StudyPhase, StudyStatus } from '@/lib/types/ctms';

export interface CreateStudyInput {
  protocol_number: string;
  title: string;
  phase: StudyPhase;
  therapeutic_area?: string;
  indication?: string;
  status?: StudyStatus;
  sponsor?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

export interface UpdateStudyInput extends Partial<CreateStudyInput> {
  id: string;
}

export interface StudyFilters {
  search?: string;
  status?: StudyStatus;
  phase?: StudyPhase;
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
      `title.ilike.%${filters.search}%,protocol_number.ilike.%${filters.search}%,sponsor.ilike.%${filters.search}%,therapeutic_area.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data as unknown as Study[]) ?? [];
}

export async function getStudyById(id: string): Promise<Study | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('studies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as unknown as Study;
}

export async function createStudy(input: CreateStudyInput): Promise<{ data: Study | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const companyId = await getCompanyId();

    const { data, error } = await supabase
      .from('studies')
      .insert({
        company_id: companyId,
        protocol_number: input.protocol_number,
        title: input.title,
        phase: input.phase,
        therapeutic_area: input.therapeutic_area || null,
        indication: input.indication || null,
        status: input.status || 'draft',
        sponsor: input.sponsor || null,
        start_date: input.start_date || null,
        end_date: input.end_date || null,
        description: input.description || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'A study with this protocol number already exists.' };
      }
      return { data: null, error: error.message };
    }

    revalidatePath('/protected');
    revalidatePath('/protected/studies');
    return { data: data as unknown as Study, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function updateStudy(input: UpdateStudyInput): Promise<{ data: Study | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const { id, ...updates } = input;
    const cleanUpdates: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value === '' ? null : value;
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

    revalidatePath('/protected');
    revalidatePath('/protected/studies');
    revalidatePath(`/protected/studies/${id}`);
    return { data: data as unknown as Study, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteStudy(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();

  try {
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

export async function closeStudy(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('studies')
      .update({ status: 'closed' })
      .eq('id', id);

    if (error) return { error: error.message };

    revalidatePath('/protected');
    revalidatePath('/protected/studies');
    revalidatePath(`/protected/studies/${id}`);
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
