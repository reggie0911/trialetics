import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  loadTemplateForReport,
  maybeRefreshSnapshotForReport,
  snapshotTemplateForReport,
} from './visit-report-template-versions';

/**
 * Lightweight Supabase mock for the snapshot/loader tests. Mirrors the
 * style used by `lib/visit-report-permissions.test.ts` but adds:
 *
 *   - per-table FIFO queues (a single test typically issues several
 *     operations against the same table), and
 *   - capture for insert/update payloads so individual tests can
 *     assert the exact shape of what would be written to Postgres.
 *
 * Each registered op declares a table and (optionally) a method match.
 * Calls that do not match any remaining op resolve to `{ data: null,
 * error: null }` so misconfigured tests fail loudly rather than
 * silently fall through to a real connection.
 */
type MockResponse =
  | { data: unknown; error: null }
  | { data: null; error: { message: string } };

interface MockOp {
  table: string;
  method?: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  /** Response returned by the terminal `.single() / .maybeSingle() / await` call. */
  response: MockResponse;
  /** Captures the payload passed to insert/update/upsert and the eq filters seen so far. */
  capture?: (payload: unknown, filters: Record<string, unknown>) => void;
}

interface MockCallRecord {
  table: string;
  method: string;
  filters: Record<string, unknown>;
  payload: unknown;
}

function makeSupabaseMock(ops: MockOp[]) {
  const queue = ops.map((o) => ({ ...o }));
  const calls: MockCallRecord[] = [];

  const popMatch = (table: string, method: string): MockOp | null => {
    for (let i = 0; i < queue.length; i += 1) {
      const op = queue[i];
      if (op.table !== table) continue;
      if (op.method && op.method !== method) continue;
      queue.splice(i, 1);
      return op;
    }
    return null;
  };

  const builder = (table: string) => {
    const state = {
      table,
      method: 'select' as MockCallRecord['method'],
      filters: {} as Record<string, unknown>,
      payload: undefined as unknown,
    };
    const chain: Record<string, unknown> = {};

    chain.select = (..._args: unknown[]) => {
      // Only treat as a `select` if no write method was set first
      // (Supabase chains insert(...).select(...) for returning rows).
      if (state.method === 'select') state.method = 'select';
      return chain;
    };
    chain.insert = (payload: unknown) => {
      state.method = 'insert';
      state.payload = payload;
      return chain;
    };
    chain.update = (payload: unknown) => {
      state.method = 'update';
      state.payload = payload;
      return chain;
    };
    chain.upsert = (payload: unknown, _opts?: unknown) => {
      state.method = 'upsert';
      state.payload = payload;
      return chain;
    };
    chain.delete = () => {
      state.method = 'delete';
      return chain;
    };
    chain.eq = (col: string, value: unknown) => {
      state.filters[col] = value;
      return chain;
    };
    chain.in = (col: string, value: unknown) => {
      state.filters[col] = value;
      return chain;
    };
    chain.is = (col: string, value: unknown) => {
      state.filters[`is_${col}`] = value;
      return chain;
    };
    chain.not = (..._args: unknown[]) => chain;
    chain.order = (..._args: unknown[]) => chain;
    chain.limit = (..._args: unknown[]) => chain;

    const settle = () => {
      const op = popMatch(state.table, state.method);
      calls.push({
        table: state.table,
        method: state.method,
        filters: { ...state.filters },
        payload: state.payload,
      });
      if (op?.capture) op.capture(state.payload, state.filters);
      const response: MockResponse = op?.response ?? { data: null, error: null };
      return Promise.resolve(response);
    };

    chain.maybeSingle = () => settle();
    chain.single = () => settle();
    chain.then = (onFulfilled: (value: MockResponse) => unknown) => settle().then(onFulfilled);

    return chain as unknown as Record<string, (...args: unknown[]) => unknown>;
  };

  const supabase = {
    from: vi.fn((table: string) => builder(table)),
  } as unknown as SupabaseClient;

  return { supabase, calls, remaining: () => queue.length };
}

describe('snapshotTemplateForReport', () => {
  it('skips when the report has no template_id', async () => {
    const { supabase, calls } = makeSupabaseMock([
      {
        table: 'trip_reports',
        method: 'select',
        response: {
          data: {
            id: 'report-1',
            template_id: null,
            template_version_id: null,
            report_status: 'report_pending',
          },
          error: null,
        },
      },
    ]);

    const result = await snapshotTemplateForReport('report-1', supabase, {
      reason: 'on_create',
      profileId: 'profile-1',
    });

    expect(result).toEqual({ versionId: null, error: null });
    // Only the trip_reports SELECT runs; no version inserts.
    expect(calls.map((c) => `${c.table}:${c.method}`)).toEqual(['trip_reports:select']);
  });

  it('inserts version + question_versions and links the report on the create path', async () => {
    let capturedVersionPayload: unknown = null;
    let capturedQuestionsPayload: unknown = null;
    let capturedReportUpdate: unknown = null;

    const { supabase } = makeSupabaseMock([
      {
        table: 'trip_reports',
        method: 'select',
        response: {
          data: {
            id: 'report-1',
            template_id: 'tpl-1',
            template_version_id: null,
            report_status: 'report_pending',
          },
          error: null,
        },
      },
      // fetchLiveTemplateAndQuestions: parallel (template, questions) reads
      {
        table: 'visit_report_templates',
        method: 'select',
        response: {
          data: {
            id: 'tpl-1',
            company_id: 'c-1',
            study_id: null,
            name: 'IMV Template',
            visit_report_type: 'monitoring',
            days_submission: 14,
            days_approval: 7,
            days_basis: 'calendar',
            template_status: 'active',
            created_by: 'profile-x',
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-10T00:00:00Z',
          },
          error: null,
        },
      },
      {
        table: 'visit_report_template_questions',
        method: 'select',
        response: {
          data: [
            {
              id: 'q-1',
              template_id: 'tpl-1',
              report_order: 1,
              report_section: 'A',
              report_sub_section: null,
              question_text: 'First?',
              sort_order: 1,
              created_at: '2026-04-01T00:00:00Z',
            },
            {
              id: 'q-2',
              template_id: 'tpl-1',
              report_order: 2,
              report_section: 'A',
              report_sub_section: null,
              question_text: 'Second?',
              sort_order: 2,
              created_at: '2026-04-01T00:00:00Z',
            },
          ],
          error: null,
        },
      },
      // existing versions lookup for next version_number
      {
        table: 'visit_report_template_versions',
        method: 'select',
        response: { data: [], error: null },
      },
      // version insert returning id
      {
        table: 'visit_report_template_versions',
        method: 'insert',
        response: { data: { id: 'ver-1' }, error: null },
        capture: (payload) => {
          capturedVersionPayload = payload;
        },
      },
      // question_versions insert
      {
        table: 'visit_report_template_question_versions',
        method: 'insert',
        response: { data: null, error: null },
        capture: (payload) => {
          capturedQuestionsPayload = payload;
        },
      },
      // trip_reports update setting template_version_id
      {
        table: 'trip_reports',
        method: 'update',
        response: { data: null, error: null },
        capture: (payload) => {
          capturedReportUpdate = payload;
        },
      },
    ]);

    const result = await snapshotTemplateForReport('report-1', supabase, {
      reason: 'on_create',
      profileId: 'profile-1',
    });

    expect(result).toEqual({ versionId: 'ver-1', error: null });
    expect(capturedVersionPayload).toMatchObject({
      template_id: 'tpl-1',
      version_number: 1,
      name: 'IMV Template',
      visit_report_type: 'monitoring',
      days_submission: 14,
      days_approval: 7,
      snapshot_reason: 'on_create',
      snapshot_taken_by: 'profile-1',
    });
    expect(Array.isArray(capturedQuestionsPayload)).toBe(true);
    const qPayload = capturedQuestionsPayload as Array<Record<string, unknown>>;
    expect(qPayload).toHaveLength(2);
    expect(qPayload[0]).toMatchObject({
      template_version_id: 'ver-1',
      source_question_id: 'q-1',
      question_text: 'First?',
      sort_order: 1,
    });
    expect(capturedReportUpdate).toMatchObject({ template_version_id: 'ver-1' });
  });

  it('returns the existing-version+1 as the next version_number on subsequent snapshots', async () => {
    let capturedVersionPayload: unknown = null;
    const { supabase } = makeSupabaseMock([
      {
        table: 'trip_reports',
        method: 'select',
        response: {
          data: {
            id: 'report-2',
            template_id: 'tpl-1',
            template_version_id: 'old-ver',
            report_status: 'report_pending',
          },
          error: null,
        },
      },
      {
        table: 'visit_report_templates',
        method: 'select',
        response: {
          data: {
            id: 'tpl-1',
            name: 'IMV Template',
            visit_report_type: 'monitoring',
            days_submission: 14,
            days_approval: 7,
          },
          error: null,
        },
      },
      {
        table: 'visit_report_template_questions',
        method: 'select',
        response: { data: [], error: null },
      },
      {
        table: 'visit_report_template_versions',
        method: 'select',
        response: { data: [{ version_number: 3 }], error: null },
      },
      {
        table: 'visit_report_template_versions',
        method: 'insert',
        response: { data: { id: 'ver-4' }, error: null },
        capture: (payload) => {
          capturedVersionPayload = payload;
        },
      },
      {
        table: 'trip_reports',
        method: 'update',
        response: { data: null, error: null },
      },
    ]);

    const result = await snapshotTemplateForReport('report-2', supabase, {
      reason: 'on_first_edit',
      profileId: null,
    });

    expect(result).toEqual({ versionId: 'ver-4', error: null });
    expect((capturedVersionPayload as { version_number: number }).version_number).toBe(4);
  });
});

describe('maybeRefreshSnapshotForReport', () => {
  it('is a no-op when the report is not in report_pending', async () => {
    const { supabase, calls } = makeSupabaseMock([
      {
        table: 'trip_reports',
        method: 'select',
        response: {
          data: {
            id: 'report-1',
            template_id: 'tpl-1',
            template_version_id: 'ver-1',
            report_status: 'submitted',
          },
          error: null,
        },
      },
    ]);

    const result = await maybeRefreshSnapshotForReport('report-1', supabase, 'profile-1');
    expect(result).toEqual({ refreshed: false, error: null });
    expect(calls).toHaveLength(1);
  });

  it('does nothing when the live template has not changed since the snapshot', async () => {
    const { supabase, calls } = makeSupabaseMock([
      {
        table: 'trip_reports',
        method: 'select',
        response: {
          data: {
            id: 'report-1',
            template_id: 'tpl-1',
            template_version_id: 'ver-1',
            report_status: 'report_pending',
          },
          error: null,
        },
      },
      {
        table: 'visit_report_templates',
        method: 'select',
        response: { data: { updated_at: '2026-04-01T00:00:00Z' }, error: null },
      },
      {
        table: 'visit_report_template_versions',
        method: 'select',
        response: { data: { id: 'ver-1', created_at: '2026-04-10T00:00:00Z' }, error: null },
      },
    ]);

    const result = await maybeRefreshSnapshotForReport('report-1', supabase, 'profile-1');
    expect(result).toEqual({ refreshed: false, error: null });
    // No insert path was hit.
    expect(calls.some((c) => c.method === 'insert')).toBe(false);
  });

  it('re-snapshots and migrates pre-snapshot responses by source_question_id when the live template is newer', async () => {
    const captured: { responseUpdates: Array<{ payload: unknown; filters: Record<string, unknown> }> } = {
      responseUpdates: [],
    };

    const { supabase } = makeSupabaseMock([
      // 1) initial fetchTripReportForSnapshot in maybeRefreshSnapshotForReport
      {
        table: 'trip_reports',
        method: 'select',
        response: {
          data: {
            id: 'report-1',
            template_id: 'tpl-1',
            template_version_id: 'ver-old',
            report_status: 'report_pending',
          },
          error: null,
        },
      },
      // 2) live template updated_at
      {
        table: 'visit_report_templates',
        method: 'select',
        response: { data: { updated_at: '2026-05-01T00:00:00Z' }, error: null },
      },
      // 3) existing version created_at
      {
        table: 'visit_report_template_versions',
        method: 'select',
        response: { data: { id: 'ver-old', created_at: '2026-04-01T00:00:00Z' }, error: null },
      },
      // ---- snapshotTemplateForReport flow ----
      // 4) re-fetch trip_reports
      {
        table: 'trip_reports',
        method: 'select',
        response: {
          data: {
            id: 'report-1',
            template_id: 'tpl-1',
            template_version_id: 'ver-old',
            report_status: 'report_pending',
          },
          error: null,
        },
      },
      // 5) live template
      {
        table: 'visit_report_templates',
        method: 'select',
        response: {
          data: {
            id: 'tpl-1',
            name: 'Tpl',
            visit_report_type: 'monitoring',
            days_submission: 10,
            days_approval: 5,
          },
          error: null,
        },
      },
      // 6) live questions
      {
        table: 'visit_report_template_questions',
        method: 'select',
        response: {
          data: [
            { id: 'live-q-1', sort_order: 1, question_text: 'Q1' },
            { id: 'live-q-2', sort_order: 2, question_text: 'Q2' },
          ],
          error: null,
        },
      },
      // 7) existing versions count
      {
        table: 'visit_report_template_versions',
        method: 'select',
        response: { data: [{ version_number: 1 }], error: null },
      },
      // 8) insert new version
      {
        table: 'visit_report_template_versions',
        method: 'insert',
        response: { data: { id: 'ver-new' }, error: null },
      },
      // 9) insert new question_versions
      {
        table: 'visit_report_template_question_versions',
        method: 'insert',
        response: { data: null, error: null },
      },
      // 10) update trip_reports.template_version_id
      {
        table: 'trip_reports',
        method: 'update',
        response: { data: null, error: null },
      },
      // ---- migrateResponsesBetweenSnapshots ----
      // 11) previous version's questions
      {
        table: 'visit_report_template_question_versions',
        method: 'select',
        response: {
          data: [
            { id: 'qv-old-1', source_question_id: 'live-q-1' },
            { id: 'qv-old-2', source_question_id: 'live-q-2' },
            { id: 'qv-old-3', source_question_id: null }, // no migration
          ],
          error: null,
        },
      },
      // 12) next version's questions
      {
        table: 'visit_report_template_question_versions',
        method: 'select',
        response: {
          data: [
            { id: 'qv-new-1', source_question_id: 'live-q-1' },
            { id: 'qv-new-2', source_question_id: 'live-q-2' },
          ],
          error: null,
        },
      },
      // 13) two response migration updates (one per matched source_question_id)
      {
        table: 'trip_report_question_responses',
        method: 'update',
        response: { data: null, error: null },
        capture: (payload, filters) => {
          captured.responseUpdates.push({ payload, filters });
        },
      },
      {
        table: 'trip_report_question_responses',
        method: 'update',
        response: { data: null, error: null },
        capture: (payload, filters) => {
          captured.responseUpdates.push({ payload, filters });
        },
      },
    ]);

    const result = await maybeRefreshSnapshotForReport('report-1', supabase, 'profile-1');
    expect(result).toEqual({ refreshed: true, error: null });

    expect(captured.responseUpdates).toHaveLength(2);
    const targetVersionIds = captured.responseUpdates
      .map((u) => (u.payload as { template_question_version_id: string }).template_question_version_id)
      .sort();
    expect(targetVersionIds).toEqual(['qv-new-1', 'qv-new-2']);

    const filterOldIds = captured.responseUpdates
      .map((u) => u.filters.template_question_version_id as string)
      .sort();
    expect(filterOldIds).toEqual(['qv-old-1', 'qv-old-2']);
  });
});

describe('loadTemplateForReport', () => {
  it('reads from the snapshot when template_version_id is set', async () => {
    const { supabase } = makeSupabaseMock([
      {
        table: 'trip_reports',
        method: 'select',
        response: {
          data: {
            id: 'report-1',
            template_id: 'tpl-1',
            template_version_id: 'ver-1',
            report_status: 'report_pending',
          },
          error: null,
        },
      },
      {
        table: 'visit_report_template_versions',
        method: 'select',
        response: {
          data: {
            id: 'ver-1',
            template_id: 'tpl-1',
            version_number: 1,
            name: 'Snapshotted Tpl',
            visit_report_type: 'monitoring',
            days_submission: 14,
            days_approval: 7,
            snapshot_reason: 'on_create',
            snapshot_taken_by: null,
            created_at: '2026-04-01T00:00:00Z',
          },
          error: null,
        },
      },
      {
        table: 'visit_report_template_question_versions',
        method: 'select',
        response: {
          data: [
            {
              id: 'qv-1',
              template_version_id: 'ver-1',
              source_question_id: 'live-q-1',
              report_order: 1,
              report_section: null,
              report_sub_section: null,
              question_text: 'Snapshot Q1',
              sort_order: 1,
              created_at: '2026-04-01T00:00:00Z',
            },
          ],
          error: null,
        },
      },
    ]);

    const loaded = await loadTemplateForReport('report-1', supabase);
    expect(loaded.error).toBeNull();
    expect(loaded.source).toEqual({ kind: 'snapshot', versionId: 'ver-1' });
    expect(loaded.template?.name).toBe('Snapshotted Tpl');
    // The exposed template id must remain the live id so URL routing
    // and lookups don't break across snapshots.
    expect(loaded.template?.id).toBe('tpl-1');
    expect(loaded.questions).toHaveLength(1);
    // Question id surfaced as the version row id so response writes
    // can branch on it via resolveTemplateQuestionVersionId.
    expect(loaded.questions[0].id).toBe('qv-1');
    expect(loaded.questions[0].question_text).toBe('Snapshot Q1');
  });

  it('falls back to the live template for legacy reports without a snapshot', async () => {
    const { supabase } = makeSupabaseMock([
      {
        table: 'trip_reports',
        method: 'select',
        response: {
          data: {
            id: 'report-legacy',
            template_id: 'tpl-1',
            template_version_id: null,
            report_status: 'authoring',
          },
          error: null,
        },
      },
      {
        table: 'visit_report_templates',
        method: 'select',
        response: {
          data: {
            id: 'tpl-1',
            company_id: 'c-1',
            study_id: null,
            name: 'Live Tpl',
            visit_report_type: 'monitoring',
            days_submission: 14,
            days_approval: 7,
            days_basis: 'calendar',
            template_status: 'active',
            created_by: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-10T00:00:00Z',
          },
          error: null,
        },
      },
      {
        table: 'visit_report_template_questions',
        method: 'select',
        response: {
          data: [
            {
              id: 'live-q-1',
              template_id: 'tpl-1',
              report_order: 1,
              report_section: null,
              report_sub_section: null,
              question_text: 'Live Q1',
              sort_order: 1,
              created_at: '2026-04-01T00:00:00Z',
            },
          ],
          error: null,
        },
      },
    ]);

    const loaded = await loadTemplateForReport('report-legacy', supabase);
    expect(loaded.error).toBeNull();
    expect(loaded.source).toEqual({ kind: 'live', templateId: 'tpl-1' });
    expect(loaded.template?.name).toBe('Live Tpl');
    expect(loaded.questions).toHaveLength(1);
    expect(loaded.questions[0].id).toBe('live-q-1');
  });

  it('returns an empty result when the report has neither template_id nor version', async () => {
    const { supabase } = makeSupabaseMock([
      {
        table: 'trip_reports',
        method: 'select',
        response: {
          data: {
            id: 'report-empty',
            template_id: null,
            template_version_id: null,
            report_status: 'report_pending',
          },
          error: null,
        },
      },
    ]);

    const loaded = await loadTemplateForReport('report-empty', supabase);
    expect(loaded.error).toBeNull();
    expect(loaded.source).toBeNull();
    expect(loaded.template).toBeNull();
    expect(loaded.questions).toEqual([]);
  });
});
