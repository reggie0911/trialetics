import { describe, expect, it } from 'vitest';

import {
  buildTeamRows,
  formatInviteSent,
  formatLastActive,
  isExternalEmail,
  primaryStudyRole,
} from '@/lib/team/build-team-rows';
import type { TeamMemberWithStudies } from '@/lib/types/ctms';
import type { PendingInvitation } from '@/lib/actions/team';

function makeMember(
  partial: Partial<TeamMemberWithStudies> & { profile_id: string }
): TeamMemberWithStudies {
  return {
    profile_id: partial.profile_id,
    first_name: 'first_name' in partial ? partial.first_name ?? null : 'First',
    last_name: 'last_name' in partial ? partial.last_name ?? null : 'Last',
    email: 'email' in partial ? partial.email ?? null : 'first.last@example.com',
    avatar_url: null,
    app_role: partial.app_role ?? 'user',
    last_sign_in_at: partial.last_sign_in_at ?? null,
    assignments: partial.assignments ?? [],
  };
}

function makeInvitation(partial: Partial<PendingInvitation> & { id: string }): PendingInvitation {
  return {
    id: partial.id,
    email: partial.email ?? 'invitee@example.com',
    role: partial.role ?? 'user',
    first_name: partial.first_name ?? null,
    last_name: partial.last_name ?? null,
    invited_at: partial.invited_at ?? new Date().toISOString(),
    invited_by_name: partial.invited_by_name,
  };
}

describe('isExternalEmail', () => {
  it('returns true when domain differs from company domain', () => {
    expect(isExternalEmail('outsider@partner.com', 'acme.com')).toBe(true);
  });

  it('returns false when domain matches', () => {
    expect(isExternalEmail('jane@acme.com', 'acme.com')).toBe(false);
  });

  it('returns false when no company domain configured', () => {
    expect(isExternalEmail('jane@anywhere.com', null)).toBe(false);
  });

  it('returns false when email is missing', () => {
    expect(isExternalEmail(null, 'acme.com')).toBe(false);
  });

  it('compares case-insensitively', () => {
    expect(isExternalEmail('Jane@ACME.COM', 'acme.com')).toBe(false);
  });
});

describe('formatLastActive', () => {
  const now = new Date('2026-04-23T12:00:00Z');

  it('returns "Never signed in" for null', () => {
    const r = formatLastActive(null, now);
    expect(r).toEqual({ label: 'Never signed in', bucket: 'never' });
  });

  it('returns minutes-ago for last hour', () => {
    const ts = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    expect(formatLastActive(ts, now)).toEqual({ label: '5m ago', bucket: 'today' });
  });

  it('returns hours-ago in same day window', () => {
    const ts = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatLastActive(ts, now)).toEqual({ label: '3h ago', bucket: 'today' });
  });

  it('returns "Today" for >6h same-day window', () => {
    const ts = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
    expect(formatLastActive(ts, now).label).toBe('Today');
  });

  it('returns "Yesterday" for ~1 day ago', () => {
    const ts = new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString();
    expect(formatLastActive(ts, now)).toEqual({ label: 'Yesterday', bucket: 'recent' });
  });

  it('returns days-ago within a week', () => {
    const ts = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatLastActive(ts, now)).toEqual({ label: '4d ago', bucket: 'recent' });
  });

  it('returns weeks-ago within a month', () => {
    const ts = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatLastActive(ts, now)).toEqual({ label: '2w ago', bucket: 'stale' });
  });

  it('returns months-ago within a year', () => {
    const ts = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatLastActive(ts, now)).toEqual({ label: '3mo ago', bucket: 'stale' });
  });

  it('returns years-ago for >1y', () => {
    const ts = new Date(now.getTime() - 800 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatLastActive(ts, now)).toEqual({ label: '2y ago', bucket: 'stale' });
  });

  it('falls back to "Never signed in" for invalid dates', () => {
    expect(formatLastActive('not-a-date', now)).toEqual({
      label: 'Never signed in',
      bucket: 'never',
    });
  });
});

describe('formatInviteSent', () => {
  const now = new Date('2026-04-23T12:00:00Z');

  it('returns "Invite sent today" within last day', () => {
    const ts = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatInviteSent(ts, now)).toBe('Invite sent today');
  });

  it('returns "Invite sent yesterday" near 1 day', () => {
    const ts = new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString();
    expect(formatInviteSent(ts, now)).toBe('Invite sent yesterday');
  });

  it('returns "Invite sent Nd ago" past 2 days', () => {
    const ts = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatInviteSent(ts, now)).toBe('Invite sent 5d ago');
  });
});

describe('primaryStudyRole', () => {
  it('prefers an active assignment', () => {
    const member = makeMember({
      profile_id: 'p1',
      assignments: [
        {
          id: 'a1',
          study_id: 's1',
          study_title: 'A',
          protocol_number: 'P-A',
          role: 'clinical_trial_assistant',
          custom_role_name: null,
          site_name: null,
          is_active: false,
        },
        {
          id: 'a2',
          study_id: 's2',
          study_title: 'B',
          protocol_number: 'P-B',
          role: 'clinical_research_associate',
          custom_role_name: null,
          site_name: null,
          is_active: true,
        },
      ],
    });
    const r = primaryStudyRole(member);
    expect(r?.role).toBe('clinical_research_associate');
    expect(r?.label).toBe('Clinical Research Associate');
  });

  it('falls back to first when none active', () => {
    const member = makeMember({
      profile_id: 'p1',
      assignments: [
        {
          id: 'a1',
          study_id: 's1',
          study_title: 'A',
          protocol_number: 'P-A',
          role: 'biostatistician',
          custom_role_name: null,
          site_name: null,
          is_active: false,
        },
      ],
    });
    expect(primaryStudyRole(member)?.role).toBe('biostatistician');
  });

  it('uses custom_role_name when available', () => {
    const member = makeMember({
      profile_id: 'p1',
      assignments: [
        {
          id: 'a1',
          study_id: 's1',
          study_title: 'A',
          protocol_number: 'P-A',
          role: 'custom',
          custom_role_name: 'Quality Lead',
          site_name: null,
          is_active: true,
        },
      ],
    });
    expect(primaryStudyRole(member)?.label).toBe('Quality Lead');
  });

  it('returns null when no assignments', () => {
    const member = makeMember({ profile_id: 'p1', assignments: [] });
    expect(primaryStudyRole(member)).toBeNull();
  });
});

describe('buildTeamRows', () => {
  it('places members alphabetically before invites by date desc', () => {
    const members = [
      makeMember({ profile_id: 'b', first_name: 'Bob', last_name: 'Builder' }),
      makeMember({ profile_id: 'a', first_name: 'Alice', last_name: 'Atlas' }),
    ];
    const invites = [
      makeInvitation({
        id: 'i1',
        email: 'old@x.com',
        invited_at: '2026-04-20T00:00:00Z',
      }),
      makeInvitation({
        id: 'i2',
        email: 'new@x.com',
        invited_at: '2026-04-22T00:00:00Z',
      }),
    ];
    const rows = buildTeamRows(members, invites);
    expect(rows.map((r) => r.id)).toEqual([
      'member:a',
      'member:b',
      'invite:i2',
      'invite:i1',
    ]);
  });

  it('dedupes invites whose email matches a member', () => {
    const members = [
      makeMember({ profile_id: 'a', email: 'shared@x.com' }),
    ];
    const invites = [
      makeInvitation({ id: 'i1', email: 'SHARED@x.com' }),
      makeInvitation({ id: 'i2', email: 'fresh@x.com' }),
    ];
    const rows = buildTeamRows(members, invites, { dedupeAgainstMembers: true });
    const ids = rows.map((r) => r.id);
    expect(ids).toContain('member:a');
    expect(ids).toContain('invite:i2');
    expect(ids).not.toContain('invite:i1');
  });

  it('falls back to email when first/last are missing', () => {
    const rows = buildTeamRows(
      [
        makeMember({
          profile_id: 'p',
          first_name: null,
          last_name: null,
          email: 'noname@x.com',
        }),
      ],
      []
    );
    expect(rows[0]?.name).toBe('noname@x.com');
    expect(rows[0]?.initials).toBe('N');
  });
});
