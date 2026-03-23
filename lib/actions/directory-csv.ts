'use server';

import Papa from 'papaparse';
import { createClient } from '@/lib/server';
import { canImportDirectoryCsv, getDirectoryPermissionContext } from '@/lib/directory-permissions';
import type { InstitutionOrganizationType } from '@/lib/types/directory';

const ORG_TYPES = new Set<string>([
  'sponsor',
  'cro',
  'clinical_site',
  'vendor',
  'irb_ec',
  'lab',
  'government',
  'other',
]);

function normType(v: string): InstitutionOrganizationType {
  const t = v.trim().toLowerCase().replace(/\s+/g, '_');
  if (ORG_TYPES.has(t)) return t as InstitutionOrganizationType;
  return 'other';
}

export async function importDirectoryContactsFromCsv(
  csvText: string
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { imported: 0, skipped: 0, errors: ['Not authenticated'] };
  const ctx = await getDirectoryPermissionContext(supabase, user.id);
  if (!ctx) return { imported: 0, skipped: 0, errors: ['No company'] };
  if (!(await canImportDirectoryCsv(supabase, { isAdmin: ctx.isAdmin }))) {
    return { imported: 0, skipped: 0, errors: ['Only administrators can import CSV files'] };
  }

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  if (parsed.errors.length) {
    return {
      imported: 0,
      skipped: 0,
      errors: parsed.errors.map((e) => e.message),
    };
  }

  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const first = row.first_name?.trim() || row.firstname?.trim();
    const last = row.last_name?.trim() || row.lastname?.trim();
    if (!first || !last) {
      skipped++;
      errors.push(`Row ${i + 2}: first_name and last_name are required`);
      continue;
    }
    const { error } = await supabase.from('directory_contacts').insert({
      company_id: ctx.companyId,
      first_name: first,
      last_name: last,
      title: row.title?.trim() || null,
      email: row.email?.trim() || null,
      phone: row.phone?.trim() || null,
      department: row.department?.trim() || null,
      country_code: row.country_code?.trim() || null,
      region: row.region?.trim() || null,
      status: row.status === 'inactive' ? 'inactive' : 'active',
      notes: row.notes?.trim() || null,
    });
    if (error) {
      skipped++;
      errors.push(`Row ${i + 2}: ${error.message}`);
    } else {
      imported++;
    }
  }

  return { imported, skipped, errors: errors.slice(0, 50) };
}

export async function importInstitutionsFromCsv(
  csvText: string
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { imported: 0, skipped: 0, errors: ['Not authenticated'] };
  const ctx = await getDirectoryPermissionContext(supabase, user.id);
  if (!ctx) return { imported: 0, skipped: 0, errors: ['No company'] };
  if (!(await canImportDirectoryCsv(supabase, { isAdmin: ctx.isAdmin }))) {
    return { imported: 0, skipped: 0, errors: ['Only administrators can import CSV files'] };
  }

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  if (parsed.errors.length) {
    return { imported: 0, skipped: 0, errors: parsed.errors.map((e) => e.message) };
  }

  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const name = row.name?.trim();
    if (!name) {
      skipped++;
      errors.push(`Row ${i + 2}: name is required`);
      continue;
    }
    const orgType = row.organization_type ? normType(row.organization_type) : 'other';
    const { error } = await supabase.from('institutions').insert({
      company_id: ctx.companyId,
      name,
      organization_type: orgType,
      address_line1: row.address_line1?.trim() || row.address?.trim() || null,
      city: row.city?.trim() || null,
      state_region: row.state?.trim() || row.state_region?.trim() || null,
      postal_code: row.postal_code?.trim() || null,
      country_code: row.country_code?.trim() || null,
      region: row.region?.trim() || null,
      status: row.status === 'inactive' ? 'inactive' : 'active',
      notes: row.notes?.trim() || null,
    });
    if (error) {
      skipped++;
      errors.push(`Row ${i + 2}: ${error.message}`);
    } else {
      imported++;
    }
  }

  return { imported, skipped, errors: errors.slice(0, 50) };
}
