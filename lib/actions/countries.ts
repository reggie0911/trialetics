'use server';

import { createClient } from '@/lib/server';
import { assertStudyWritableForCurrentUser } from '@/lib/server/study-write-guard';
import { revalidateStudyCtmsLayout } from '@/lib/cache/revalidate-ctms';
import { computeRegulatoryStatusFromSubmissionStatuses } from '@/lib/regulatory/rollup';
import {
  enrichCountriesWithSites,
  type EnrichedCountryRow,
} from '@/lib/countries/enrich';
import type {
  Study,
  StudyCountry,
  CountryStatus,
  RegulatoryStatus,
  RegulatorySubmission,
  StudySite,
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

async function syncStudyCountryRegulatoryStatus(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  studyId: string;
  studyCountryId: string;
}): Promise<{ error: string | null }> {
  const { supabase, studyId, studyCountryId } = params;

  const { data: submissions, error: submissionsError } = await supabase
    .from('regulatory_submissions')
    .select('status')
    .eq('study_country_id', studyCountryId);

  if (submissionsError) return { error: submissionsError.message };

  const statuses =
    (submissions as Array<{ status: SubmissionStatus }> | null)?.map((s) => s.status) ?? [];
  const regulatoryStatus = computeRegulatoryStatusFromSubmissionStatuses(statuses);

  const { error: updateError } = await supabase
    .from('study_countries')
    .update({ regulatory_status: regulatoryStatus })
    .eq('id', studyCountryId)
    .eq('study_id', studyId);

  if (updateError) return { error: updateError.message };
  return { error: null };
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

export type CountryDashboardRow = EnrichedCountryRow;

export async function getCountriesDashboard(studyId: string): Promise<CountryDashboardRow[]> {
  const supabase = await createClient();

  const [countriesResult, sitesResult] = await Promise.all([
    supabase
      .from('study_countries')
      .select('*, regulatory_submissions(*)')
      .eq('study_id', studyId)
      .order('country_name'),
    supabase
      .from('study_sites')
      .select('study_country_id, status')
      .eq('study_id', studyId),
  ]);

  if (countriesResult.error) throw new Error(countriesResult.error.message);
  if (sitesResult.error) throw new Error(sitesResult.error.message);

  const countries = (countriesResult.data as unknown as StudyCountryWithSubmissions[]) ?? [];
  const sites =
    (sitesResult.data as unknown as Pick<StudySite, 'study_country_id' | 'status'>[]) ?? [];

  return enrichCountriesWithSites(countries, sites);
}

export async function addStudyCountry(
  input: AddStudyCountryInput
): Promise<{ data: StudyCountry | null; error: string | null }> {
  const supabase = await createClient();

  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, input.study_id);
    if (writeGuard) return { data: null, error: writeGuard };

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

    revalidateStudyCtmsLayout(input.study_id);
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
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, input.study_id);
    if (writeGuard) return { error: writeGuard };

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

    revalidateStudyCtmsLayout(study_id);
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
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const { error } = await supabase
      .from('study_countries')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };

    revalidateStudyCtmsLayout(studyId);
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
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, study_id);
    if (writeGuard) return { data: null, error: writeGuard };

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

    const { error: syncError } = await syncStudyCountryRegulatoryStatus({
      supabase,
      studyId: study_id,
      studyCountryId: insertData.study_country_id,
    });
    if (syncError) return { data: null, error: syncError };

    revalidateStudyCtmsLayout(study_id);
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
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, input.study_id);
    if (writeGuard) return { error: writeGuard };

    const { data: existingSubmission, error: existingSubmissionError } = await supabase
      .from('regulatory_submissions')
      .select('study_country_id')
      .eq('id', input.id)
      .single();
    if (existingSubmissionError) return { error: existingSubmissionError.message };

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

    const { error: syncError } = await syncStudyCountryRegulatoryStatus({
      supabase,
      studyId: study_id,
      studyCountryId: (existingSubmission as { study_country_id: string }).study_country_id,
    });
    if (syncError) return { error: syncError };

    revalidateStudyCtmsLayout(study_id);
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
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const { data: existingSubmission, error: existingSubmissionError } = await supabase
      .from('regulatory_submissions')
      .select('study_country_id')
      .eq('id', id)
      .single();
    if (existingSubmissionError) return { error: existingSubmissionError.message };

    const { error } = await supabase
      .from('regulatory_submissions')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };

    const { error: syncError } = await syncStudyCountryRegulatoryStatus({
      supabase,
      studyId,
      studyCountryId: (existingSubmission as { study_country_id: string }).study_country_id,
    });
    if (syncError) return { error: syncError };

    revalidateStudyCtmsLayout(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}
