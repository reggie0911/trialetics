import type { InstitutionOrganizationType } from '@/lib/types/directory';
import type { OrgTypeLabelMap } from '@/lib/directory/live-directory-types';

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

export const ORG_TYPE_GROUP_LABEL: OrgTypeLabelMap = {
  clinical_site: { plural: 'Clinical Sites', singular: 'Clinical Site' },
  irb_ec: { plural: 'Institutional Review Boards', singular: 'IRB' },
  lab: { plural: 'Labs', singular: 'Lab' },
  sponsor: { plural: 'Sponsors', singular: 'Sponsor' },
  cro: { plural: 'CROs', singular: 'CRO' },
  vendor: { plural: 'Vendors', singular: 'Vendor' },
  government: { plural: 'Government', singular: 'Government' },
  other: { plural: 'Other Organizations', singular: 'Organization' },
};
