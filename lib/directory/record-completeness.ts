import type { DirectoryContactListItem, DirectoryContactRow, InstitutionRow } from '@/lib/types/directory';

export interface RecordCompleteness {
  percent: number;
  complete: boolean;
  missingFields: string[];
}

export interface DirectoryRecordCompletenessSummary {
  total: number;
  complete: number;
  percent: number;
}

export interface ContactCompletenessSummary extends DirectoryRecordCompletenessSummary {
  missingTitle: number;
  missingRole: number;
  missingOrganization: number;
  missingEmail: number;
  missingPhone: number;
  missingContactInfo: number;
}

export interface OrganizationCompletenessSummary extends DirectoryRecordCompletenessSummary {
  missingAddress: number;
  missingLocation: number;
}

type ContactCompletenessInput = Pick<
  DirectoryContactRow,
  | 'first_name'
  | 'last_name'
  | 'title'
  | 'email'
  | 'phone'
  | 'primary_directory_role_id'
  | 'primary_institution_id'
> & {
  primary_role?: DirectoryContactListItem['primary_role'];
  primary_institution?: DirectoryContactListItem['primary_institution'];
};

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function pct(complete: number, total: number): number {
  return total === 0 ? 0 : Math.round((complete / total) * 100);
}

export function getContactCompleteness(contact: ContactCompletenessInput): RecordCompleteness {
  const checks = [
    { label: 'first name', complete: hasText(contact.first_name) },
    { label: 'last name', complete: hasText(contact.last_name) },
    { label: 'title', complete: hasText(contact.title) },
    { label: 'role', complete: Boolean(contact.primary_directory_role_id || contact.primary_role?.id) },
    { label: 'email', complete: hasText(contact.email) },
    { label: 'phone', complete: hasText(contact.phone) },
    {
      label: 'organization',
      complete: Boolean(contact.primary_institution_id || contact.primary_institution?.id),
    },
  ];
  const missingFields = checks.filter((check) => !check.complete).map((check) => check.label);
  return {
    percent: pct(checks.length - missingFields.length, checks.length),
    complete: missingFields.length === 0,
    missingFields,
  };
}

export function summarizeContactCompleteness(
  contacts: ContactCompletenessInput[]
): ContactCompletenessSummary {
  let complete = 0;
  let missingTitle = 0;
  let missingRole = 0;
  let missingOrganization = 0;
  let missingEmail = 0;
  let missingPhone = 0;
  let missingContactInfo = 0;

  for (const contact of contacts) {
    const c = getContactCompleteness(contact);
    if (c.complete) complete += 1;
    if (!hasText(contact.title)) missingTitle += 1;
    if (!contact.primary_directory_role_id && !contact.primary_role?.id) missingRole += 1;
    if (!contact.primary_institution_id && !contact.primary_institution?.id) missingOrganization += 1;
    if (!hasText(contact.email)) missingEmail += 1;
    if (!hasText(contact.phone)) missingPhone += 1;
    if (!hasText(contact.email) || !hasText(contact.phone)) missingContactInfo += 1;
  }

  return {
    total: contacts.length,
    complete,
    percent: pct(complete, contacts.length),
    missingTitle,
    missingRole,
    missingOrganization,
    missingEmail,
    missingPhone,
    missingContactInfo,
  };
}

export function getOrganizationCompleteness(institution: InstitutionRow): RecordCompleteness {
  const hasAddress = [
    institution.address_line1,
    institution.city,
    institution.state_region,
    institution.postal_code,
  ].some(hasText);
  const hasLocation = hasText(institution.country_code) && hasText(institution.region);
  const checks = [
    { label: 'name', complete: hasText(institution.name) },
    { label: 'type', complete: hasText(institution.organization_type) },
    { label: 'status', complete: hasText(institution.status) },
    { label: 'address', complete: hasAddress },
    { label: 'country', complete: hasText(institution.country_code) },
    { label: 'region', complete: hasText(institution.region) },
  ];
  const missingFields = checks.filter((check) => !check.complete).map((check) => check.label);
  return {
    percent: pct(checks.length - missingFields.length, checks.length),
    complete: missingFields.length === 0,
    missingFields,
  };
}

export function summarizeOrganizationCompleteness(
  institutions: InstitutionRow[]
): OrganizationCompletenessSummary {
  let complete = 0;
  let missingAddress = 0;
  let missingLocation = 0;

  for (const institution of institutions) {
    const c = getOrganizationCompleteness(institution);
    if (c.complete) complete += 1;
    if (c.missingFields.includes('address')) missingAddress += 1;
    if (!hasText(institution.country_code) || !hasText(institution.region)) missingLocation += 1;
  }

  return {
    total: institutions.length,
    complete,
    percent: pct(complete, institutions.length),
    missingAddress,
    missingLocation,
  };
}
