import type { TeamMemberRole } from '@/lib/types/ctms';

export type IpAccessTier = 'admin' | 'sponsor' | 'site';

/** Sponsor / CRO roles that get company-wide IP visibility. */
export const IP_SPONSOR_ROLES: ReadonlySet<TeamMemberRole> = new Set<TeamMemberRole>([
  'clinical_research_associate',
  'clinical_trial_assistant',
  'clinical_project_manager',
  'cra_manager',
  'executive_director',
  'clinical_data_manager',
  'regulatory_specialist',
  'safety_specialist',
  'medical_writer',
  'biostatistician',
]);

/** Site-level roles scoped to their assigned site(s). */
export const IP_SITE_ROLES: ReadonlySet<TeamMemberRole> = new Set<TeamMemberRole>([
  'study_coordinator',
  'principal_investigator',
  'inventory_specialist',
]);

export interface IpPermissions {
  tier: IpAccessTier;
  /** The specific team-member role(s) this user holds for the study. */
  teamRoles: TeamMemberRole[];
  /** null = all sites visible; string[] = restricted to these site IDs */
  restrictedSiteIds: string[] | null;
  canViewGlobalInventory: boolean;
  canAddInventory: boolean;
  canCreateShipments: boolean;
  canReceiveInventory: boolean;
  canUnreceiveInventory: boolean;
  canUpdateDisposition: boolean;
  canMarkUsed: boolean;
  canVerifyInventory: boolean;
  canUnverifyInventory: boolean;
  canEditRecords: boolean;
  canApproveUpdates: boolean;
  canGenerateReports: boolean;
  canDeleteRecords: boolean;
  canRestoreRecords: boolean;
  canCorrectAuditLogs: boolean;
  canManageRoles: boolean;
  canConfigureSystem: boolean;
  canChangeDisposition: boolean;
  canResetToAvailable: boolean;
}

const TIER_RANK: Record<IpAccessTier, number> = { site: 0, sponsor: 1, admin: 2 };

export function isTierAtLeast(actual: IpAccessTier, required: IpAccessTier): boolean {
  return TIER_RANK[actual] >= TIER_RANK[required];
}

export function buildIpPermissions(
  tier: IpAccessTier,
  siteIds: string[] | null,
  teamRoles: TeamMemberRole[] = []
): IpPermissions {
  const isAdmin = tier === 'admin';
  const isSponsor = tier === 'sponsor';
  const isSite = tier === 'site';

  const canAddInventory =
    isAdmin || (isSponsor && teamRoles.includes('clinical_project_manager'));

  return {
    tier,
    teamRoles,
    restrictedSiteIds: isSite ? siteIds : null,

    canViewGlobalInventory: isAdmin || isSponsor,
    canAddInventory,
    canCreateShipments: isAdmin || isSponsor,
    canReceiveInventory: true,
    canUnreceiveInventory: true,
    canUpdateDisposition: true,
    canMarkUsed: true,
    canVerifyInventory: isAdmin || isSponsor,
    canUnverifyInventory: isAdmin || isSponsor,
    canEditRecords: isAdmin || isSponsor,
    canApproveUpdates: isAdmin || isSponsor,
    canGenerateReports: true,
    canDeleteRecords: isAdmin,
    canRestoreRecords: isAdmin,
    canCorrectAuditLogs: isAdmin,
    canManageRoles: isAdmin,
    canConfigureSystem: isAdmin,
    canChangeDisposition: isAdmin,
    canResetToAvailable: isAdmin,
  };
}
