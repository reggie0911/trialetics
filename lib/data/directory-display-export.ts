/**
 * Study Directory flat-table-shaped CSV columns (not import-template columns).
 */

import { csvLine } from '@/lib/data/directory-csv-templates';
import { getCountryName } from '@/lib/data/countries';
import { ORG_TYPE_GROUP_LABEL } from '@/lib/directory/organization-display';
import { getContactCompleteness, getOrganizationCompleteness } from '@/lib/directory/record-completeness';
import type { DirectoryContactListItem, InstitutionRow } from '@/lib/types/directory';

export const DIRECTORY_CONTACTS_DISPLAY_EXPORT_COLUMNS = [
  'contact_name',
  'title',
  'email',
  'phone',
  'role',
  'organization',
  'country',
  'form',
] as const;

export const DIRECTORY_ORGANIZATIONS_DISPLAY_EXPORT_COLUMNS = [
  'type',
  'organization',
  'country',
  'region',
  'status',
  'form',
] as const;

function formatContactFormCell(c: DirectoryContactListItem): string {
  const comp = getContactCompleteness(c);
  const missing = comp.missingFields.slice(0, 6).join(', ');
  return comp.complete ? `${comp.percent}% · Complete` : `${comp.percent}% · Missing ${missing}`;
}

function formatOrganizationFormCell(inst: InstitutionRow): string {
  const comp = getOrganizationCompleteness(inst);
  const missing = comp.missingFields.slice(0, 6).join(', ');
  return comp.complete ? `${comp.percent}% · Complete` : `${comp.percent}% · Missing ${missing}`;
}

export function getDirectoryContactsDisplayExportCsv(rows: DirectoryContactListItem[]): string {
  const header = csvLine([...DIRECTORY_CONTACTS_DISPLAY_EXPORT_COLUMNS]);
  const lines = rows.map((c) => {
    const contactName = `${c.first_name} ${c.last_name}`.trim();
    const role = c.primary_role?.name?.trim() ?? '';
    const organization = c.primary_institution?.name?.trim() ?? '';
    const country = getCountryName(c.country_code) ?? '—';
    return csvLine([
      contactName,
      c.title ?? '',
      c.email ?? '',
      c.phone ?? '',
      role,
      organization,
      country,
      formatContactFormCell(c),
    ]);
  });
  return [header, ...lines].join('\n') + '\n';
}

export function getDirectoryOrganizationsDisplayExportCsv(rows: InstitutionRow[]): string {
  const header = csvLine([...DIRECTORY_ORGANIZATIONS_DISPLAY_EXPORT_COLUMNS]);
  const lines = rows.map((inst) => {
    const typeLabel = ORG_TYPE_GROUP_LABEL[inst.organization_type]?.singular ?? inst.organization_type;
    const country = getCountryName(inst.country_code) ?? '—';
    return csvLine([
      typeLabel,
      inst.name,
      country,
      inst.region ?? '',
      inst.status,
      formatOrganizationFormCell(inst),
    ]);
  });
  return [header, ...lines].join('\n') + '\n';
}
