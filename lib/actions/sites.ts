'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import { syncInstitutionForStudySite, syncSiteContactToDirectory } from '@/lib/actions/site-directory-sync';
import {
  SITE_CONTACT_ROLE_PRINCIPAL_INVESTIGATOR,
  type StudySite,
  type SiteStatus,
  type SiteContact,
  type StudySiteWithStudy,
  type StudySiteWithDetails,
} from '@/lib/types/ctms';

// --------------- helpers ---------------

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

/**
 * Ensures a `site_contacts` row exists for the PI when `pi_name` is set on the site.
 * Does not remove or update contacts when PI name is cleared (avoids wiping user edits).
 */
async function syncPrincipalInvestigatorContact(params: {
  siteId: string;
  studyId: string;
  pi_name: string | null | undefined;
  pi_email: string | null | undefined;
  pi_directory_contact_id: string | null | undefined;
}): Promise<void> {
  const name = params.pi_name?.trim() ?? '';
  if (!name) return;

  const supabase = await createClient();
  const { data: existing, error: findError } = await supabase
    .from('site_contacts')
    .select('id')
    .eq('site_id', params.siteId)
    .eq('role', SITE_CONTACT_ROLE_PRINCIPAL_INVESTIGATOR)
    .maybeSingle();

  if (findError) {
    console.error('syncPrincipalInvestigatorContact lookup', findError.message);
    return;
  }

  const email = params.pi_email?.trim() || null;
  const directoryId = params.pi_directory_contact_id || null;

  if (existing?.id) {
    const { error } = await updateSiteContact(
      existing.id,
      params.siteId,
      {
        name,
        role: SITE_CONTACT_ROLE_PRINCIPAL_INVESTIGATOR,
        email: email ?? '',
        directory_contact_id: directoryId,
        is_primary: true,
      },
      params.studyId
    );
    if (error) console.error('syncPrincipalInvestigatorContact update', error);
  } else {
    const { error } = await addSiteContact(
      {
        site_id: params.siteId,
        name,
        role: SITE_CONTACT_ROLE_PRINCIPAL_INVESTIGATOR,
        email: email ?? undefined,
        is_primary: true,
        directory_contact_id: directoryId,
      },
      params.studyId
    );
    if (error) console.error('syncPrincipalInvestigatorContact insert', error);
  }
}

// --------------- Sites ---------------

export interface SiteFilters {
  search?: string;
  status?: SiteStatus;
  studyId?: string;
}

export async function getAllSites(filters?: SiteFilters): Promise<StudySiteWithStudy[]> {
  const supabase = await createClient();

  let query = supabase
    .from('study_sites')
    .select('*, studies(title, protocol_number), study_countries(country_name, country_code)')
    .order('updated_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.studyId) {
    query = query.eq('study_id', filters.studyId);
  }

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,site_number.ilike.%${filters.search}%,pi_name.ilike.%${filters.search}%,city.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as unknown as StudySiteWithStudy[]) ?? [];
}

export async function getStudySites(studyId: string): Promise<StudySite[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('study_sites')
    .select('*')
    .eq('study_id', studyId)
    .order('site_number');

  if (error) throw new Error(error.message);
  return (data as unknown as StudySite[]) ?? [];
}

export async function getSiteById(id: string): Promise<StudySiteWithDetails | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('study_sites')
    .select('*, study_countries(country_name, country_code), site_contacts(*)')
    .eq('id', id)
    .order('is_primary', { referencedTable: 'site_contacts', ascending: false })
    .single();

  if (error) return null;
  return data as unknown as StudySiteWithDetails;
}

export interface CreateSiteInput {
  study_id: string;
  study_country_id?: string;
  site_number: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  pi_name?: string;
  pi_email?: string;
  pi_directory_contact_id?: string | null;
  status?: SiteStatus;
  activation_date?: string;
  target_enrollment?: number;
}

export async function createSite(
  input: CreateSiteInput
): Promise<{ data: StudySite | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const companyId = await getCompanyId();

    const { data, error } = await supabase
      .from('study_sites')
      .insert({
        study_id: input.study_id,
        study_country_id: input.study_country_id || null,
        site_number: input.site_number,
        name: input.name,
        address: input.address || null,
        city: input.city || null,
        state: input.state || null,
        postal_code: input.postal_code || null,
        pi_name: input.pi_name || null,
        pi_email: input.pi_email || null,
        pi_directory_contact_id: input.pi_directory_contact_id || null,
        status: input.status || 'identified',
        activation_date: input.activation_date || null,
        target_enrollment: input.target_enrollment ?? 0,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'A site with this number already exists for this study.' };
      }
      return { data: null, error: error.message };
    }

    const row = data as unknown as StudySite;
    await syncInstitutionForStudySite(supabase, companyId, row, input.study_id);
    await syncPrincipalInvestigatorContact({
      siteId: row.id,
      studyId: input.study_id,
      pi_name: input.pi_name,
      pi_email: input.pi_email,
      pi_directory_contact_id: input.pi_directory_contact_id ?? null,
    });

    revalidatePath('/protected');
    revalidatePath('/protected/sites');
    revalidatePath(`/protected/studies/${input.study_id}`);
    revalidatePath(`/protected/sites/${row.id}`);
    return { data: row, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export interface UpdateSiteInput {
  id: string;
  study_id: string;
  study_country_id?: string;
  site_number?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  pi_name?: string;
  pi_email?: string;
  pi_directory_contact_id?: string | null;
  status?: SiteStatus;
  activation_date?: string;
  target_enrollment?: number;
  nearest_airport_place_id?: string;
  nearest_airport_name?: string;
  nearest_airport_address?: string;
  nearest_hotel_place_id?: string;
  nearest_hotel_name?: string;
  nearest_hotel_address?: string;
  travel_notes?: string;
}

export async function updateSite(
  input: UpdateSiteInput
): Promise<{ data: StudySite | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const companyId = await getCompanyId();
    const { id, study_id, ...updates } = input;
    const cleanUpdates: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value === '' ? null : value;
      }
    }

    const { data, error } = await supabase
      .from('study_sites')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'A site with this number already exists for this study.' };
      }
      return { data: null, error: error.message };
    }

    const row = data as unknown as StudySite;
    await syncPrincipalInvestigatorContact({
      siteId: id,
      studyId: study_id,
      pi_name: row.pi_name,
      pi_email: row.pi_email,
      pi_directory_contact_id: row.pi_directory_contact_id,
    });

    revalidatePath('/protected');
    revalidatePath('/protected/sites');
    revalidatePath(`/protected/sites/${id}`);
    revalidatePath(`/protected/studies/${study_id}`);
    return { data: row, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteSite(
  id: string,
  studyId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from('study_sites')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };

    revalidatePath('/protected');
    revalidatePath('/protected/sites');
    revalidatePath(`/protected/studies/${studyId}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// --------------- Contacts ---------------

export interface AddContactInput {
  site_id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  is_primary?: boolean;
  directory_contact_id?: string | null;
}

export async function addSiteContact(
  input: AddContactInput,
  studyId: string
): Promise<{ data: SiteContact | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const companyId = await getCompanyId();
    const { data, error } = await supabase
      .from('site_contacts')
      .insert({
        site_id: input.site_id,
        name: input.name,
        role: input.role,
        email: input.email || null,
        phone: input.phone || null,
        is_primary: input.is_primary ?? false,
        directory_contact_id: input.directory_contact_id || null,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    const row = data as unknown as SiteContact;
    await syncSiteContactToDirectory(supabase, companyId, row, studyId);

    revalidatePath(`/protected/sites/${input.site_id}`);
    return { data: row, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function updateSiteContact(
  id: string,
  siteId: string,
  updates: Partial<Omit<AddContactInput, 'site_id'>>,
  studyId?: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const companyId = await getCompanyId();
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value === '' ? null : value;
      }
    }

    const { error } = await supabase
      .from('site_contacts')
      .update(cleanUpdates)
      .eq('id', id);

    if (error) return { error: error.message };

    let resolvedStudyId = studyId;
    if (!resolvedStudyId) {
      const { data: ss } = await supabase.from('study_sites').select('study_id').eq('id', siteId).maybeSingle();
      resolvedStudyId = ss?.study_id;
    }

    if (resolvedStudyId) {
      const { data: row } = await supabase.from('site_contacts').select('*').eq('id', id).single();
      if (row) {
        await syncSiteContactToDirectory(supabase, companyId, row as unknown as SiteContact, resolvedStudyId);
      }
    }

    revalidatePath(`/protected/sites/${siteId}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteSiteContact(
  id: string,
  siteId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from('site_contacts')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };

    revalidatePath(`/protected/sites/${siteId}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

