import type { TeamMemberWithStudies, TeamMemberRole } from '@/lib/types/ctms';
import type { PendingInvitation } from '@/lib/actions/team';

/**
 * Unified row used by the Study Team table. Members and pending invitations
 * render side-by-side, with invites sorted to the bottom and given a synthetic
 * "Awaiting assignment" placeholder so the column shapes match.
 */
export type TeamRow =
  | {
      kind: 'member';
      id: string;
      name: string;
      initials: string;
      member: TeamMemberWithStudies;
    }
  | {
      kind: 'invite';
      id: string;
      name: string;
      initials: string;
      invitation: PendingInvitation;
    };

/**
 * True when an email's domain doesn't match the company domain. A null domain
 * (no company domain configured) is treated as "not external" so the KPI
 * shows zero rather than flagging everyone.
 */
export function isExternalEmail(
  email: string | null | undefined,
  companyDomain: string | null | undefined
): boolean {
  if (!companyDomain) return false;
  const at = email?.indexOf('@') ?? -1;
  if (at < 0) return false;
  const domain = email!.slice(at + 1).toLowerCase().trim();
  return domain !== companyDomain.toLowerCase().trim();
}

function nameAndInitials(
  first: string | null | undefined,
  last: string | null | undefined,
  email: string | null | undefined
): { name: string; initials: string } {
  const trimmedFirst = (first ?? '').trim();
  const trimmedLast = (last ?? '').trim();
  const fullName = [trimmedFirst, trimmedLast].filter(Boolean).join(' ');
  const fallback = (email ?? '').trim();
  const name = fullName || fallback || 'Unknown';
  const initials =
    ((trimmedFirst[0] ?? '') + (trimmedLast[0] ?? '')).toUpperCase() ||
    (fallback[0] ?? '?').toUpperCase();
  return { name, initials };
}

export interface BuildTeamRowsOptions {
  /** When set, drop pending invitations whose study_id doesn't match this study. */
  studyContextId?: string;
  /** Drop invitations whose email already corresponds to a profile in `members`. */
  dedupeAgainstMembers?: boolean;
}

/**
 * Merge directory members and pending invitations into a single, table-ready
 * list. Members come first (alphabetical by name) followed by invitations
 * (most recent first) so the active team is visible above the fold.
 */
export function buildTeamRows(
  members: TeamMemberWithStudies[],
  pendingInvitations: PendingInvitation[],
  options: BuildTeamRowsOptions = {}
): TeamRow[] {
  const memberRows: TeamRow[] = members.map((member) => {
    const { name, initials } = nameAndInitials(member.first_name, member.last_name, member.email);
    return { kind: 'member', id: `member:${member.profile_id}`, name, initials, member };
  });

  const memberEmails = new Set(
    members
      .map((m) => (m.email ?? '').trim().toLowerCase())
      .filter((e) => e.length > 0)
  );

  const inviteRows: TeamRow[] = pendingInvitations
    .filter((inv) => {
      if (options.dedupeAgainstMembers && memberEmails.has(inv.email.trim().toLowerCase())) {
        return false;
      }
      return true;
    })
    .map((invitation) => {
      const { name, initials } = nameAndInitials(
        invitation.first_name,
        invitation.last_name,
        invitation.email
      );
      return { kind: 'invite', id: `invite:${invitation.id}`, name, initials, invitation };
    });

  memberRows.sort((a, b) => a.name.localeCompare(b.name));
  inviteRows.sort((a, b) => {
    if (a.kind !== 'invite' || b.kind !== 'invite') return 0;
    return new Date(b.invitation.invited_at).getTime() - new Date(a.invitation.invited_at).getTime();
  });

  return [...memberRows, ...inviteRows];
}

/**
 * Resolve the primary study role for a member in study-scoped contexts. We
 * prefer an active assignment; otherwise the most recent (first) one.
 */
export function primaryStudyRole(
  member: TeamMemberWithStudies
): { role: TeamMemberRole; label: string } | null {
  const active = member.assignments.find((a) => a.is_active);
  const target = active ?? member.assignments[0];
  if (!target) return null;
  const label = target.custom_role_name?.trim() || formatRoleLabel(target.role);
  return { role: target.role, label };
}

function formatRoleLabel(role: TeamMemberRole): string {
  return role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Format `last_sign_in_at` for the Last Active column. Returns a short
 * relative string and the recency bucket used for the dot color.
 */
export function formatLastActive(
  isoTimestamp: string | null | undefined,
  now: Date = new Date()
): { label: string; bucket: 'today' | 'recent' | 'stale' | 'never' } {
  if (!isoTimestamp) return { label: 'Never signed in', bucket: 'never' };
  const then = new Date(isoTimestamp);
  if (Number.isNaN(then.getTime())) return { label: 'Never signed in', bucket: 'never' };

  const diffMs = now.getTime() - then.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < 0) return { label: 'Today', bucket: 'today' };
  if (diffMs < hour) {
    const minutes = Math.max(1, Math.floor(diffMs / minute));
    return { label: `${minutes}m ago`, bucket: 'today' };
  }
  if (diffMs < day) {
    const hours = Math.max(1, Math.floor(diffMs / hour));
    return { label: hours <= 6 ? `${hours}h ago` : 'Today', bucket: 'today' };
  }
  if (diffMs < 2 * day) return { label: 'Yesterday', bucket: 'recent' };
  if (diffMs < 7 * day) {
    const days = Math.floor(diffMs / day);
    return { label: `${days}d ago`, bucket: 'recent' };
  }
  if (diffMs < 30 * day) {
    const weeks = Math.floor(diffMs / (7 * day));
    return { label: `${weeks}w ago`, bucket: 'stale' };
  }
  if (diffMs < 365 * day) {
    const months = Math.floor(diffMs / (30 * day));
    return { label: `${months}mo ago`, bucket: 'stale' };
  }
  const years = Math.floor(diffMs / (365 * day));
  return { label: `${years}y ago`, bucket: 'stale' };
}

/**
 * Format an invitation's "invited at" timestamp the same shape the table
 * uses for active members, so the cell width stays stable.
 */
export function formatInviteSent(
  isoTimestamp: string,
  now: Date = new Date()
): string {
  const then = new Date(isoTimestamp);
  if (Number.isNaN(then.getTime())) return 'Invite sent';

  const diffMs = now.getTime() - then.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diffMs < day) return 'Invite sent today';
  if (diffMs < 2 * day) return 'Invite sent yesterday';
  const days = Math.floor(diffMs / day);
  return `Invite sent ${days}d ago`;
}
