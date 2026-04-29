import type { InstitutionOrganizationType, InstitutionRow } from '@/lib/types/directory';

/**
 * Mock enrichment for the Organizations tab redesign.
 *
 * The real DB does not yet expose enrollment %, last-visit dates, IRB approval
 * status, lab TAT, or the donut/region aggregations. To let the new layout render
 * fully against either real or empty DBs, this file centralizes deterministic
 * mock data:
 *  - Per-organization enrichment is keyed first by exact institution name
 *    (matches seeded fixtures from `seed_7_countries_20_sites_governance.sql`)
 *    and otherwise derived from the row + a stable hash of its id.
 *  - KPI / insights / suggestions / needs-attention blocks are static
 *    snapshots that can be overridden once a real backend exists.
 */

export type OrgHealth = 'healthy' | 'at_risk' | 'critical';
export type IrbApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface OrgEnrichment {
  /** Study labels involved (chips like "LUMINA-201"). First is primary. */
  studyInvolvement: string[];
  /** Site enrollment current count (used for clinical_site rows). */
  enrollmentCurrent: number;
  /** Site enrollment target (used for clinical_site rows). */
  enrollmentTarget: number;
  /** ISO date of the most recent visit / activity. */
  lastVisitISO: string;
  /** Overall health bucket. */
  health: OrgHealth;
  /** IRB approval status (used for irb_ec rows). */
  irbStatus?: IrbApprovalStatus;
  /** ISO date the IRB submission/approval was recorded. */
  irbDateISO?: string;
  /** Lab turnaround time in days (used for lab rows). */
  tatDays?: number;
}

const NOW = new Date('2026-05-12T20:00:00Z');

function daysAgo(days: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Stable enrichment for the institutions seeded by
 * `supabase/scripts/seed_7_countries_20_sites_governance.sql` so the mockups
 * mirror the reference image.
 */
const ENRICHMENT_BY_NAME: Record<string, OrgEnrichment> = {
  'Great Lakes Medical Center': {
    studyInvolvement: ['LUMINA-201', 'AURA-302'],
    enrollmentCurrent: 45,
    enrollmentTarget: 100,
    lastVisitISO: daysAgo(5),
    health: 'at_risk',
  },
  'Northeast Clinical Research': {
    studyInvolvement: ['LUMINA-201'],
    enrollmentCurrent: 28,
    enrollmentTarget: 80,
    lastVisitISO: daysAgo(23),
    health: 'at_risk',
  },
  'Pacific West Oncology': {
    studyInvolvement: ['LUMINA-201', 'AURA-302', 'NEXUS-104'],
    enrollmentCurrent: 75,
    enrollmentTarget: 100,
    lastVisitISO: daysAgo(8),
    health: 'healthy',
  },
  'Prairie Clinical Trials': {
    studyInvolvement: ['LUMINA-201'],
    enrollmentCurrent: 10,
    enrollmentTarget: 100,
    lastVisitISO: daysAgo(59),
    health: 'critical',
  },
  'Apex Independent Review Board': {
    studyInvolvement: ['LUMINA-201'],
    enrollmentCurrent: 0,
    enrollmentTarget: 0,
    lastVisitISO: daysAgo(11),
    health: 'at_risk',
    irbStatus: 'pending',
    irbDateISO: daysAgo(11),
  },
  'Meridian Ethics Review Board': {
    studyInvolvement: ['LUMINA-201', 'AURA-302'],
    enrollmentCurrent: 0,
    enrollmentTarget: 0,
    lastVisitISO: daysAgo(28),
    health: 'healthy',
    irbStatus: 'approved',
    irbDateISO: daysAgo(28),
  },
  'Northbridge Institutional Review Board': {
    studyInvolvement: ['LUMINA-201'],
    enrollmentCurrent: 0,
    enrollmentTarget: 0,
    lastVisitISO: daysAgo(3),
    health: 'at_risk',
    irbStatus: 'pending',
    irbDateISO: daysAgo(3),
  },
  'Trialetics Central Core Lab (demo)': {
    studyInvolvement: ['LUMINA-201'],
    enrollmentCurrent: 0,
    enrollmentTarget: 0,
    lastVisitISO: daysAgo(4),
    health: 'healthy',
    tatDays: 3.2,
  },
  'BioCore Diagnostics': {
    studyInvolvement: ['LUMINA-201'],
    enrollmentCurrent: 0,
    enrollmentTarget: 0,
    lastVisitISO: daysAgo(12),
    health: 'at_risk',
    tatDays: 5.7,
  },
};

const ENROLLMENT_TARGETS = [60, 80, 100, 120];

/** Returns a deterministic enrichment record for an institution row. */
export function getOrgEnrichment(inst: InstitutionRow): OrgEnrichment {
  const direct = ENRICHMENT_BY_NAME[inst.name];
  if (direct) return direct;

  const h = hashString(inst.id || inst.name);
  const studyPool = ['LUMINA-201', 'AURA-302', 'NEXUS-104', 'POLARIS-118'];
  const studyCount = (h % 3) + 1;
  const studies: string[] = [];
  for (let i = 0; i < studyCount; i++) studies.push(studyPool[(h + i) % studyPool.length]);

  if (inst.organization_type === 'clinical_site') {
    const target = ENROLLMENT_TARGETS[h % ENROLLMENT_TARGETS.length];
    const ratio = ((h >> 3) % 100) / 100;
    const current = Math.round(target * ratio);
    const pct = current / target;
    const health: OrgHealth = pct < 0.15 ? 'critical' : pct < 0.5 ? 'at_risk' : 'healthy';
    return {
      studyInvolvement: studies,
      enrollmentCurrent: current,
      enrollmentTarget: target,
      lastVisitISO: daysAgo((h % 60) + 1),
      health,
    };
  }

  if (inst.organization_type === 'irb_ec') {
    const isApproved = h % 2 === 0;
    return {
      studyInvolvement: studies,
      enrollmentCurrent: 0,
      enrollmentTarget: 0,
      lastVisitISO: daysAgo((h % 30) + 1),
      health: isApproved ? 'healthy' : 'at_risk',
      irbStatus: isApproved ? 'approved' : 'pending',
      irbDateISO: daysAgo((h % 30) + 1),
    };
  }

  if (inst.organization_type === 'lab') {
    const tat = 2 + ((h % 60) / 10);
    return {
      studyInvolvement: studies,
      enrollmentCurrent: 0,
      enrollmentTarget: 0,
      lastVisitISO: daysAgo((h % 20) + 1),
      health: tat < 4 ? 'healthy' : 'at_risk',
      tatDays: Number(tat.toFixed(1)),
    };
  }

  return {
    studyInvolvement: studies,
    enrollmentCurrent: 0,
    enrollmentTarget: 0,
    lastVisitISO: daysAgo((h % 90) + 1),
    health: 'healthy',
  };
}

export interface OrgKpiSnapshot {
  totalOrganizations: number;
  totalOrganizationsLabel: string;
  activeSites: { active: number; total: number };
  sitesAtRisk: number;
  irbsPending: number;
  labsActive: number;
  labsAcrossStudies: number;
}

export const MOCK_ORG_KPI: OrgKpiSnapshot = {
  totalOrganizations: 17,
  totalOrganizationsLabel: 'All types',
  activeSites: { active: 12, total: 14 },
  sitesAtRisk: 3,
  irbsPending: 2,
  labsActive: 2,
  labsAcrossStudies: 3,
};

export interface OrgEnrollmentBucket {
  key: 'gte75' | 'b50_75' | 'b25_50' | 'lt25' | 'none';
  label: string;
  count: number;
  color: string;
}

export interface OrgRegionBucket {
  key: string;
  label: string;
  count: number;
  color: string;
}

export interface OrgInsightsSnapshot {
  enrollmentBuckets: OrgEnrollmentBucket[];
  regionCounts: OrgRegionBucket[];
}

export const MOCK_ORG_INSIGHTS: OrgInsightsSnapshot = {
  enrollmentBuckets: [
    { key: 'gte75', label: '\u2265 75%', count: 4, color: '#10b981' },
    { key: 'b50_75', label: '50% \u2013 75%', count: 3, color: '#22c55e' },
    { key: 'b25_50', label: '25% \u2013 50%', count: 3, color: '#f59e0b' },
    { key: 'lt25', label: '< 25%', count: 2, color: '#ef4444' },
    { key: 'none', label: 'No enrollment', count: 2, color: '#94a3b8' },
  ],
  regionCounts: [
    { key: 'us', label: 'US', count: 12, color: '#0ea5e9' },
    { key: 'eu', label: 'Europe', count: 2, color: '#10b981' },
    { key: 'asia', label: 'Asia', count: 1, color: '#f59e0b' },
    { key: 'other', label: 'Other', count: 2, color: '#94a3b8' },
  ],
};

export type OrgAttentionKey =
  | 'sites_below_50'
  | 'no_visit_60'
  | 'orgs_unassigned';

export interface OrgAttentionRow {
  key: OrgAttentionKey;
  label: string;
  count: number;
}

export const MOCK_ORG_NEEDS_ATTENTION: OrgAttentionRow[] = [
  { key: 'sites_below_50', label: 'Sites below 50% enrollment', count: 2 },
  { key: 'no_visit_60', label: 'No visit in 60+ days', count: 1 },
  { key: 'orgs_unassigned', label: 'Organizations not assigned to study', count: 1 },
];

export interface OrgSuggestion {
  id: string;
  label: string;
  cta: string;
  attentionKey: OrgAttentionKey;
}

export const MOCK_ORG_SUGGESTIONS: OrgSuggestion[] = [
  {
    id: 'visits-60d',
    label: '2 sites have no visit in 60+ days',
    cta: 'Review and schedule visits',
    attentionKey: 'no_visit_60',
  },
  {
    id: 'unassigned',
    label: '1 organization not assigned to any study',
    cta: 'Assign to study',
    attentionKey: 'orgs_unassigned',
  },
];

export const ORG_TYPE_GROUP_ORDER: InstitutionOrganizationType[] = [
  'clinical_site',
  'irb_ec',
  'lab',
  'sponsor',
  'cro',
  'vendor',
  'government',
  'other',
];

export const ORG_TYPE_GROUP_LABEL: Record<InstitutionOrganizationType, { plural: string; singular: string }> = {
  clinical_site: { plural: 'Clinical Sites', singular: 'Clinical Site' },
  irb_ec: { plural: 'Institutional Review Boards', singular: 'IRB' },
  lab: { plural: 'Labs', singular: 'Lab' },
  sponsor: { plural: 'Sponsors', singular: 'Sponsor' },
  cro: { plural: 'CROs', singular: 'CRO' },
  vendor: { plural: 'Vendors', singular: 'Vendor' },
  government: { plural: 'Government', singular: 'Government' },
  other: { plural: 'Other Organizations', singular: 'Organization' },
};

/**
 * Mock institution rows used by the Organizations tab when the DB returns an
 * empty list. Names align with the keys in `ENRICHMENT_BY_NAME` above so the
 * grouped table renders enrollment / IRB / TAT / health values that match the
 * reference image. Pattern mirrors `MOCK_DIRECTORY_CONTACTS` in
 * `lib/directory/mock-contacts-fixture.ts`.
 */
function makeInstitution(over: {
  id: string;
  name: string;
  organization_type: InstitutionOrganizationType;
  city?: string | null;
  state_region?: string | null;
  country_code?: string | null;
  region?: string | null;
}): InstitutionRow {
  return {
    id: over.id,
    company_id: 'mock-company',
    name: over.name,
    organization_type: over.organization_type,
    address_line1: null,
    address_line2: null,
    city: over.city ?? null,
    state_region: over.state_region ?? null,
    postal_code: null,
    country_code: over.country_code ?? null,
    region: over.region ?? null,
    status: 'active',
    notes: null,
    parent_institution_id: null,
    nearest_airport_place_id: null,
    nearest_airport_name: null,
    nearest_airport_address: null,
    nearest_hotel_place_id: null,
    nearest_hotel_name: null,
    nearest_hotel_address: null,
    archived_at: null,
    created_at: daysAgo(180),
    updated_at: daysAgo(7),
  };
}

export const MOCK_INSTITUTIONS: InstitutionRow[] = [
  makeInstitution({
    id: 'mock-org-glmc',
    name: 'Great Lakes Medical Center',
    organization_type: 'clinical_site',
    city: 'Chicago',
    state_region: 'IL',
    country_code: 'US',
    region: 'North America',
  }),
  makeInstitution({
    id: 'mock-org-necr',
    name: 'Northeast Clinical Research',
    organization_type: 'clinical_site',
    city: 'Boston',
    state_region: 'MA',
    country_code: 'US',
    region: 'North America',
  }),
  makeInstitution({
    id: 'mock-org-pwo',
    name: 'Pacific West Oncology',
    organization_type: 'clinical_site',
    city: 'Seattle',
    state_region: 'WA',
    country_code: 'US',
    region: 'North America',
  }),
  makeInstitution({
    id: 'mock-org-pct',
    name: 'Prairie Clinical Trials',
    organization_type: 'clinical_site',
    city: 'Dallas',
    state_region: 'TX',
    country_code: 'US',
    region: 'North America',
  }),
  makeInstitution({
    id: 'mock-org-apex-irb',
    name: 'Apex Independent Review Board',
    organization_type: 'irb_ec',
    city: 'Atlanta',
    state_region: 'GA',
    country_code: 'US',
    region: 'North America',
  }),
  makeInstitution({
    id: 'mock-org-meridian-irb',
    name: 'Meridian Ethics Review Board',
    organization_type: 'irb_ec',
    city: 'Philadelphia',
    state_region: 'PA',
    country_code: 'US',
    region: 'North America',
  }),
  makeInstitution({
    id: 'mock-org-northbridge-irb',
    name: 'Northbridge Institutional Review Board',
    organization_type: 'irb_ec',
    city: 'Minneapolis',
    state_region: 'MN',
    country_code: 'US',
    region: 'North America',
  }),
  makeInstitution({
    id: 'mock-org-trialetics-lab',
    name: 'Trialetics Central Core Lab (demo)',
    organization_type: 'lab',
    city: 'San Diego',
    state_region: 'CA',
    country_code: 'US',
    region: 'North America',
  }),
  makeInstitution({
    id: 'mock-org-biocore',
    name: 'BioCore Diagnostics',
    organization_type: 'lab',
    city: 'Raleigh',
    state_region: 'NC',
    country_code: 'US',
    region: 'North America',
  }),
];
