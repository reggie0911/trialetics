'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type {
  Subject,
  Study,
  StudySite,
  SubjectStatus,
  SubjectWithSite,
  SubjectWithDetails,
  SubjectVisit,
  VisitStatus,
  EnrollmentFunnelData,
} from '@/lib/types/ctms';

// --------------- Subjects ---------------

export interface SubjectWithStudySite extends Subject {
  study_sites: Pick<StudySite, 'site_number' | 'name'>;
  studies: Pick<Study, 'protocol_number' | 'title'>;
}

export async function getSubjectCountBySite(siteId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('subjects')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', siteId)
    .in('status', ['randomized', 'active', 'completed']);
  if (error) return 0;
  return count ?? 0;
}

export async function getAllSubjects(): Promise<SubjectWithStudySite[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subjects')
    .select('*, study_sites(site_number, name), studies(protocol_number, title)')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as unknown as SubjectWithStudySite[]) ?? [];
}

export interface SubjectFilters {
  search?: string;
  status?: SubjectStatus;
  siteId?: string;
}

export async function getStudySubjects(
  studyId: string,
  filters?: SubjectFilters
): Promise<SubjectWithSite[]> {
  const supabase = await createClient();

  let query = supabase
    .from('subjects')
    .select('*, study_sites(site_number, name)')
    .eq('study_id', studyId)
    .order('subject_number');

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.siteId) {
    query = query.eq('site_id', filters.siteId);
  }

  if (filters?.search) {
    query = query.or(
      `subject_number.ilike.%${filters.search}%,screening_number.ilike.%${filters.search}%,randomization_number.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as unknown as SubjectWithSite[]) ?? [];
}

export async function getSubjectById(id: string): Promise<SubjectWithDetails | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subjects')
    .select('*, study_sites(site_number, name), subject_visits(*)')
    .eq('id', id)
    .order('visit_number', { referencedTable: 'subject_visits', ascending: true })
    .single();

  if (error) return null;
  return data as unknown as SubjectWithDetails;
}

export async function getEnrollmentFunnel(studyId: string): Promise<EnrollmentFunnelData> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subjects')
    .select('status')
    .eq('study_id', studyId);

  if (error) throw new Error(error.message);

  const counts: EnrollmentFunnelData = {
    preScreening: 0,
    screening: 0,
    screenFailed: 0,
    randomized: 0,
    active: 0,
    completed: 0,
    withdrawn: 0,
    discontinued: 0,
    total: data?.length ?? 0,
  };

  for (const row of data ?? []) {
    switch (row.status) {
      case 'pre_screening': counts.preScreening++; break;
      case 'screening': counts.screening++; break;
      case 'screen_failed': counts.screenFailed++; break;
      case 'randomized': counts.randomized++; break;
      case 'active': counts.active++; break;
      case 'completed': counts.completed++; break;
      case 'withdrawn': counts.withdrawn++; break;
      case 'discontinued': counts.discontinued++; break;
    }
  }

  return counts;
}

export interface CreateSubjectInput {
  study_id: string;
  site_id: string;
  subject_number: string;
  screening_number?: string;
  randomization_number?: string;
  status?: SubjectStatus;
  screening_date?: string;
  randomization_date?: string;
}

export async function createSubject(
  input: CreateSubjectInput
): Promise<{ data: Subject | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('subjects')
      .insert({
        study_id: input.study_id,
        site_id: input.site_id,
        subject_number: input.subject_number,
        screening_number: input.screening_number || null,
        randomization_number: input.randomization_number || null,
        status: input.status || 'pre_screening',
        screening_date: input.screening_date || null,
        randomization_date: input.randomization_date || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'A subject with this number already exists in this study.' };
      }
      return { data: null, error: error.message };
    }

    revalidatePath('/protected');
    revalidatePath(`/protected/studies/${input.study_id}`);
    return { data: data as unknown as Subject, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export interface UpdateSubjectInput {
  id: string;
  study_id: string;
  site_id?: string;
  subject_number?: string;
  screening_number?: string;
  randomization_number?: string;
  status?: SubjectStatus;
  screening_date?: string;
  randomization_date?: string;
  completion_date?: string;
  withdrawal_date?: string;
  withdrawal_reason?: string;
}

export async function updateSubject(
  input: UpdateSubjectInput
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  try {
    const { id, study_id, ...updates } = input;
    const cleanUpdates: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value === '' ? null : value;
      }
    }

    const { error } = await supabase
      .from('subjects')
      .update(cleanUpdates)
      .eq('id', id);

    if (error) {
      if (error.code === '23505') {
        return { error: 'A subject with this number already exists in this study.' };
      }
      return { error: error.message };
    }

    revalidatePath(`/protected/studies/${study_id}`);
    revalidatePath(`/protected/subjects/${id}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteSubject(
  id: string,
  studyId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };

    revalidatePath(`/protected/studies/${studyId}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// --------------- Visits ---------------

export interface AddVisitInput {
  subject_id: string;
  visit_name: string;
  visit_number: number;
  planned_date?: string;
  actual_date?: string;
  status?: VisitStatus;
  window_start?: string;
  window_end?: string;
  notes?: string;
}

export async function addSubjectVisit(
  input: AddVisitInput,
  subjectId: string
): Promise<{ data: SubjectVisit | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('subject_visits')
      .insert({
        subject_id: input.subject_id,
        visit_name: input.visit_name,
        visit_number: input.visit_number,
        planned_date: input.planned_date || null,
        actual_date: input.actual_date || null,
        status: input.status || 'scheduled',
        window_start: input.window_start || null,
        window_end: input.window_end || null,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath(`/protected/subjects/${subjectId}`);
    return { data: data as unknown as SubjectVisit, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function updateSubjectVisit(
  id: string,
  subjectId: string,
  updates: Partial<Omit<AddVisitInput, 'subject_id'>>
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  try {
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value === '' ? null : value;
      }
    }

    const { error } = await supabase
      .from('subject_visits')
      .update(cleanUpdates)
      .eq('id', id);

    if (error) return { error: error.message };

    revalidatePath(`/protected/subjects/${subjectId}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteSubjectVisit(
  id: string,
  subjectId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('subject_visits')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };

    revalidatePath(`/protected/subjects/${subjectId}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

