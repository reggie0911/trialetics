'use server';

import { createClient } from '@/lib/server';
import type { TeamMemberRole } from '@/lib/types/ctms';
import {
  type IpAccessTier,
  type IpPermissions,
  IP_SPONSOR_ROLES,
  IP_SITE_ROLES,
  buildIpPermissions,
  isTierAtLeast,
} from '@/lib/types/ip-access';

export interface IpAccessResolution {
  tier: IpAccessTier;
  siteIds: string[] | null;
  teamRoles: TeamMemberRole[];
}

/**
 * Resolve the IP access tier for the current user in the context of a study.
 * Returns the tier, the user's restricted site IDs (null = unrestricted), and
 * the team-member roles matched.
 */
export async function resolveIpAccessTier(
  studyId: string
): Promise<IpAccessResolution> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, role, is_platform_admin')
    .eq('user_id', user.id)
    .maybeSingle();
  if (profileErr) throw new Error(profileErr.message);
  if (!profile) throw new Error('Profile not found');

  if (profile.role === 'admin' || profile.is_platform_admin === true) {
    return { tier: 'admin', siteIds: null, teamRoles: [] };
  }

  const { data: memberships, error: memberErr } = await supabase
    .from('study_team_members')
    .select('role, site_id')
    .eq('profile_id', profile.id)
    .eq('study_id', studyId)
    .eq('is_active', true);
  if (memberErr) throw new Error(memberErr.message);
  if (!memberships || memberships.length === 0) {
    throw new Error('You do not have access to this study\'s inventory.');
  }

  const roles = memberships.map((m) => m.role as TeamMemberRole);
  const hasSponsorRole = roles.some((r) => IP_SPONSOR_ROLES.has(r));
  if (hasSponsorRole) {
    return { tier: 'sponsor', siteIds: null, teamRoles: roles };
  }

  const hasSiteRole = roles.some((r) => IP_SITE_ROLES.has(r));
  if (hasSiteRole) {
    const siteIds = [
      ...new Set(
        memberships
          .filter((m) => IP_SITE_ROLES.has(m.role as TeamMemberRole) && m.site_id)
          .map((m) => m.site_id as string)
      ),
    ];
    return { tier: 'site', siteIds, teamRoles: roles };
  }

  throw new Error('Your role does not grant access to inventory management.');
}

/**
 * Resolve the full IpPermissions for the current user + study.
 * Intended as a server action callable from the client when the selected study changes.
 */
export async function getIpPermissionsForStudy(
  studyId: string
): Promise<IpPermissions> {
  const { tier, siteIds, teamRoles } = await resolveIpAccessTier(studyId);
  return buildIpPermissions(tier, siteIds, teamRoles);
}

/**
 * Assert the user has at least the given tier for the study.
 * Throws a descriptive error if the check fails.
 */
export async function assertIpMinTier(
  studyId: string,
  minTier: IpAccessTier
): Promise<IpAccessResolution> {
  const resolution = await resolveIpAccessTier(studyId);
  if (!isTierAtLeast(resolution.tier, minTier)) {
    throw new Error(
      `This action requires ${minTier}-level access. Your current tier is "${resolution.tier}".`
    );
  }
  return resolution;
}

/** Shortcut: assert the user is an IP admin for the study. */
export async function assertIpAdmin(studyId: string): Promise<IpAccessResolution> {
  return assertIpMinTier(studyId, 'admin');
}

/**
 * Assert the user's tier is at least the given tier, and additionally verify
 * that the target site is in the user's allowed site list (for site-level users).
 */
export async function assertIpMinTierForSite(
  studyId: string,
  minTier: IpAccessTier,
  targetSiteId: string
): Promise<IpAccessResolution> {
  const resolution = await assertIpMinTier(studyId, minTier);
  if (resolution.siteIds !== null && !resolution.siteIds.includes(targetSiteId)) {
    throw new Error('You do not have access to this site.');
  }
  return resolution;
}
