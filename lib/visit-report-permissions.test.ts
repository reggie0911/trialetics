import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  REPORT_AUTHOR_ROLE,
  REPORT_REVIEWER_ROLE,
  assertReportReviewerPermission,
  canViewTripReportContent,
  getProfileIsCpmOnAnyStudy,
  getUserIsStudyCraAndCpm,
  profileHasStudyRoles,
} from './visit-report-permissions';

/**
 * Lightweight mock of the small subset of the supabase-js fluent query API
 * that visit-report-permissions actually uses. Each `from()` call pops the
 * next response from the queue, so individual tests can fully control the
 * "database" without needing a real Supabase instance.
 */
type MockResponse =
  | { data: unknown; error: null }
  | { data: null; error: { message: string } };

function makeSupabaseMock(responses: MockResponse[]) {
  const queue = [...responses];
  const calls: { table: string; filters: Record<string, unknown>; method: string }[] = [];

  const builder = (table: string) => {
    const state = { table, filters: {} as Record<string, unknown>, method: 'select' };
    const chain: Record<string, unknown> = {};
    const passthrough = (key: string, valueKey?: string) => {
      chain[key] = (...args: unknown[]) => {
        if (valueKey && args.length >= 2) state.filters[String(args[0])] = args[1];
        if (key === 'select' || key === 'insert' || key === 'update' || key === 'delete') {
          state.method = key;
        }
        return chain;
      };
    };
    passthrough('select');
    passthrough('eq', 'value');
    passthrough('in', 'value');
    passthrough('order');
    passthrough('limit');

    const settle = () => {
      calls.push({ ...state });
      const next = queue.shift();
      if (!next) {
        return Promise.resolve({ data: null, error: null } as MockResponse);
      }
      return Promise.resolve(next);
    };
    chain.maybeSingle = () => settle();
    chain.single = () => settle();
    chain.then = (onFulfilled: (value: MockResponse) => unknown) => settle().then(onFulfilled);

    return chain as unknown as Record<string, (...args: unknown[]) => unknown>;
  };

  const supabase = {
    from: vi.fn((table: string) => builder(table)),
  } as unknown as SupabaseClient;

  return { supabase, calls };
}

describe('profileHasStudyRoles', () => {
  it('returns true when a matching active membership exists', async () => {
    const { supabase, calls } = makeSupabaseMock([
      { data: { id: 'stm-1' }, error: null },
    ]);
    const ok = await profileHasStudyRoles(supabase, 'profile-1', 'study-1', [REPORT_AUTHOR_ROLE]);
    expect(ok).toBe(true);
    expect(calls[0].table).toBe('study_team_members');
    expect(calls[0].filters).toMatchObject({
      profile_id: 'profile-1',
      study_id: 'study-1',
      is_active: true,
    });
  });

  it('returns false when supabase responds with no row', async () => {
    const { supabase } = makeSupabaseMock([{ data: null, error: null }]);
    const ok = await profileHasStudyRoles(supabase, 'profile-1', 'study-1', [REPORT_AUTHOR_ROLE]);
    expect(ok).toBe(false);
  });

  it('treats supabase errors as "not authorised" rather than throwing', async () => {
    const { supabase } = makeSupabaseMock([{ data: null, error: { message: 'boom' } }]);
    const ok = await profileHasStudyRoles(supabase, 'profile-1', 'study-1', [REPORT_AUTHOR_ROLE]);
    expect(ok).toBe(false);
  });
});

describe('getProfileIsCpmOnAnyStudy', () => {
  it('returns true when at least one active CPM membership is found', async () => {
    const { supabase, calls } = makeSupabaseMock([
      { data: { id: 'stm-1' }, error: null },
    ]);
    expect(await getProfileIsCpmOnAnyStudy(supabase, 'profile-1')).toBe(true);
    expect(calls[0].filters).toMatchObject({
      profile_id: 'profile-1',
      role: REPORT_REVIEWER_ROLE,
      is_active: true,
    });
  });

  it('returns false when no membership exists', async () => {
    const { supabase } = makeSupabaseMock([{ data: null, error: null }]);
    expect(await getProfileIsCpmOnAnyStudy(supabase, 'profile-1')).toBe(false);
  });
});

describe('getUserIsStudyCraAndCpm', () => {
  it('returns both flags based on the two role lookups', async () => {
    const { supabase } = makeSupabaseMock([
      { data: { id: 'cra' }, error: null },
      { data: null, error: null },
    ]);
    const result = await getUserIsStudyCraAndCpm(supabase, 'profile-1', 'study-1');
    expect(result).toEqual({ isCra: true, isCpm: false });
  });
});

describe('canViewTripReportContent', () => {
  it('grants view to anyone (including unauthenticated) when the report is approved', async () => {
    const { supabase } = makeSupabaseMock([]);
    expect(await canViewTripReportContent(supabase, null, 'approved_and_signed', 'study-1')).toBe(true);
  });

  it('denies view to unauthenticated callers when the report is in-flight', async () => {
    const { supabase } = makeSupabaseMock([]);
    expect(await canViewTripReportContent(supabase, null, 'submitted', 'study-1')).toBe(false);
  });

  it('grants view when the user is a CRA on the study', async () => {
    const { supabase } = makeSupabaseMock([
      { data: { id: 'cra' }, error: null },
      { data: null, error: null },
    ]);
    expect(await canViewTripReportContent(supabase, 'profile-1', 'submitted', 'study-1')).toBe(true);
  });

  it('grants view when the user is a CPM on the study', async () => {
    const { supabase } = makeSupabaseMock([
      { data: null, error: null },
      { data: { id: 'cpm' }, error: null },
    ]);
    expect(await canViewTripReportContent(supabase, 'profile-1', 'under_review', 'study-1')).toBe(true);
  });

  it('grants view to company admins even without study membership', async () => {
    const { supabase } = makeSupabaseMock([
      { data: null, error: null },
      { data: null, error: null },
      { data: { role: 'admin' }, error: null },
    ]);
    expect(await canViewTripReportContent(supabase, 'profile-1', 'submitted', 'study-1')).toBe(true);
  });

  it('denies view to non-team users with the regular "user" app role', async () => {
    const { supabase } = makeSupabaseMock([
      { data: null, error: null },
      { data: null, error: null },
      { data: { role: 'user' }, error: null },
    ]);
    expect(await canViewTripReportContent(supabase, 'profile-1', 'submitted', 'study-1')).toBe(false);
  });
});

describe('assertReportReviewerPermission', () => {
  it('returns null (allow) when the user is a CPM on the study', async () => {
    const { supabase } = makeSupabaseMock([
      { data: { visit_id: 'visit-1' }, error: null },
      { data: { study_id: 'study-1' }, error: null },
      { data: { id: 'cpm' }, error: null },
    ]);
    const err = await assertReportReviewerPermission(supabase, 'profile-1', 'report-1', null);
    expect(err).toBeNull();
  });

  it('allows the assigned reviewer even when they are not a CPM', async () => {
    const { supabase } = makeSupabaseMock([
      { data: { visit_id: 'visit-1' }, error: null },
      { data: { study_id: 'study-1' }, error: null },
      { data: null, error: null },
    ]);
    const err = await assertReportReviewerPermission(supabase, 'profile-1', 'report-1', 'profile-1');
    expect(err).toBeNull();
  });

  it('blocks users who are neither CPM nor the assigned reviewer', async () => {
    const { supabase } = makeSupabaseMock([
      { data: { visit_id: 'visit-1' }, error: null },
      { data: { study_id: 'study-1' }, error: null },
      { data: null, error: null },
    ]);
    const err = await assertReportReviewerPermission(supabase, 'profile-1', 'report-1', 'someone-else');
    expect(err).toMatch(/Clinical Project Manager/);
  });

  it('propagates the report-not-found error from getStudyIdForReport', async () => {
    const { supabase } = makeSupabaseMock([
      { data: null, error: null },
    ]);
    const err = await assertReportReviewerPermission(supabase, 'profile-1', 'missing', null);
    expect(err).toBe('Report not found.');
  });
});
