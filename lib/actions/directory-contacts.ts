'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import { canEditDirectory, getDirectoryPermissionContext } from '@/lib/directory-permissions';
import { appendDirectoryAssignmentHistory, appendDirectoryAuditLog } from '@/lib/actions/directory-audit';
import type {
  DirectoryContactListItem,
  DirectoryContactWithRelations,
  DirectoryContactsSnapshot,
  SaveDirectoryContactInput,
} from '@/lib/types/directory';
import {
  ensureDirectoryContactPrimaryInstitution,
  ensureDirectoryContactStudyLink,
  insertDirectoryContactRecord,
  updateDirectoryContactRecord,
} from '@/lib/actions/directory-writers-internal';
import { computeContactHealth, siteRoleCoverageFromRoleNames } from '@/lib/directory/contact-health';
import { summarizeContactCompleteness } from '@/lib/directory/record-completeness';
import type { SupabaseClient } from '@supabase/supabase-js';

async function requireReader() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const ctx = await getDirectoryPermissionContext(supabase, user.id);
  if (!ctx) throw new Error('No company');
  return { supabase, user, ...ctx };
}

async function requireEditor() {
  const r = await requireReader();
  const ok = await canEditDirectory(r.supabase, {
    profileId: r.profileId,
    companyId: r.companyId,
    isAdmin: r.isAdmin,
  });
  if (!ok) throw new Error('You do not have permission to edit the directory');
  return r;
}

export interface ListDirectoryContactsParams {
  search?: string;
  status?: 'active' | 'inactive';
  primaryRoleId?: string;
  primaryInstitutionId?: string;
  studyId?: string;
  /** When set, only contacts with a `directory_contact_study_site` row for this site. */
  studySiteId?: string;
  /** In study: contacts linked to the study but with no site assignment in this study. */
  unassignedToStudySite?: boolean;
  /** Only contacts with `updated_at` in the last 7 days. */
  recent7d?: boolean;
  /** Filter by derived directory profile completeness / status. */
  health?: 'healthy' | 'needs_update' | 'at_risk';
  limit?: number;
  offset?: number;
}

export interface CreateDirectoryContactOptions {
  studyId?: string | null;
}

export interface CreateDirectoryContactResult {
  data: {
    id: string;
    linkedInstitution: boolean;
    linkedStudy: boolean;
    linkWarnings: string[];
  } | null;
  error: string | null;
  duplicateEmailWarning?: boolean;
}

async function buildContactIdSetsForStudyFilters(
  supabase: SupabaseClient,
  studyId: string,
  studySiteId?: string,
  unassignedToStudySite?: boolean
): Promise<string[] | null> {
  const { data: links, error: e1 } = await supabase
    .from('directory_contact_study')
    .select('directory_contact_id')
    .eq('study_id', studyId);
  if (e1) return null;
  let allowed = [...new Set((links ?? []).map((l) => l.directory_contact_id))];
  if (allowed.length === 0) return [];
  if (unassignedToStudySite) {
    const { data: withSite, error: e3 } = await supabase
      .from('directory_contact_study_site')
      .select('directory_contact_id, study_sites!inner(study_id)')
      .in('directory_contact_id', allowed)
      .eq('study_sites.study_id', studyId);
    if (e3) return null;
    const withSet = new Set((withSite ?? []).map((w) => w.directory_contact_id));
    allowed = allowed.filter((id) => !withSet.has(id));
  }
  if (allowed.length === 0) return [];
  if (studySiteId) {
    const { data: siteLinks, error: e2 } = await supabase
      .from('directory_contact_study_site')
      .select('directory_contact_id')
      .eq('study_site_id', studySiteId);
    if (e2) return null;
    const set = new Set((siteLinks ?? []).map((l) => l.directory_contact_id));
    allowed = allowed.filter((id) => set.has(id));
  }
  return allowed;
}

async function mergeStudyEnrichment(
  supabase: SupabaseClient,
  studyId: string,
  rows: DirectoryContactListItem[]
): Promise<void> {
  if (rows.length === 0) return;
  const ids = rows.map((r) => r.id);
  const { data: dcsRows } = await supabase
    .from('directory_contact_study')
    .select('directory_contact_id, is_active')
    .in('directory_contact_id', ids)
    .eq('study_id', studyId);
  const dcsMap = new Map((dcsRows ?? []).map((r) => [r.directory_contact_id, r.is_active as boolean]));
  const { data: dcssRows } = await supabase
    .from('directory_contact_study_site')
    .select('directory_contact_id, study_site_id, is_active, study_sites(id,name,site_number,study_id), directory_roles(name)')
    .in('directory_contact_id', ids);
  for (const row of rows) {
    const studyActive = dcsMap.get(row.id) ?? null;
    const siteLinks = (dcssRows ?? []).filter((x) => x.directory_contact_id === row.id);
    const withMeta = siteLinks
      .map((l) => {
        const ss = l.study_sites;
        const site = Array.isArray(ss) ? ss[0] : ss;
        const s = site as { id: string; name: string; site_number: string | null; study_id: string } | null;
        if (!s || s.study_id !== studyId) return null;
        const dr = l.directory_roles;
        const drOne = (Array.isArray(dr) ? dr[0] : dr) as { name?: string } | null;
        return {
          site: s,
          siteRoleName: drOne?.name ?? row.primary_role?.name ?? null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    withMeta.sort((a, b) => (a.site.name || '').localeCompare(b.site.name || ''));
    const first = withMeta[0];
    const label = first
      ? `${first.site.name}${first.site.site_number ? ` · ${first.site.site_number}` : ''}`
      : null;
    row.study_enrichment = {
      study_involvement_active: studyActive,
      primary_study_site_id: first?.site.id ?? null,
      primary_study_site_label: label,
      contact_health: computeContactHealth(row),
    };
  }
}

export async function listDirectoryContacts(
  params?: ListDirectoryContactsParams
): Promise<{ data: DirectoryContactListItem[]; count: number; error: string | null }> {
  const { supabase, companyId } = await requireReader();
  const limit = Math.min(params?.limit ?? 25, 100);
  const offset = params?.offset ?? 0;

  let allowedIds: string[] | null = null;
  if (params?.studyId) {
    const built = await buildContactIdSetsForStudyFilters(
      supabase,
      params.studyId,
      params.studySiteId,
      params.unassignedToStudySite
    );
    if (built === null) return { data: [], count: 0, error: 'Failed to load study contacts' };
    if (built.length === 0) return { data: [], count: 0, error: null };
    allowedIds = built;
  }

  let query = supabase
    .from('directory_contacts')
    .select(
      `
      *,
      primary_role:directory_roles!directory_contacts_primary_directory_role_id_fkey(id,name),
      primary_institution:institutions!directory_contacts_primary_institution_id_fkey(id,name)
    `,
      { count: 'exact' }
    )
    .eq('company_id', companyId)
    .order('last_name')
    .order('first_name');

  if (allowedIds) query = query.in('id', allowedIds);
  if (params?.status) query = query.eq('status', params.status);
  if (params?.primaryRoleId) query = query.eq('primary_directory_role_id', params.primaryRoleId);
  if (params?.primaryInstitutionId) query = query.eq('primary_institution_id', params.primaryInstitutionId);

  if (params?.recent7d) {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    query = query.gte('updated_at', d.toISOString());
  }

  if (params?.health === 'at_risk') {
    query = query.eq('status', 'inactive');
  } else if (params?.health === 'healthy') {
    query = query
      .eq('status', 'active')
      .not('primary_directory_role_id', 'is', null)
      .not('email', 'is', null)
      .neq('email', '');
  } else if (params?.health === 'needs_update') {
    query = query.eq('status', 'active');
    query = query.or('primary_directory_role_id.is.null,email.is.null,email.eq.');
  }

  if (params?.search?.trim()) {
    const raw = params.search.trim();
    const esc = raw.replace(/%/g, '\\%').replace(/_/g, '\\_');
    const t = `%${esc}%`;
    const { data: roleRows } = await supabase.from('directory_roles').select('id').ilike('name', t);
    const roleIds = (roleRows ?? []).map((r) => r.id);
    if (roleIds.length) {
      query = query.or(`first_name.ilike.${t},last_name.ilike.${t},email.ilike.${t},primary_directory_role_id.in.(${roleIds.join(',')})`);
    } else {
      query = query.or(`first_name.ilike.${t},last_name.ilike.${t},email.ilike.${t}`);
    }
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) return { data: [], count: 0, error: error.message };

  const rows = (data ?? []) as DirectoryContactListItem[];
  if (params?.studyId) {
    await mergeStudyEnrichment(supabase, params.studyId, rows);
  }

  return { data: rows, count: count ?? 0, error: null };
}

const DIRECTORY_CONTACTS_EXPORT_PAGE = 100;
const DIRECTORY_CONTACTS_EXPORT_MAX_ROWS = 10_000;

/** Pages through study-scoped contacts until all rows are loaded (for CSV export). */
export async function listAllDirectoryContactsForStudy(
  studyId: string
): Promise<{ data: DirectoryContactListItem[]; error: string | null }> {
  const first = await listDirectoryContacts({
    studyId,
    limit: DIRECTORY_CONTACTS_EXPORT_PAGE,
    offset: 0,
  });
  if (first.error) return { data: [], error: first.error };
  const total = first.count ?? 0;
  const out = [...first.data];
  let offset = first.data.length;
  while (offset < total && out.length < DIRECTORY_CONTACTS_EXPORT_MAX_ROWS) {
    const page = await listDirectoryContacts({
      studyId,
      limit: DIRECTORY_CONTACTS_EXPORT_PAGE,
      offset,
    });
    if (page.error) return { data: [], error: page.error };
    out.push(...page.data);
    offset += page.data.length;
    if (page.data.length === 0) break;
    if (page.data.length < DIRECTORY_CONTACTS_EXPORT_PAGE) break;
  }
  return { data: out.slice(0, DIRECTORY_CONTACTS_EXPORT_MAX_ROWS), error: null };
}

export async function listStudySitesForDirectoryFilter(
  studyId: string
): Promise<{ data: { id: string; name: string; site_number: string | null }[]; error: string | null }> {
  const { supabase, companyId } = await requireReader();
  const { data: study, error: se } = await supabase.from('studies').select('id, company_id').eq('id', studyId).maybeSingle();
  if (se) return { data: [], error: se.message };
  if (!study || study.company_id !== companyId) return { data: [], error: 'Study not found' };
  const { data, error } = await supabase
    .from('study_sites')
    .select('id, name, site_number')
    .eq('study_id', studyId)
    .order('name');
  if (error) return { data: [], error: error.message };
  return { data: data ?? [], error: null };
}

export async function getDirectoryContactsSnapshot(
  studyId: string
): Promise<{ data: DirectoryContactsSnapshot | null; error: string | null }> {
  const { supabase, companyId } = await requireReader();
  const { data: study, error: se } = await supabase.from('studies').select('id, company_id').eq('id', studyId).maybeSingle();
  if (se) return { data: null, error: se.message };
  if (!study || study.company_id !== companyId) return { data: null, error: 'Study not found' };

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: studyContactLinks } = await supabase
    .from('directory_contact_study')
    .select('directory_contact_id')
    .eq('study_id', studyId);
  const studyContactIds = [...new Set((studyContactLinks ?? []).map((l) => l.directory_contact_id))];
  let studyContactRows: DirectoryContactListItem[] = [];
  if (studyContactIds.length) {
    const { data: contactRows, error: contactErr } = await supabase
      .from('directory_contacts')
      .select(
        `
        *,
        primary_role:directory_roles!directory_contacts_primary_directory_role_id_fkey(id,name),
        primary_institution:institutions!directory_contacts_primary_institution_id_fkey(id,name)
      `
      )
      .eq('company_id', companyId)
      .in('id', studyContactIds);
    if (contactErr) return { data: null, error: contactErr.message };
    studyContactRows = (contactRows ?? []) as DirectoryContactListItem[];
  }
  const formCompleteness = summarizeContactCompleteness(studyContactRows);

  const { data: allSites, error: siteErr } = await supabase
    .from('study_sites')
    .select('id')
    .eq('study_id', studyId);
  if (siteErr) return { data: null, error: siteErr.message };
  const siteIds = (allSites ?? []).map((s) => s.id);
  const totalStudySites = siteIds.length;

  const { data: dcssSimple } = siteIds.length
    ? await supabase.from('directory_contact_study_site').select('study_site_id').in('study_site_id', siteIds)
    : { data: [] };
  const coveredSet = new Set((dcssSimple ?? []).map((r) => r.study_site_id));
  const sitesCoveredCount = siteIds.filter((id) => coveredSet.has(id)).length;

  const missingRoles = formCompleteness.missingRole;

  let unassignedToSite = 0;
  if (studyContactIds.length) {
    const { data: withSite } = await supabase
      .from('directory_contact_study_site')
      .select('directory_contact_id, study_sites!inner(study_id)')
      .in('directory_contact_id', studyContactIds)
      .eq('study_sites.study_id', studyId);
    const withSet = new Set((withSite ?? []).map((w) => w.directory_contact_id));
    unassignedToSite = studyContactIds.filter((id) => !withSet.has(id)).length;
  }

  const recentlyActive7d = studyContactRows.filter(
    (contact) => contact.updated_at && new Date(contact.updated_at).getTime() >= weekAgo.getTime()
  ).length;

  const { data: dcssForCoverage, error: covErr } = await supabase
    .from('directory_contact_study_site')
    .select('study_site_id, directory_roles(name), study_sites!inner(id,name,site_number,study_id)')
    .eq('study_sites.study_id', studyId);
  if (covErr) return { data: null, error: covErr.message }

  const bySite = new Map<string, { name: string; siteNumber: string | null; roleNames: string[] }>();
  for (const row of dcssForCoverage ?? []) {
    const r = row as { study_site_id: string; directory_roles: unknown; study_sites: unknown };
    const sid = r.study_site_id;
    if (!sid) continue;
    const ss = r.study_sites;
    const site = (Array.isArray(ss) ? ss[0] : ss) as { id: string; name: string; site_number: string | null } | null;
    if (!site) continue;
    const dr = r.directory_roles;
    const roleName = ((Array.isArray(dr) ? dr[0] : dr) as { name?: string } | null)?.name ?? null;
    const g = bySite.get(sid) ?? { name: site.name, siteNumber: site.site_number, roleNames: [] as string[] };
    if (roleName) g.roleNames.push(roleName);
    if (!g.name) g.name = site.name;
    bySite.set(sid, g);
  }
  const roleCoverageBySite: DirectoryContactsSnapshot['roleCoverageBySite'] = [];
  let sitesMissingKeyRoles = 0;
  for (const [siteId, g] of bySite) {
    const cov = siteRoleCoverageFromRoleNames(g.roleNames);
    if (!cov.hasPi || !cov.hasCrc) sitesMissingKeyRoles += 1;
    roleCoverageBySite.push({
      siteId,
      siteName: g.name,
      siteNumber: g.siteNumber,
      hasPi: cov.hasPi,
      hasCrc: cov.hasCrc,
      hasPharm: cov.hasPharm,
    });
  }
  roleCoverageBySite.sort((a, b) => a.siteName.localeCompare(b.siteName));
  if (roleCoverageBySite.length > 20) roleCoverageBySite.length = 20;

  const totalContactsDeltaWeek: null = null;

  const percent = totalStudySites === 0 ? 0 : Math.round((sitesCoveredCount / totalStudySites) * 100);

  const smartSuggestionFilters: DirectoryContactsSnapshot['smartSuggestionFilters'] = [
    { id: 'missing-roles', label: `Assign a primary role to ${missingRoles} contact(s)`, missingRole: true, health: 'needs_update' },
    { id: 'unassigned', label: `Link ${unassignedToSite} contact(s) to a site`, unassigned: true },
  ];

  const totalContacts = studyContactRows.length;

  const out: DirectoryContactsSnapshot = {
    totalContacts,
    totalContactsDeltaWeek,
    formCompleteness,
    sitesCovered: { covered: sitesCoveredCount, total: totalStudySites, percent },
    missingRoles,
    unassignedToSite,
    recentlyActive7d,
    needsAttention: {
      missingRoleCount: missingRoles,
      sitesMissingKeyRoles,
    },
    roleCoverageBySite,
    smartSuggestionFilters,
  };
  return { data: out, error: null };
}

export async function getDirectoryContactById(
  id: string
): Promise<{ data: DirectoryContactWithRelations | null; error: string | null }> {
  const { supabase, companyId } = await requireReader();

  const { data: row, error } = await supabase
    .from('directory_contacts')
    .select(
      `
      *,
      primary_role:directory_roles!directory_contacts_primary_directory_role_id_fkey(id,name,category_id,sort_order),
      primary_institution:institutions!directory_contacts_primary_institution_id_fkey(id,name,organization_type)
    `
    )
    .eq('id', id)
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!row) return { data: null, error: null };

  const { data: sec } = await supabase
    .from('directory_contact_secondary_roles')
    .select('directory_roles(id,name)')
    .eq('directory_contact_id', id);

  const { data: studies } = await supabase
    .from('directory_contact_study')
    .select(
      `
      id, study_id, directory_role_id, start_date, end_date, is_active, notes,
      studies(id,title,protocol_number),
      directory_roles(id,name)
    `
    )
    .eq('directory_contact_id', id);

  const { data: sites } = await supabase
    .from('directory_contact_study_site')
    .select(
      `
      id, study_site_id, directory_role_id, start_date, end_date, is_active,
      study_sites(id,site_number,name,study_id,studies(title,protocol_number)),
      directory_roles(id,name)
    `
    )
    .eq('directory_contact_id', id);

  const { data: inst } = await supabase
    .from('directory_contact_institution')
    .select(
      `
      id, institution_id, is_primary,
      institutions(id,name,organization_type)
    `
    )
    .eq('directory_contact_id', id);

  const { data: comm } = await supabase
    .from('committee_members')
    .select(
      `
      id, committee_id, directory_role_id, start_date, end_date, is_active,
      committees(id,name,committee_type),
      directory_roles(id,name)
    `
    )
    .eq('directory_contact_id', id);

  const secondary_roles = (sec ?? [])
    .map((x: { directory_roles?: unknown }) => {
      const dr = x.directory_roles;
      const one = Array.isArray(dr) ? dr[0] : dr;
      return one as { id: string; name: string } | null | undefined;
    })
    .filter(Boolean) as { id: string; name: string }[];

  const out: DirectoryContactWithRelations = {
    ...(row as DirectoryContactWithRelations),
    primary_role: (row as { primary_role?: DirectoryContactWithRelations['primary_role'] }).primary_role ?? null,
    primary_institution:
      (row as { primary_institution?: DirectoryContactWithRelations['primary_institution'] }).primary_institution ??
      null,
    secondary_roles,
    studies: (studies ?? []) as unknown as DirectoryContactWithRelations['studies'],
    sites: (sites ?? []) as unknown as DirectoryContactWithRelations['sites'],
    institutions: (inst ?? []) as unknown as DirectoryContactWithRelations['institutions'],
    committees: (comm ?? []) as unknown as DirectoryContactWithRelations['committees'],
  };

  return { data: out, error: null };
}

export async function checkDuplicateDirectoryEmail(
  email: string | null | undefined,
  excludeContactId?: string
): Promise<{ duplicate: boolean }> {
  if (!email?.trim()) return { duplicate: false };
  const { supabase, companyId } = await requireReader();
  let q = supabase
    .from('directory_contacts')
    .select('id')
    .eq('company_id', companyId)
    .ilike('email', email.trim());
  if (excludeContactId) q = q.neq('id', excludeContactId);
  const { data } = await q.limit(1);
  return { duplicate: (data?.length ?? 0) > 0 };
}

export async function createDirectoryContact(
  input: SaveDirectoryContactInput,
  options: CreateDirectoryContactOptions = {}
): Promise<CreateDirectoryContactResult> {
  const { supabase, companyId } = await requireEditor();

  const inserted = await insertDirectoryContactRecord(supabase, companyId, input);
  if ('error' in inserted) return { data: null, error: inserted.error };

  let linkedInstitution = false;
  let linkedStudy = false;
  const linkWarnings: string[] = [];

  if (input.primary_institution_id) {
    const instLink = await ensureDirectoryContactPrimaryInstitution(
      supabase,
      companyId,
      inserted.id,
      input.primary_institution_id
    );
    if (instLink.error) {
      linkWarnings.push(`Primary organization link failed: ${instLink.error}`);
    } else {
      linkedInstitution = true;
    }
  }

  if (options.studyId) {
    const studyLink = await ensureDirectoryContactStudyLink(supabase, companyId, inserted.id, options.studyId);
    if (studyLink.error) {
      linkWarnings.push(`Study link failed: ${studyLink.error}`);
    } else {
      linkedStudy = true;
    }
  }

  const dup =
    input.email?.trim() &&
    (await checkDuplicateDirectoryEmail(input.email, inserted.id)).duplicate;

  if (input.secondary_role_ids?.length) {
    await supabase.from('directory_contact_secondary_roles').insert(
      input.secondary_role_ids.map((directory_role_id) => ({
        directory_contact_id: inserted.id,
        directory_role_id,
      }))
    );
  }

  await appendDirectoryAuditLog({
    companyId,
    entityType: 'directory_contact',
    entityId: inserted.id,
    action: 'insert',
    oldPayload: {},
    newPayload: input as unknown as Record<string, unknown>,
  });

  revalidatePath('/protected/directory');
  revalidatePath(`/protected/directory/contacts/${inserted.id}`);
  if (options.studyId) {
    revalidatePath(`/protected/studies/${options.studyId}/directory`);
  }
  return {
    data: { id: inserted.id, linkedInstitution, linkedStudy, linkWarnings },
    error: null,
    duplicateEmailWarning: !!dup,
  };
}

export async function updateDirectoryContact(
  id: string,
  input: SaveDirectoryContactInput
): Promise<{ error: string | null; duplicateEmailWarning?: boolean }> {
  const { supabase, companyId } = await requireEditor();

  const { data: existing } = await supabase
    .from('directory_contacts')
    .select('*')
    .eq('id', id)
    .eq('company_id', companyId)
    .single();
  if (!existing) return { error: 'Contact not found' };

  const upd = await updateDirectoryContactRecord(supabase, companyId, id, input);
  if (upd.error) return { error: upd.error };

  await supabase.from('directory_contact_secondary_roles').delete().eq('directory_contact_id', id);
  if (input.secondary_role_ids?.length) {
    await supabase.from('directory_contact_secondary_roles').insert(
      input.secondary_role_ids.map((directory_role_id) => ({
        directory_contact_id: id,
        directory_role_id,
      }))
    );
  }

  const dup =
    input.email?.trim() &&
    (await checkDuplicateDirectoryEmail(input.email, id)).duplicate;

  await appendDirectoryAuditLog({
    companyId,
    entityType: 'directory_contact',
    entityId: id,
    action: 'update',
    oldPayload: existing as Record<string, unknown>,
    newPayload: input as unknown as Record<string, unknown>,
  });

  revalidatePath('/protected/directory');
  revalidatePath(`/protected/directory/contacts/${id}`);
  return { error: null, duplicateEmailWarning: !!dup };
}

export async function setDirectoryContactStatus(
  id: string,
  status: 'active' | 'inactive'
): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();
  const { error } = await supabase
    .from('directory_contacts')
    .update({ status, archived_at: status === 'inactive' ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) return { error: error.message };
  revalidatePath('/protected/directory');
  revalidatePath(`/protected/directory/contacts/${id}`);
  return { error: null };
}

export async function deleteDirectoryContact(id: string): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();

  const { count } = await supabase
    .from('directory_contact_study')
    .select('id', { count: 'exact', head: true })
    .eq('directory_contact_id', id);
  if ((count ?? 0) > 0) {
    return { error: 'Deactivate this contact instead — study assignments exist.' };
  }
  const { count: c2 } = await supabase
    .from('directory_contact_study_site')
    .select('id', { count: 'exact', head: true })
    .eq('directory_contact_id', id);
  if ((c2 ?? 0) > 0) {
    return { error: 'Deactivate this contact instead — site assignments exist.' };
  }
  const { count: c3 } = await supabase
    .from('committee_members')
    .select('id', { count: 'exact', head: true })
    .eq('directory_contact_id', id);
  if ((c3 ?? 0) > 0) {
    return { error: 'Deactivate this contact instead — committee memberships exist.' };
  }

  const { error } = await supabase.from('directory_contacts').delete().eq('id', id).eq('company_id', companyId);
  if (error) return { error: error.message };
  revalidatePath('/protected/directory');
  return { error: null };
}

/* --- Junctions --- */

export async function upsertContactStudyLink(input: {
  id?: string;
  directory_contact_id: string;
  study_id: string;
  directory_role_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
  notes?: string | null;
}): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();

  const payload = {
    directory_contact_id: input.directory_contact_id,
    study_id: input.study_id,
    directory_role_id: input.directory_role_id ?? null,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    is_active: input.is_active ?? true,
    notes: input.notes?.trim() || null,
  };

  if (input.id) {
    const { error } = await supabase.from('directory_contact_study').update(payload).eq('id', input.id);
    if (error) return { error: error.message };
    await appendDirectoryAssignmentHistory({
      companyId,
      assignmentType: 'contact_study',
      junctionId: input.id,
      action: 'update',
      snapshot: payload,
    });
  } else {
    const { data, error } = await supabase.from('directory_contact_study').insert(payload).select('id').single();
    if (error) return { error: error.message };
    await appendDirectoryAssignmentHistory({
      companyId,
      assignmentType: 'contact_study',
      junctionId: data!.id,
      action: 'insert',
      snapshot: payload,
    });
  }
  revalidatePath('/protected/directory');
  return { error: null };
}

export async function removeContactStudyLink(id: string): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();
  await supabase.from('directory_contact_study').delete().eq('id', id);
  await appendDirectoryAssignmentHistory({
    companyId,
    assignmentType: 'contact_study',
    junctionId: id,
    action: 'delete',
    snapshot: {},
  });
  revalidatePath('/protected/directory');
  return { error: null };
}

export async function upsertContactSiteLink(input: {
  id?: string;
  directory_contact_id: string;
  study_site_id: string;
  directory_role_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
}): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();
  const payload = {
    directory_contact_id: input.directory_contact_id,
    study_site_id: input.study_site_id,
    directory_role_id: input.directory_role_id ?? null,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    is_active: input.is_active ?? true,
  };
  if (input.id) {
    const { error } = await supabase.from('directory_contact_study_site').update(payload).eq('id', input.id);
    if (error) return { error: error.message };
    await appendDirectoryAssignmentHistory({
      companyId,
      assignmentType: 'contact_site',
      junctionId: input.id,
      action: 'update',
      snapshot: payload,
    });
  } else {
    const { data, error } = await supabase.from('directory_contact_study_site').insert(payload).select('id').single();
    if (error) return { error: error.message };
    await appendDirectoryAssignmentHistory({
      companyId,
      assignmentType: 'contact_site',
      junctionId: data!.id,
      action: 'insert',
      snapshot: payload,
    });
  }
  revalidatePath('/protected/directory');
  return { error: null };
}

export async function removeContactSiteLink(id: string): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();
  await supabase.from('directory_contact_study_site').delete().eq('id', id);
  await appendDirectoryAssignmentHistory({
    companyId,
    assignmentType: 'contact_site',
    junctionId: id,
    action: 'delete',
    snapshot: {},
  });
  revalidatePath('/protected/directory');
  return { error: null };
}

export async function upsertContactInstitutionLink(input: {
  id?: string;
  directory_contact_id: string;
  institution_id: string;
  is_primary: boolean;
}): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();

  if (input.is_primary) {
    await supabase
      .from('directory_contact_institution')
      .update({ is_primary: false })
      .eq('directory_contact_id', input.directory_contact_id);
  }

  const payload = {
    directory_contact_id: input.directory_contact_id,
    institution_id: input.institution_id,
    is_primary: input.is_primary,
  };

  if (input.id) {
    const { error } = await supabase.from('directory_contact_institution').update(payload).eq('id', input.id);
    if (error) return { error: error.message };
    await appendDirectoryAssignmentHistory({
      companyId,
      assignmentType: 'contact_institution',
      junctionId: input.id,
      action: 'update',
      snapshot: payload,
    });
  } else {
    const { data, error } = await supabase
      .from('directory_contact_institution')
      .insert(payload)
      .select('id')
      .single();
    if (error) return { error: error.message };
    await appendDirectoryAssignmentHistory({
      companyId,
      assignmentType: 'contact_institution',
      junctionId: data!.id,
      action: 'insert',
      snapshot: payload,
    });
  }
  revalidatePath('/protected/directory');
  return { error: null };
}

export async function removeContactInstitutionLink(id: string): Promise<{ error: string | null }> {
  const { supabase, companyId } = await requireEditor();
  await supabase.from('directory_contact_institution').delete().eq('id', id);
  await appendDirectoryAssignmentHistory({
    companyId,
    assignmentType: 'contact_institution',
    junctionId: id,
    action: 'delete',
    snapshot: {},
  });
  revalidatePath('/protected/directory');
  return { error: null };
}
