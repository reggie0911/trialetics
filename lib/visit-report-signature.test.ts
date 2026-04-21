import crypto from 'crypto';
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  TRIP_REPORT_APPROVER_ATTESTATION,
  TRIP_REPORT_AUTHOR_ATTESTATION,
  TRIP_REPORT_VOID_ATTESTATION,
} from './visit-report-signature-attestations';
import {
  assertPasswordReverified,
  computeReportContentHash,
  namesMatch,
  normalizeName,
} from './visit-report-signature';

// =====================================================================
// Pure helpers
// =====================================================================

describe('normalizeName', () => {
  it('lowercases, trims, and collapses whitespace', () => {
    expect(normalizeName('  Jane   Q  Doe  ')).toBe('jane q doe');
  });
  it('returns empty string for null/undefined/empty', () => {
    expect(normalizeName(null)).toBe('');
    expect(normalizeName(undefined)).toBe('');
    expect(normalizeName('   ')).toBe('');
  });
});

describe('namesMatch', () => {
  const profile = { first_name: 'Jane', last_name: 'Doe' };
  it('matches case- and whitespace-insensitively', () => {
    expect(namesMatch('jane doe', profile)).toBe(true);
    expect(namesMatch('  JANE   DOE  ', profile)).toBe(true);
  });
  it('rejects mismatched names', () => {
    expect(namesMatch('John Doe', profile)).toBe(false);
    expect(namesMatch('Jane', profile)).toBe(false);
  });
  it('rejects empty input', () => {
    expect(namesMatch('', profile)).toBe(false);
    expect(namesMatch('   ', profile)).toBe(false);
    expect(namesMatch(null, profile)).toBe(false);
  });
  it('rejects when profile has no name', () => {
    expect(namesMatch('Jane Doe', { first_name: null, last_name: null })).toBe(false);
  });
});

describe('attestation strings', () => {
  it('exposes the three canonical attestation paragraphs', () => {
    expect(TRIP_REPORT_AUTHOR_ATTESTATION.length).toBeGreaterThan(20);
    expect(TRIP_REPORT_APPROVER_ATTESTATION.length).toBeGreaterThan(20);
    expect(TRIP_REPORT_VOID_ATTESTATION.length).toBeGreaterThan(20);
  });
});

// =====================================================================
// Password reverification
// =====================================================================

describe('assertPasswordReverified', () => {
  function authMock(result: { error: { message: string } | null }) {
    return {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue(result),
      },
    } as unknown as SupabaseClient;
  }

  it('rejects when email or password missing', async () => {
    const supabase = authMock({ error: null });
    expect(await assertPasswordReverified(supabase, '', 'pw')).toBe('Password is required.');
    expect(await assertPasswordReverified(supabase, 'a@b.com', '')).toBe('Password is required.');
  });

  it('returns null on successful re-auth', async () => {
    const supabase = authMock({ error: null });
    const result = await assertPasswordReverified(supabase, 'a@b.com', 'good-pw');
    expect(result).toBeNull();
  });

  it('returns generic error on auth failure (does not leak supabase message)', async () => {
    const supabase = authMock({ error: { message: 'invalid_grant: bad password' } });
    const result = await assertPasswordReverified(supabase, 'a@b.com', 'bad');
    expect(result).toBeTruthy();
    expect(result).not.toMatch(/invalid_grant|bad password/i);
  });
});

// =====================================================================
// Content hashing
// =====================================================================

/**
 * Mock the small Supabase surface used by `computeReportContentHash`:
 * - `from('trip_reports').select(...).eq('id', ...).maybeSingle()`
 * - `from(<child>).select(...).eq('trip_report_id', ...)` (thenable)
 *
 * We seed each table with a fixed payload; inserts/updates are not
 * exercised here so the chain only needs to support select + eq +
 * maybeSingle + thenable resolution.
 */
function makeContentHashSupabase(rows: {
  trip_reports: Record<string, unknown> | null;
  trip_report_question_responses: Record<string, unknown>[];
  trip_report_attendees: Record<string, unknown>[];
  trip_report_crf_entries: Record<string, unknown>[];
  trip_report_action_items: Record<string, unknown>[];
  visit_report_attachments: Record<string, unknown>[];
}): SupabaseClient {
  const from = (table: string) => {
    const chain: Record<string, unknown> = {};
    const noop = (key: string) => {
      chain[key] = (..._args: unknown[]) => {
        void _args;
        return chain;
      };
    };
    noop('select');
    noop('eq');
    noop('order');
    noop('in');
    chain.maybeSingle = () => {
      if (table === 'trip_reports') {
        return Promise.resolve({
          data: rows.trip_reports,
          error: rows.trip_reports ? null : null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    };
    chain.then = (onFulfilled: (v: { data: unknown; error: null }) => unknown) => {
      const data =
        table === 'trip_report_question_responses'
          ? rows.trip_report_question_responses
          : table === 'trip_report_attendees'
            ? rows.trip_report_attendees
            : table === 'trip_report_crf_entries'
              ? rows.trip_report_crf_entries
              : table === 'trip_report_action_items'
                ? rows.trip_report_action_items
                : table === 'visit_report_attachments'
                  ? rows.visit_report_attachments
                  : null;
      return Promise.resolve({ data, error: null }).then(onFulfilled);
    };
    return chain as unknown as Record<string, (...args: unknown[]) => unknown>;
  };
  return { from } as unknown as SupabaseClient;
}

const baseReport = {
  id: 'rep-1',
  report_status: 'authoring',
  narrative: 'Visit went well.',
  reviewer_comments_site_attendees: null,
  reviewer_comments_sponsor_attendees: null,
  reviewer_comments_monitored_crfs: null,
  reviewer_comments_narrative: null,
  reviewer_comments_open_actions: null,
  reviewer_comments_attachments: null,
  expected_send_date_confirmation_letter: '2026-04-01',
  expected_send_date_followup_letter: null,
  date_followup_letter_uploaded: null,
  date_mvl_log_uploaded: null,
  template_id: 'tmpl-1',
  template_version_id: 'tver-1',
};

describe('computeReportContentHash', () => {
  it('returns a stable SHA-256 hash for identical content', async () => {
    const seeds = {
      trip_reports: baseReport,
      trip_report_question_responses: [
        { template_question_id: 'q1', template_question_version_id: null, response: 'yes', comments: null, sort_order: 1 },
      ],
      trip_report_attendees: [
        { id: 'a1', first_name: 'Jane', last_name: 'Doe', role: 'CRA', attendee_type: 'site', sort_order: 1 },
      ],
      trip_report_crf_entries: [],
      trip_report_action_items: [],
      visit_report_attachments: [],
    };
    const a = await computeReportContentHash(makeContentHashSupabase(seeds), 'rep-1');
    const b = await computeReportContentHash(makeContentHashSupabase(seeds), 'rep-1');
    expect(a.error).toBeNull();
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(b.hash).toBe(a.hash);
  });

  it('changes when narrative changes', async () => {
    const base = {
      trip_reports: baseReport,
      trip_report_question_responses: [],
      trip_report_attendees: [],
      trip_report_crf_entries: [],
      trip_report_action_items: [],
      visit_report_attachments: [],
    };
    const baseline = await computeReportContentHash(makeContentHashSupabase(base), 'rep-1');
    const mutated = await computeReportContentHash(
      makeContentHashSupabase({
        ...base,
        trip_reports: { ...baseReport, narrative: 'Visit went POORLY.' },
      }),
      'rep-1'
    );
    expect(baseline.hash).not.toBe(mutated.hash);
  });

  it('is order-invariant for unsorted child rows', async () => {
    const seeds1 = {
      trip_reports: baseReport,
      trip_report_question_responses: [
        { template_question_id: 'q1', template_question_version_id: null, response: 'yes', comments: null, sort_order: 1 },
        { template_question_id: 'q2', template_question_version_id: null, response: 'no', comments: null, sort_order: 2 },
      ],
      trip_report_attendees: [
        { id: 'a2', first_name: 'B', last_name: 'B', role: null, attendee_type: 'site', sort_order: 2 },
        { id: 'a1', first_name: 'A', last_name: 'A', role: null, attendee_type: 'site', sort_order: 1 },
      ],
      trip_report_crf_entries: [],
      trip_report_action_items: [],
      visit_report_attachments: [],
    };
    const seeds2 = {
      ...seeds1,
      trip_report_question_responses: [...seeds1.trip_report_question_responses].reverse(),
      trip_report_attendees: [...seeds1.trip_report_attendees].reverse(),
    };
    const h1 = await computeReportContentHash(makeContentHashSupabase(seeds1), 'rep-1');
    const h2 = await computeReportContentHash(makeContentHashSupabase(seeds2), 'rep-1');
    expect(h1.hash).toBe(h2.hash);
  });

  it('returns an error when the report cannot be loaded', async () => {
    const supabase = makeContentHashSupabase({
      trip_reports: null,
      trip_report_question_responses: [],
      trip_report_attendees: [],
      trip_report_crf_entries: [],
      trip_report_action_items: [],
      visit_report_attachments: [],
    });
    const res = await computeReportContentHash(supabase, 'rep-1');
    expect(res.hash).toBeNull();
    expect(res.error).toMatch(/not found/i);
  });

  it('returns an error when the id is missing', async () => {
    const supabase = makeContentHashSupabase({
      trip_reports: baseReport,
      trip_report_question_responses: [],
      trip_report_attendees: [],
      trip_report_crf_entries: [],
      trip_report_action_items: [],
      visit_report_attachments: [],
    });
    const res = await computeReportContentHash(supabase, '');
    expect(res.hash).toBeNull();
    expect(res.error).toBeTruthy();
  });

  it('produces a SHA-256 of the serialized payload (sanity check)', async () => {
    const seeds = {
      trip_reports: baseReport,
      trip_report_question_responses: [],
      trip_report_attendees: [],
      trip_report_crf_entries: [],
      trip_report_action_items: [],
      visit_report_attachments: [],
    };
    const res = await computeReportContentHash(makeContentHashSupabase(seeds), 'rep-1');
    expect(res.hash).toMatch(/^[a-f0-9]{64}$/);
    // Confirm we are using SHA-256, not e.g. SHA-1 (which is 40 hex chars)
    const sha256Len = crypto.createHash('sha256').update('x').digest('hex').length;
    expect(res.hash!.length).toBe(sha256Len);
  });
});
