import {
  Building2,
  Landmark,
  Microscope,
  ScrollText,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from 'lucide-react';

import { COUNTRIES } from '@/lib/data/countries';
import {
  INSTITUTION_STUDY_RELATIONSHIP_OPTIONS,
  INSTITUTION_TYPE_OPTIONS,
  type InstitutionOrganizationType,
  type InstitutionRow,
} from '@/lib/types/directory';

export interface NormalizedLinkedStudy {
  /** institution_study row id (used for delete). */
  linkId: string;
  studyId: string;
  /** Best-effort label for the study (study_name, then title, then protocol_number). */
  label: string;
  /** Display protocol number, when available. */
  protocolNumber: string | null;
  /** "sponsor" / "cro" / etc — already normalized to lowercase token. */
  relationshipType: string;
  /** Human-readable phase/status from the studies list when joined. */
  phase: string | null;
  status: string | null;
  /** Long form descriptive title (used in the highlighted study card lead line). */
  fullTitle: string | null;
}

export type ContactRole = 'pi' | 'crc' | 'sub_i' | 'rn' | 'pharm' | 'other';

export interface NormalizedContact {
  linkId: string;
  contactId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  roleName: string | null;
  /** Detected canonical role; clinical-site mode uses these to slot PI vs CRC vs other. */
  detectedRole: ContactRole;
  isPrimary: boolean;
}

/** Decide whether the page should use clinical-site copy vs neutral organization copy. */
export function isClinicalSiteMode(organizationType: InstitutionOrganizationType): boolean {
  return organizationType === 'clinical_site';
}

const TYPE_LABEL_MAP = new Map<string, string>(
  INSTITUTION_TYPE_OPTIONS.map((opt) => [opt.value, opt.label]),
);

export function getOrganizationTypeLabel(type: InstitutionOrganizationType): string {
  return TYPE_LABEL_MAP.get(type) ?? type.replace(/_/g, ' ');
}

const TYPE_ICON_MAP: Record<InstitutionOrganizationType, LucideIcon> = {
  sponsor: ScrollText,
  cro: ShieldCheck,
  clinical_site: Building2,
  vendor: Truck,
  irb_ec: ShieldCheck,
  lab: Microscope,
  government: Landmark,
  other: Building2,
};

export function getOrganizationTypeIcon(type: InstitutionOrganizationType): LucideIcon {
  return TYPE_ICON_MAP[type] ?? Building2;
}

const TYPE_ICON_TONE: Record<InstitutionOrganizationType, string> = {
  sponsor: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200',
  cro: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200',
  clinical_site: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
  vendor: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  irb_ec: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200',
  lab: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200',
  government: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200',
  other: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200',
};

export function getOrganizationTypeIconTone(type: InstitutionOrganizationType): string {
  return TYPE_ICON_TONE[type] ?? TYPE_ICON_TONE.other;
}

export interface ProfileCopy {
  /** Top-level singular noun for the entity in copy ("Site" vs "Organization"). */
  entityNoun: string;
  /** Plural form. */
  entityNounPlural: string;
  /** Headline label for the deactivate button. */
  deactivateLabel: string;
  activateLabel: string;
  editLabel: string;
  /** Section heading for the people table (neutral "People"). */
  contactsHeading: string;
  contactsSubtitle: string;
  /** Fact-row label for organization vs site type (hero). */
  organizationTypeFactLabel: string;
  /** Fact-row label for linked study count (hero). */
  linkedStudiesFactLabel: string;
  /** Section heading for "Site Information" / "Organization Information". */
  infoHeading: string;
  /** Headline for the linked studies section. */
  linkedStudiesHeading: string;
}

export function getProfileCopy(type: InstitutionOrganizationType): ProfileCopy {
  if (isClinicalSiteMode(type)) {
    return {
      entityNoun: 'Site',
      entityNounPlural: 'Sites',
      deactivateLabel: 'Deactivate Site',
      activateLabel: 'Activate Site',
      editLabel: 'Edit Site',
      contactsHeading: 'People',
      contactsSubtitle:
        'Manage contacts in Directory and study listings. Use email or phone to reach someone directly.',
      organizationTypeFactLabel: 'Site type',
      linkedStudiesFactLabel: 'Linked studies',
      infoHeading: 'Site Information',
      linkedStudiesHeading: 'Linked studies',
    };
  }
  return {
    entityNoun: 'Organization',
    entityNounPlural: 'Organizations',
    deactivateLabel: 'Deactivate Organization',
    activateLabel: 'Activate Organization',
    editLabel: 'Edit Organization',
    contactsHeading: 'People',
    contactsSubtitle:
      'Manage contacts in Directory and study listings. Use email or phone to reach someone directly.',
    organizationTypeFactLabel: 'Organization type',
    linkedStudiesFactLabel: 'Linked studies',
    infoHeading: 'Organization Information',
    linkedStudiesHeading: 'Linked studies',
  };
}

export function getInstitutionStudyRelationshipLabel(relationshipType: string): string {
  const opt = INSTITUTION_STUDY_RELATIONSHIP_OPTIONS.find((o) => o.value === relationshipType);
  return opt?.label ?? relationshipType.replace(/_/g, ' ');
}

const COUNTRY_NAME_MAP = new Map<string, string>(COUNTRIES.map((c) => [c.code.toUpperCase(), c.name]));

export function getCountryName(code: string | null | undefined): string | null {
  if (!code) return null;
  return COUNTRY_NAME_MAP.get(code.toUpperCase()) ?? code;
}

export function buildAddressLine(institution: Pick<InstitutionRow, 'address_line1' | 'address_line2' | 'city' | 'state_region' | 'postal_code' | 'country_code'>): string | null {
  const street = [institution.address_line1, institution.address_line2].filter(Boolean).join(', ');
  const cityStateZip = [
    institution.city,
    [institution.state_region, institution.postal_code].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ');
  const country = getCountryName(institution.country_code);
  return [street, cityStateZip, country].filter(Boolean).join(', ') || null;
}

/** Short site identifier; falls back to a stable institution id slice when no protocol number/site number. */
export function getShortInstitutionId(institutionId: string): string {
  return `INST-${institutionId.slice(0, 4).toUpperCase()}`;
}

const ROLE_NAME_TO_CANONICAL: Array<{ pattern: RegExp; role: ContactRole }> = [
  { pattern: /principal\s+investigator|^pi\b/i, role: 'pi' },
  { pattern: /clinical\s+research\s+coordinator|coordinator|^crc\b/i, role: 'crc' },
  { pattern: /sub[-\s]?investigator|sub-?i/i, role: 'sub_i' },
  { pattern: /research\s+nurse|study\s+nurse|^rn\b/i, role: 'rn' },
  { pattern: /pharmacist|pharmacy/i, role: 'pharm' },
];

export function detectRole(roleName: string | null | undefined, contactTitle?: string | null): ContactRole {
  const text = `${roleName ?? ''} ${contactTitle ?? ''}`.trim();
  if (!text) return 'other';
  for (const entry of ROLE_NAME_TO_CANONICAL) {
    if (entry.pattern.test(text)) return entry.role;
  }
  return 'other';
}

export function getInitials(firstName: string | null, lastName: string | null): string {
  const a = (firstName ?? '').trim()[0];
  const b = (lastName ?? '').trim()[0];
  if (a && b) return `${a}${b}`.toUpperCase();
  if (a) return a.toUpperCase();
  if (b) return b.toUpperCase();
  return '—';
}
