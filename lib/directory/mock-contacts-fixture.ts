import type { DirectoryContactListItem, DirectoryContactsSnapshot } from '@/lib/types/directory';

/**
 * Mock fallback used by the Directory Contacts tab so the redesign renders
 * fully on empty studies. Replaced by real data the moment a study has
 * directory_contact_study links.
 */

export const MOCK_DIRECTORY_SNAPSHOT: DirectoryContactsSnapshot = {
  totalContacts: 128,
  totalContactsDeltaWeek: 8,
  sitesCovered: { covered: 23, total: 28, percent: 82 },
  missingRoles: 12,
  unassignedToSite: 7,
  recentlyActive7d: 24,
  needsAttention: {
    missingRoleCount: 12,
    sitesMissingKeyRoles: 4,
  },
  roleCoverageBySite: [
    {
      siteId: 'mock-site-jh',
      siteName: 'Johns Hopkins',
      siteNumber: '001',
      hasPi: true,
      hasCrc: true,
      hasSubI: true,
      hasRn: true,
      hasPharm: true,
    },
    {
      siteId: 'mock-site-mayo',
      siteName: 'Mayo Clinic',
      siteNumber: '002',
      hasPi: true,
      hasCrc: false,
      hasSubI: true,
      hasRn: true,
      hasPharm: true,
    },
    {
      siteId: 'mock-site-mass',
      siteName: 'Mass General',
      siteNumber: '003',
      hasPi: true,
      hasCrc: true,
      hasSubI: true,
      hasRn: true,
      hasPharm: false,
    },
    {
      siteId: 'mock-site-ucla',
      siteName: 'UCLA Medical Center',
      siteNumber: '004',
      hasPi: false,
      hasCrc: true,
      hasSubI: true,
      hasRn: true,
      hasPharm: false,
    },
  ],
  smartSuggestionFilters: [
    {
      id: 'missing-roles',
      label: 'Assign role to 12 contacts',
      subtitle: 'Improve data completeness',
      missingRole: true,
      health: 'needs_update',
    },
    {
      id: 'unassigned',
      label: 'Link 7 contacts to a site',
      subtitle: 'Enable monitoring workflows',
      unassigned: true,
    },
    {
      id: 'sites-missing-pi',
      label: '2 sites are missing a Principal Investigator',
      subtitle: 'Review and assign',
    },
  ],
};

const NOW = new Date('2026-04-27T20:00:00Z');
function daysAgo(days: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function makeContact(over: Partial<DirectoryContactListItem> & { id: string; first_name: string; last_name: string }): DirectoryContactListItem {
  return {
    id: over.id,
    company_id: 'mock-company',
    first_name: over.first_name,
    last_name: over.last_name,
    title: over.title ?? null,
    email: over.email ?? null,
    avatar_url: over.avatar_url ?? null,
    phone: over.phone ?? null,
    department: over.department ?? null,
    country_code: over.country_code ?? null,
    region: over.region ?? null,
    status: over.status ?? 'active',
    notes: null,
    primary_directory_role_id: over.primary_directory_role_id ?? null,
    profile_id: null,
    primary_institution_id: over.primary_institution_id ?? null,
    archived_at: null,
    created_at: daysAgo(120),
    updated_at: over.updated_at ?? daysAgo(5),
    primary_role: over.primary_role,
    primary_institution: over.primary_institution,
    study_enrichment: over.study_enrichment,
  };
}

const JH_INST = { id: 'mock-inst-jh', name: 'Johns Hopkins Hospital' };
const MAYO_INST = { id: 'mock-inst-mayo', name: 'Mayo Clinic' };
const MASS_INST = { id: 'mock-inst-mass', name: 'Mass General Brigham' };
const UCLA_INST = { id: 'mock-inst-ucla', name: 'UCLA Medical Center' };

const SITE_JH = { primary_study_site_id: 'mock-site-jh', primary_study_site_label: 'Johns Hopkins Hospital' };
const SITE_MAYO = { primary_study_site_id: 'mock-site-mayo', primary_study_site_label: 'Mayo Clinic' };
const SITE_MASS = { primary_study_site_id: 'mock-site-mass', primary_study_site_label: 'Mass General Brigham' };
const SITE_UCLA = { primary_study_site_id: 'mock-site-ucla', primary_study_site_label: 'UCLA Medical Center' };

const ROLE_PI = { id: 'role-pi', name: 'Principal Investigator' };
const ROLE_CRC = { id: 'role-crc', name: 'Clinical Research Coordinator' };
const ROLE_SUBI = { id: 'role-subi', name: 'Sub-Investigator' };
const ROLE_NURSE = { id: 'role-nurse', name: 'Study Nurse' };

export const MOCK_DIRECTORY_CONTACTS: DirectoryContactListItem[] = [
  // Johns Hopkins (8 contacts; first 4 are visible like the reference)
  makeContact({
    id: 'mock-c-1',
    first_name: 'Dr. Michael',
    last_name: 'Anderson',
    email: 'm.anderson@jh.edu',
    primary_role: ROLE_PI,
    primary_institution: JH_INST,
    primary_directory_role_id: ROLE_PI.id,
    primary_institution_id: JH_INST.id,
    region: 'Baltimore, MD, USA',
    updated_at: daysAgo(5),
    study_enrichment: { ...SITE_JH, study_involvement_active: true, contact_health: 'healthy' },
  }),
  makeContact({
    id: 'mock-c-2',
    first_name: 'Sarah',
    last_name: 'Thompson',
    email: 's.thompson@jh.edu',
    primary_role: ROLE_CRC,
    primary_institution: JH_INST,
    primary_directory_role_id: ROLE_CRC.id,
    primary_institution_id: JH_INST.id,
    region: 'Baltimore, MD, USA',
    updated_at: daysAgo(4),
    study_enrichment: { ...SITE_JH, study_involvement_active: true, contact_health: 'healthy' },
  }),
  makeContact({
    id: 'mock-c-3',
    first_name: 'David',
    last_name: 'Lee',
    email: 'd.lee@jh.edu',
    primary_role: ROLE_SUBI,
    primary_institution: JH_INST,
    primary_directory_role_id: ROLE_SUBI.id,
    primary_institution_id: JH_INST.id,
    region: 'Baltimore, MD, USA',
    updated_at: daysAgo(15),
    study_enrichment: { ...SITE_JH, study_involvement_active: true, contact_health: 'needs_update' },
  }),
  makeContact({
    id: 'mock-c-4',
    first_name: 'Jessica',
    last_name: 'Martinez',
    email: 'j.martinez@jh.edu',
    primary_role: ROLE_NURSE,
    primary_institution: JH_INST,
    primary_directory_role_id: ROLE_NURSE.id,
    primary_institution_id: JH_INST.id,
    region: 'Baltimore, MD, USA',
    updated_at: daysAgo(97),
    study_enrichment: { ...SITE_JH, study_involvement_active: true, contact_health: 'at_risk' },
  }),
  // Filler 4 more for JH (collapsed)
  ...Array.from({ length: 4 }).map((_, i) =>
    makeContact({
      id: `mock-c-jh-${i + 5}`,
      first_name: 'JH',
      last_name: `Member ${i + 5}`,
      email: `jh.member${i + 5}@jh.edu`,
      primary_role: i % 2 === 0 ? ROLE_CRC : ROLE_SUBI,
      primary_institution: JH_INST,
      primary_directory_role_id: (i % 2 === 0 ? ROLE_CRC : ROLE_SUBI).id,
      primary_institution_id: JH_INST.id,
      region: 'Baltimore, MD, USA',
      updated_at: daysAgo(20 + i * 3),
      study_enrichment: { ...SITE_JH, study_involvement_active: true, contact_health: 'healthy' },
    })
  ),
  // Mayo Clinic (6 contacts)
  ...Array.from({ length: 6 }).map((_, i) =>
    makeContact({
      id: `mock-c-mayo-${i + 1}`,
      first_name: 'Mayo',
      last_name: `Member ${i + 1}`,
      email: `mayo.member${i + 1}@mayo.edu`,
      primary_role: i === 0 ? ROLE_PI : i === 1 ? ROLE_SUBI : ROLE_NURSE,
      primary_institution: MAYO_INST,
      primary_directory_role_id: (i === 0 ? ROLE_PI : i === 1 ? ROLE_SUBI : ROLE_NURSE).id,
      primary_institution_id: MAYO_INST.id,
      region: 'Rochester, MN, USA',
      updated_at: daysAgo(10 + i * 2),
      study_enrichment: { ...SITE_MAYO, study_involvement_active: true, contact_health: 'healthy' },
    })
  ),
  // Mass General (5 contacts)
  ...Array.from({ length: 5 }).map((_, i) =>
    makeContact({
      id: `mock-c-mass-${i + 1}`,
      first_name: 'Mass',
      last_name: `Member ${i + 1}`,
      email: `mass.member${i + 1}@mgb.org`,
      primary_role: i === 0 ? ROLE_PI : i === 1 ? ROLE_CRC : ROLE_SUBI,
      primary_institution: MASS_INST,
      primary_directory_role_id: (i === 0 ? ROLE_PI : i === 1 ? ROLE_CRC : ROLE_SUBI).id,
      primary_institution_id: MASS_INST.id,
      region: 'Boston, MA, USA',
      updated_at: daysAgo(8 + i),
      study_enrichment: { ...SITE_MASS, study_involvement_active: true, contact_health: 'healthy' },
    })
  ),
  // UCLA Medical Center (4 contacts)
  ...Array.from({ length: 4 }).map((_, i) =>
    makeContact({
      id: `mock-c-ucla-${i + 1}`,
      first_name: 'UCLA',
      last_name: `Member ${i + 1}`,
      email: `ucla.member${i + 1}@ucla.edu`,
      primary_role: i === 0 ? ROLE_CRC : i === 1 ? ROLE_SUBI : ROLE_NURSE,
      primary_institution: UCLA_INST,
      primary_directory_role_id: (i === 0 ? ROLE_CRC : i === 1 ? ROLE_SUBI : ROLE_NURSE).id,
      primary_institution_id: UCLA_INST.id,
      region: 'Los Angeles, CA, USA',
      updated_at: daysAgo(6 + i * 2),
      study_enrichment: { ...SITE_UCLA, study_involvement_active: true, contact_health: 'needs_update' },
    })
  ),
];

/** Last-activity demo strings keyed by contact id (used purely for display in the table). */
export const MOCK_LAST_ACTIVITY: Record<string, { kind: 'visit' | 'email' | 'none'; date: string; relative: string }> = {
  'mock-c-1': { kind: 'visit', date: '12 May 2025', relative: '5 days ago' },
  'mock-c-2': { kind: 'email', date: '13 May 2025', relative: '4 days ago' },
  'mock-c-3': { kind: 'visit', date: '02 May 2025', relative: '15 days ago' },
  'mock-c-4': { kind: 'none', date: '', relative: '97 days ago' },
};
