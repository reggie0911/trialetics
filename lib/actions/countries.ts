'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type {
  Study,
  StudyCountry,
  CountryStatus,
  RegulatoryStatus,
  RegulatorySubmission,
  SubmissionType,
  SubmissionStatus,
  StudyCountryWithSubmissions,
} from '@/lib/types/ctms';

export interface AddStudyCountryInput {
  study_id: string;
  country_code: string;
  country_name: string;
  status?: CountryStatus;
  regulatory_status?: RegulatoryStatus;
}

export interface UpdateStudyCountryInput {
  id: string;
  study_id: string;
  status?: CountryStatus;
  regulatory_status?: RegulatoryStatus;
}

export interface AddSubmissionInput {
  study_country_id: string;
  study_id: string;
  submission_type: SubmissionType;
  submission_date?: string;
  approval_date?: string;
  expiry_date?: string;
  status?: SubmissionStatus;
  reference_number?: string;
  notes?: string;
}

export interface UpdateSubmissionInput {
  id: string;
  study_id: string;
  submission_type?: SubmissionType;
  submission_date?: string;
  approval_date?: string;
  expiry_date?: string;
  status?: SubmissionStatus;
  reference_number?: string;
  notes?: string;
}

export interface StudyCountryWithStudy extends StudyCountry {
  studies: Pick<Study, 'protocol_number' | 'title'>;
  regulatory_submissions: RegulatorySubmission[];
}

export async function getAllCountries(): Promise<StudyCountryWithStudy[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('study_countries')
    .select('*, studies(protocol_number, title), regulatory_submissions(*)')
    .order('country_name');

  if (error) throw new Error(error.message);
  return (data as unknown as StudyCountryWithStudy[]) ?? [];
}

export async function getStudyCountries(studyId: string): Promise<StudyCountryWithSubmissions[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('study_countries')
    .select('*, regulatory_submissions(*)')
    .eq('study_id', studyId)
    .order('country_name');

  if (error) throw new Error(error.message);
  return (data as unknown as StudyCountryWithSubmissions[]) ?? [];
}

export async function addStudyCountry(
  input: AddStudyCountryInput
): Promise<{ data: StudyCountry | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('study_countries')
      .insert({
        study_id: input.study_id,
        country_code: input.country_code,
        country_name: input.country_name,
        status: input.status || 'planned',
        regulatory_status: input.regulatory_status || 'not_started',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'This country is already added to the study.' };
      }
      return { data: null, error: error.message };
    }

    revalidatePath(`/protected/studies/${input.study_id}`);
    return { data: data as unknown as StudyCountry, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function updateStudyCountry(
  input: UpdateStudyCountryInput
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  try {
    const { id, study_id, ...updates } = input;
    const cleanUpdates: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = String(value) === '' ? null : value;
      }
    }

    const { error } = await supabase
      .from('study_countries')
      .update(cleanUpdates)
      .eq('id', id);

    if (error) return { error: error.message };

    revalidatePath(`/protected/studies/${study_id}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function removeStudyCountry(
  id: string,
  studyId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('study_countries')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };

    revalidatePath(`/protected/studies/${studyId}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function addSubmission(
  input: AddSubmissionInput
): Promise<{ data: RegulatorySubmission | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const { study_id, ...insertData } = input;

    const { data, error } = await supabase
      .from('regulatory_submissions')
      .insert({
        study_country_id: insertData.study_country_id,
        submission_type: insertData.submission_type,
        submission_date: insertData.submission_date || null,
        approval_date: insertData.approval_date || null,
        expiry_date: insertData.expiry_date || null,
        status: insertData.status || 'pending',
        reference_number: insertData.reference_number || null,
        notes: insertData.notes || null,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath(`/protected/studies/${study_id}`);
    return { data: data as unknown as RegulatorySubmission, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function updateSubmission(
  input: UpdateSubmissionInput
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  try {
    const { id, study_id, ...updates } = input;
    const cleanUpdates: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = String(value) === '' ? null : value;
      }
    }

    const { error } = await supabase
      .from('regulatory_submissions')
      .update(cleanUpdates)
      .eq('id', id);

    if (error) return { error: error.message };

    revalidatePath(`/protected/studies/${study_id}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteSubmission(
  id: string,
  studyId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('regulatory_submissions')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };

    revalidatePath(`/protected/studies/${studyId}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}
