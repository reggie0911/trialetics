'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';

import { appendDirectoryAuditLog } from '@/lib/actions/directory-audit';
import {
  ensureDirectoryContactPrimaryInstitution,
  ensureDirectoryContactStudyLink,
  ensureDirectoryContactStudySiteLink,
  ensureInstitutionStudyOtherLink,
  ensureInstitutionStudySiteLink,
  insertDirectoryContactRecord,
  insertInstitutionRecord,
  patchDirectoryContactFromSitePerson,
  updateInstitutionRecord,
} from '@/lib/actions/directory-writers-internal';
import type { SiteContact, StudySite } from '@/lib/types/ctms';
import type { SaveDirectoryContactInput, SaveInstitutionInput } from '@/lib/types/directory';

function parseFullName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: 'Unknown', last_name: '-' };
  if (parts.length === 1) return { first_name: parts[0], last_name: '-' };
  const last_name = parts.pop()!;
  const first_name = parts.join(' ');
  return { first_name, last_name };
}

async function resolveCountryCode(
  supabase: SupabaseClient,
  studyCountryId: string | null
): Promise<string | null> {
  if (!studyCountryId) return null;
  const { data } = await supabase
    .from('study_countries')
    .select('country_code')
    .eq('id', studyCountryId)
    .maybeSingle();
  return data?.country_code?.trim() || null;
}

function institutionInputFromStudySite(site: StudySite, countryCode: string | null): SaveInstitutionInput {
  return {
    name: site.name.trim(),
    organization_type: 'clinical_site',
    address_line1: site.address?.trim() || undefined,
    address_line2: undefined,
    city: site.city?.trim() || undefined,
    state_region: site.state?.trim() || undefined,
    postal_code: site.postal_code?.trim() || undefined,
    country_code: countryCode ?? undefined,
    region: undefined,
    status: 'active',
    notes: undefined,
    parent_institution_id: null,
  };
}

export async function syncInstitutionForStudySite(
  supabase: SupabaseClient,
  companyId: string,
  site: StudySite,
  studyId: string
): Promise<void> {
  try {
    const { data: existingLink } = await supabase
      .from('institution_study_site')
      .select('institution_id')
      .eq('study_site_id', site.id)
      .limit(1)
      .maybeSingle();

    const countryCode = await resolveCountryCode(supabase, site.study_country_id);
    const instInput = institutionInputFromStudySite(site, countryCode);

    let institutionId: string;

    if (existingLink?.institution_id) {
      institutionId = existingLink.institution_id;
      const { data: existingInst } = await supabase.from('institutions').select('*').eq('id', institutionId).maybeSingle();
      const upd = await updateInstitutionRecord(supabase, companyId, institutionId, instInput);
      if (upd.error) {
        console.error('syncInstitutionForStudySite update', upd.error);
      } else if (existingInst) {
        await appendDirectoryAuditLog({
          companyId,
          entityType: 'institution',
          entityId: institutionId,
          action: 'update',
          oldPayload: existingInst as Record<string, unknown>,
          newPayload: instInput as unknown as Record<string, unknown>,
        });
      }
    } else {
      const ins = await insertInstitutionRecord(supabase, companyId, instInput);
      if ('error' in ins) {
        console.error('syncInstitutionForStudySite insert', ins.error);
        return;
      }
      institutionId = ins.id;
      await appendDirectoryAuditLog({
        companyId,
        entityType: 'institution',
        entityId: institutionId,
        action: 'insert',
        oldPayload: {},
        newPayload: instInput as unknown as Record<string, unknown>,
      });
    }

    await ensureInstitutionStudySiteLink(supabase, companyId, institutionId, site.id);
    await ensureInstitutionStudyOtherLink(supabase, companyId, institutionId, studyId);
    revalidatePath('/protected/directory');
  } catch (e) {
    console.error('syncInstitutionForStudySite', e);
  }
}

async function findDirectoryContactIdByEmail(
  supabase: SupabaseClient,
  companyId: string,
  email: string
): Promise<string | null> {
  const t = email.trim();
  if (!t) return null;
  const { data } = await supabase
    .from('directory_contacts')
    .select('id')
    .eq('company_id', companyId)
    .ilike('email', t)
    .maybeSingle();
  return data?.id ?? null;
}

async function getInstitutionIdForStudySite(
  supabase: SupabaseClient,
  studySiteId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('institution_study_site')
    .select('institution_id')
    .eq('study_site_id', studySiteId)
    .limit(1)
    .maybeSingle();
  return data?.institution_id ?? null;
}

export async function syncSiteContactToDirectory(
  supabase: SupabaseClient,
  companyId: string,
  contact: SiteContact,
  studyId: string
): Promise<void> {
  try {
    const institutionId = await getInstitutionIdForStudySite(supabase, contact.site_id);
    let directoryContactId: string | null = contact.directory_contact_id;
    let skipPatch = false;

    if (!directoryContactId && contact.email?.trim()) {
      const emailMatch = await findDirectoryContactIdByEmail(supabase, companyId, contact.email);
      if (emailMatch) {
        directoryContactId = emailMatch;
        skipPatch = true;
        await supabase
          .from('site_contacts')
          .update({ directory_contact_id: directoryContactId })
          .eq('id', contact.id);
      }
    }

    if (!directoryContactId) {
      const { first_name, last_name } = parseFullName(contact.name);
      const notes = contact.role?.trim() ? `Site role: ${contact.role.trim()}` : undefined;
      const input: SaveDirectoryContactInput = {
        first_name,
        last_name,
        title: contact.role?.trim() || undefined,
        email: contact.email?.trim() || undefined,
        phone: contact.phone?.trim() || undefined,
        primary_institution_id: institutionId,
        notes,
        status: 'active',
      };
      const ins = await insertDirectoryContactRecord(supabase, companyId, input);
      if ('error' in ins) {
        console.error('syncSiteContactToDirectory insert contact', ins.error);
        return;
      }
      directoryContactId = ins.id;
      await appendDirectoryAuditLog({
        companyId,
        entityType: 'directory_contact',
        entityId: directoryContactId,
        action: 'insert',
        oldPayload: {},
        newPayload: input as unknown as Record<string, unknown>,
      });
      await supabase
        .from('site_contacts')
        .update({ directory_contact_id: directoryContactId })
        .eq('id', contact.id);
      skipPatch = true;
    }

    if (directoryContactId && !skipPatch) {
      const { first_name, last_name } = parseFullName(contact.name);
      await patchDirectoryContactFromSitePerson(supabase, companyId, directoryContactId, {
        first_name,
        last_name,
        email: contact.email?.trim() || null,
        phone: contact.phone?.trim() || null,
      });
    }

    if (!directoryContactId) return;

    await ensureDirectoryContactStudyLink(supabase, companyId, directoryContactId, studyId);
    await ensureDirectoryContactStudySiteLink(supabase, companyId, directoryContactId, contact.site_id);
    if (institutionId) {
      await ensureDirectoryContactPrimaryInstitution(supabase, companyId, directoryContactId, institutionId);
    }

    revalidatePath('/protected/directory');
  } catch (e) {
    console.error('syncSiteContactToDirectory', e);
  }
}
