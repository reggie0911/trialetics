/**
 * Directory persistence helpers used by server actions and CTMS site→directory sync.
 * Intentionally does not call requireEditor(); RLS + caller context apply.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { appendDirectoryAssignmentHistory } from '@/lib/actions/directory-audit';
import type { SaveDirectoryContactInput, SaveInstitutionInput } from '@/lib/types/directory';

export async function insertInstitutionRecord(
  supabase: SupabaseClient,
  companyId: string,
  input: SaveInstitutionInput
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from('institutions')
    .insert({
      company_id: companyId,
      name: input.name.trim(),
      organization_type: input.organization_type,
      address_line1: input.address_line1?.trim() || null,
      address_line2: input.address_line2?.trim() || null,
      city: input.city?.trim() || null,
      state_region: input.state_region?.trim() || null,
      postal_code: input.postal_code?.trim() || null,
      country_code: input.country_code?.trim() || null,
      region: input.region?.trim() || null,
      status: input.status ?? 'active',
      notes: input.notes?.trim() || null,
      parent_institution_id: input.parent_institution_id ?? null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}

export async function updateInstitutionRecord(
  supabase: SupabaseClient,
  companyId: string,
  institutionId: string,
  input: SaveInstitutionInput
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('institutions')
    .update({
      name: input.name.trim(),
      organization_type: input.organization_type,
      address_line1: input.address_line1?.trim() || null,
      address_line2: input.address_line2?.trim() || null,
      city: input.city?.trim() || null,
      state_region: input.state_region?.trim() || null,
      postal_code: input.postal_code?.trim() || null,
      country_code: input.country_code?.trim() || null,
      region: input.region?.trim() || null,
      status: input.status ?? 'active',
      notes: input.notes?.trim() || null,
      parent_institution_id: input.parent_institution_id ?? null,
    })
    .eq('id', institutionId)
    .eq('company_id', companyId);

  return { error: error?.message ?? null };
}

export async function insertDirectoryContactRecord(
  supabase: SupabaseClient,
  companyId: string,
  input: SaveDirectoryContactInput
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from('directory_contacts')
    .insert({
      company_id: companyId,
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      title: input.title?.trim() || null,
      email: input.email?.trim() || null,
      avatar_url: input.avatar_url?.trim() || null,
      phone: input.phone?.trim() || null,
      department: input.department?.trim() || null,
      country_code: input.country_code?.trim() || null,
      region: input.region?.trim() || null,
      status: input.status ?? 'active',
      notes: input.notes?.trim() || null,
      primary_directory_role_id: input.primary_directory_role_id ?? null,
      primary_institution_id: input.primary_institution_id ?? null,
      profile_id: input.profile_id ?? null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}

export async function updateDirectoryContactRecord(
  supabase: SupabaseClient,
  companyId: string,
  directoryContactId: string,
  input: SaveDirectoryContactInput
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('directory_contacts')
    .update({
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      title: input.title?.trim() || null,
      email: input.email?.trim() || null,
      avatar_url: input.avatar_url?.trim() || null,
      phone: input.phone?.trim() || null,
      department: input.department?.trim() || null,
      country_code: input.country_code?.trim() || null,
      region: input.region?.trim() || null,
      status: input.status ?? 'active',
      notes: input.notes?.trim() || null,
      primary_directory_role_id: input.primary_directory_role_id ?? null,
      primary_institution_id: input.primary_institution_id ?? null,
      profile_id: input.profile_id ?? null,
    })
    .eq('id', directoryContactId)
    .eq('company_id', companyId);

  return { error: error?.message ?? null };
}

/** Partial update for site-contact ↔ directory sync (name parts + email + phone only). */
export async function patchDirectoryContactFromSitePerson(
  supabase: SupabaseClient,
  companyId: string,
  directoryContactId: string,
  patch: {
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from('directory_contacts')
    .update({
      first_name: patch.first_name.trim(),
      last_name: patch.last_name.trim(),
      email: patch.email?.trim() || null,
      phone: patch.phone?.trim() || null,
    })
    .eq('id', directoryContactId)
    .eq('company_id', companyId);
  if (error) console.error('patchDirectoryContactFromSitePerson', error.message);
}

export async function ensureDirectoryContactStudyLink(
  supabase: SupabaseClient,
  companyId: string,
  directoryContactId: string,
  studyId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from('directory_contact_study')
    .select('id')
    .eq('directory_contact_id', directoryContactId)
    .eq('study_id', studyId)
    .maybeSingle();
  if (existing?.id) return;

  const payload = {
    directory_contact_id: directoryContactId,
    study_id: studyId,
    directory_role_id: null as string | null,
    start_date: null as string | null,
    end_date: null as string | null,
    is_active: true,
    notes: null as string | null,
  };

  const { data, error } = await supabase.from('directory_contact_study').insert(payload).select('id').single();
  if (error) {
    console.error('ensureDirectoryContactStudyLink', error.message);
    return;
  }
  await appendDirectoryAssignmentHistory({
    companyId,
    assignmentType: 'contact_study',
    junctionId: data!.id,
    action: 'insert',
    snapshot: payload,
  });
}

export async function ensureDirectoryContactStudySiteLink(
  supabase: SupabaseClient,
  companyId: string,
  directoryContactId: string,
  studySiteId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from('directory_contact_study_site')
    .select('id')
    .eq('directory_contact_id', directoryContactId)
    .eq('study_site_id', studySiteId)
    .maybeSingle();
  if (existing?.id) return;

  const payload = {
    directory_contact_id: directoryContactId,
    study_site_id: studySiteId,
    directory_role_id: null as string | null,
    start_date: null as string | null,
    end_date: null as string | null,
    is_active: true,
  };

  const { data, error } = await supabase.from('directory_contact_study_site').insert(payload).select('id').single();
  if (error) {
    console.error('ensureDirectoryContactStudySiteLink', error.message);
    return;
  }
  await appendDirectoryAssignmentHistory({
    companyId,
    assignmentType: 'contact_site',
    junctionId: data!.id,
    action: 'insert',
    snapshot: payload,
  });
}

export async function ensureInstitutionStudySiteLink(
  supabase: SupabaseClient,
  companyId: string,
  institutionId: string,
  studySiteId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from('institution_study_site')
    .select('id')
    .eq('institution_id', institutionId)
    .eq('study_site_id', studySiteId)
    .maybeSingle();
  if (existing?.id) return;

  const payload = {
    institution_id: institutionId,
    study_site_id: studySiteId,
    notes: null as string | null,
  };

  const { data, error } = await supabase.from('institution_study_site').insert(payload).select('id').single();
  if (error) {
    console.error('ensureInstitutionStudySiteLink', error.message);
    return;
  }
  await appendDirectoryAssignmentHistory({
    companyId,
    assignmentType: 'institution_site',
    junctionId: data!.id,
    action: 'insert',
    snapshot: payload,
  });
}

export async function ensureInstitutionStudyOtherLink(
  supabase: SupabaseClient,
  companyId: string,
  institutionId: string,
  studyId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from('institution_study')
    .select('id')
    .eq('institution_id', institutionId)
    .eq('study_id', studyId)
    .eq('relationship_type', 'other')
    .maybeSingle();
  if (existing?.id) return;

  const payload = {
    institution_id: institutionId,
    study_id: studyId,
    relationship_type: 'other' as const,
    start_date: null as string | null,
    end_date: null as string | null,
    notes: null as string | null,
  };

  const { data, error } = await supabase.from('institution_study').insert(payload).select('id').single();
  if (error) {
    console.error('ensureInstitutionStudyOtherLink', error.message);
    return;
  }
  await appendDirectoryAssignmentHistory({
    companyId,
    assignmentType: 'institution_study',
    junctionId: data!.id,
    action: 'insert',
    snapshot: payload,
  });
}

/** Ensures this institution is the contact's primary directory organization link. */
export async function ensureDirectoryContactPrimaryInstitution(
  supabase: SupabaseClient,
  companyId: string,
  directoryContactId: string,
  institutionId: string
): Promise<void> {
  const { data: existingRow } = await supabase
    .from('directory_contact_institution')
    .select('id')
    .eq('directory_contact_id', directoryContactId)
    .eq('institution_id', institutionId)
    .maybeSingle();

  await supabase
    .from('directory_contact_institution')
    .update({ is_primary: false })
    .eq('directory_contact_id', directoryContactId);

  if (existingRow?.id) {
    const { error } = await supabase
      .from('directory_contact_institution')
      .update({ is_primary: true })
      .eq('id', existingRow.id);
    if (error) console.error('ensureDirectoryContactPrimaryInstitution', error.message);
  } else {
    const payload = {
      directory_contact_id: directoryContactId,
      institution_id: institutionId,
      is_primary: true,
    };
    const { data, error } = await supabase.from('directory_contact_institution').insert(payload).select('id').single();
    if (error) {
      console.error('ensureDirectoryContactPrimaryInstitution insert', error.message);
      return;
    }
    await appendDirectoryAssignmentHistory({
      companyId,
      assignmentType: 'contact_institution',
      junctionId: data!.id,
      action: 'insert',
      snapshot: payload,
    });
  }

  const { error: primErr } = await supabase
    .from('directory_contacts')
    .update({ primary_institution_id: institutionId })
    .eq('id', directoryContactId)
    .eq('company_id', companyId);
  if (primErr) console.error('ensureDirectoryContactPrimaryInstitution primary_institution_id', primErr.message);
}
