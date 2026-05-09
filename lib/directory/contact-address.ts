import type {
  ContactAddressSource,
  DirectoryContactRow,
  DirectoryContactWithRelations,
} from '@/lib/types/directory';

/** Single resolved mailing / location view for profile display and previews. */
export interface ResolvedContactAddress {
  source: ContactAddressSource;
  addressLine1: string | null;
  city: string | null;
  postalCode: string | null;
  countryCode: string | null;
  region: string | null;
  /** When `source` is `site` but the FK site is not among loaded site assignments (or junction missing). */
  staleOrMissingSite: boolean;
}

type SiteLinkRow = DirectoryContactWithRelations['sites'][number];
type StudySiteEmbed = NonNullable<SiteLinkRow['study_sites']>;

type ContactAddressInput = Pick<
  DirectoryContactRow,
  | 'address_line1'
  | 'city'
  | 'postal_code'
  | 'contact_address_source'
  | 'contact_address_study_site_id'
  | 'country_code'
  | 'region'
> & {
  sites?: DirectoryContactWithRelations['sites'];
};

function unwrapOne<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] ?? null) : x;
}

function studyCountryCode(siteRow: StudySiteEmbed): string | null {
  const sc = unwrapOne(
    siteRow.study_countries as
      | { country_code: string; country_name: string }
      | { country_code: string; country_name: string }[]
      | null
      | undefined
  );
  return sc?.country_code?.trim() || null;
}

/**
 * Resolves the contact’s effective address: manual columns on `directory_contacts`,
 * or the linked `study_sites` row (+ `study_countries` for country) when `contact_address_source` is `site`.
 */
export function resolveContactAddress(contact: ContactAddressInput): ResolvedContactAddress {
  const source: ContactAddressSource =
    contact.contact_address_source === 'site' ? 'site' : 'manual';

  if (source !== 'site' || !contact.contact_address_study_site_id) {
    return {
      source: 'manual',
      addressLine1: contact.address_line1?.trim() || null,
      city: contact.city?.trim() || null,
      postalCode: contact.postal_code?.trim() || null,
      countryCode: contact.country_code?.trim() || null,
      region: contact.region?.trim() || null,
      staleOrMissingSite: false,
    };
  }

  const sites = contact.sites ?? [];
  const link = sites.find((s) => s.study_site_id === contact.contact_address_study_site_id);
  const siteRow = unwrapOne(link?.study_sites as StudySiteEmbed | StudySiteEmbed[] | null | undefined);

  if (!siteRow || typeof siteRow !== 'object') {
    return {
      source: 'site',
      addressLine1: null,
      city: null,
      postalCode: null,
      countryCode: contact.country_code?.trim() || null,
      region: contact.region?.trim() || null,
      staleOrMissingSite: true,
    };
  }

  const countryFromSite = studyCountryCode(siteRow);
  const countryCode = countryFromSite ?? (contact.country_code?.trim() || null);
  const regionFromSite = siteRow.state?.trim() || contact.region?.trim() || null;

  return {
    source: 'site',
    addressLine1: siteRow.address?.trim() || null,
    city: siteRow.city?.trim() || null,
    postalCode: siteRow.postal_code?.trim() || null,
    countryCode,
    region: regionFromSite,
    staleOrMissingSite: false,
  };
}
