/**
 * Server-action coverage for `approveReportsBulk` (continuous-session
 * signing per 21 CFR 11.200(a)(1)(ii)).
 *
 * The single-report `approveReport` flow is already covered in
 * `lib/actions/visit-reports-part11.test.ts`; this file only exercises
 * the batch-specific behavior:
 *
 *   - Wholesale rejection paths (bad password, name mismatch, bad
 *     attestation, empty list, over the cap) write zero audit rows.
 *   - Happy path on N reports writes one audit row per report and they
 *     all share the SAME `signing_session_id`.
 *   - Mixed-batch failure isolation: one report failing (wrong status)
 *     does not abort the rest; successful rows still share the session.
 *   - Permission failure on one report is surfaced per-row, not as a
 *     batch-wide error.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateClient = vi.fn();
const mockCreateAdminClient = vi.fn();

vi.mock('@/lib/server', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));
vi.mock('@/lib/server-admin', () => ({
  createAdminClient: (...args: unknown[]) => mockCreateAdminClient(...args),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Map()) }));

vi.mock('@/lib/trip-report-notifications', () => ({
  notifyReportApproved: vi.fn().mockResolvedValue(undefined),
  notifyReportReturnedToAuthor: vi.fn().mockResolvedValue(undefined),
  notifyReportSubmitted: vi.fn().mockResolvedValue(undefined),
  notifyReviewerAssigned: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/actions/company', () => ({
  getCompanyLogoUrl: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/lib/utils/build-visit-report-pdf-data', () => ({
  buildVisitReportPdfData: vi.fn().mockResolvedValue({}),
}));

const mockAssertReportReviewerPermission = vi.fn().mockResolvedValue(null);
const mockGetStudyIdForVisit = vi.fn().mockResolvedValue({ studyId: 'study-1', error: null });
const mockGetProfileRole = vi.fn().mockResolvedValue('admin');
vi.mock('@/lib/visit-report-permissions', async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    assertReportReviewerPermission: (...a: unknown[]) =>
      mockAssertReportReviewerPermission(...a),
    getStudyIdForVisit: (...a: unknown[]) => mockGetStudyIdForVisit(...a),
    getProfileRole: (...a: unknown[]) => mockGetProfileRole(...a),
  };
});

const mockLogTripReportSignatureAudit = vi
  .fn()
  .mockResolvedValue({ id: 'audit-1', error: null });
const mockLogTripReportStatusEvent = vi.fn().mockResolvedValue({ id: 'evt-1', error: null });
vi.mock('@/lib/trip-report-audit', () => ({
  logTripReportSignatureAudit: (...a: unknown[]) => mockLogTripReportSignatureAudit(...a),
  logTripReportStatusEvent: (...a: unknown[]) => mockLogTripReportStatusEvent(...a),
}));

const realAttestations = await import('@/lib/visit-report-signature-attestations');
const mockAssertPasswordReverified = vi.fn().mockResolvedValue(null);
// Each successive call returns a distinct hash so we can assert the
// per-report content hash is recomputed and not reused across the batch.
const mockComputeReportContentHash = vi
  .fn()
  .mockImplementation(async (_supabase: unknown, reportId: string) => ({
    hash: `hash-${reportId}-`.padEnd(64, 'x').slice(0, 64),
    error: null,
  }));
const mockNamesMatch = vi.fn().mockReturnValue(true);
vi.mock('@/lib/visit-report-signature', () => ({
  TRIP_REPORT_AUTHOR_ATTESTATION: realAttestations.TRIP_REPORT_AUTHOR_ATTESTATION,
  TRIP_REPORT_APPROVER_ATTESTATION: realAttestations.TRIP_REPORT_APPROVER_ATTESTATION,
  TRIP_REPORT_VOID_ATTESTATION: realAttestations.TRIP_REPORT_VOID_ATTESTATION,
  assertPasswordReverified: (...a: unknown[]) => mockAssertPasswordReverified(...a),
  computeReportContentHash: (...a: unknown[]) => mockComputeReportContentHash(...a),
  namesMatch: (...a: unknown[]) => mockNamesMatch(...a),
}));

vi.mock('@/lib/actions/visit-report-template-versions', () => ({
  loadTemplateForReport: vi.fn().mockResolvedValue({ template: null, error: null }),
  maybeRefreshSnapshotForReport: vi.fn().mockResolvedValue({ refreshed: false, error: null }),
  resolveTemplateQuestionVersionId: vi.fn().mockResolvedValue({ id: null, error: null }),
  snapshotTemplateForReport: vi.fn().mockResolvedValue({ error: null }),
}));

// =====================================================================
// In-memory Supabase chain (same shape as part11.test.ts).
// =====================================================================

type Resp = { data: unknown; error: { message: string } | null };
interface ScriptedOp {
  table: string;
  method?: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  resp: Resp;
  capture?: (payload: unknown, filters: Record<string, unknown>) => void;
}

interface Recorded {
  table: string;
  method: string;
  filters: Record<string, unknown>;
  payload: unknown;
}

function makeSupabase(opts: {
  user?: { id: string; email: string } | null;
  ops: ScriptedOp[];
  signInError?: { message: string } | null;
}) {
  const queue = opts.ops.map((o) => ({ ...o }));
  const recorded: Recorded[] = [];

  const popMatch = (table: string, method: string): ScriptedOp | undefined => {
    for (let i = 0; i < queue.length; i += 1) {
      const op = queue[i];
      if (op.table !== table) continue;
      if (op.method && op.method !== method) continue;
      queue.splice(i, 1);
      return op;
    }
    return undefined;
  };

  const fromImpl = (table: string) => {
    const state = {
      method: 'select' as Recorded['method'],
      filters: {} as Record<string, unknown>,
      payload: undefined as unknown,
    };
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.insert = (p: unknown) => {
      state.method = 'insert';
      state.payload = p;
      return chain;
    };
    chain.update = (p: unknown) => {
      state.method = 'update';
      state.payload = p;
      return chain;
    };
    chain.upsert = (p: unknown) => {
      state.method = 'upsert';
      state.payload = p;
      return chain;
    };
    chain.delete = () => {
      state.method = 'delete';
      return chain;
    };
    chain.eq = (col: string, val: unknown) => {
      state.filters[col] = val;
      return chain;
    };
    chain.in = (col: string, val: unknown) => {
      state.filters[col] = val;
      return chain;
    };
    chain.is = () => chain;
    chain.not = () => chain;
    chain.order = () => chain;
    chain.limit = () => chain;

    const settle = (): Promise<Resp> => {
      const op = popMatch(table, state.method);
      recorded.push({
        table,
        method: state.method,
        filters: { ...state.filters },
        payload: state.payload,
      });
      if (op?.capture) op.capture(state.payload, state.filters);
      return Promise.resolve(op?.resp ?? { data: null, error: null });
    };
    chain.single = settle;
    chain.maybeSingle = settle;
    chain.then = (cb: (v: Resp) => unknown) => settle().then(cb);
    return chain;
  };

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: opts.user ?? null }, error: null }),
      signInWithPassword: vi
        .fn()
        .mockResolvedValue({ data: null, error: opts.signInError ?? null }),
    },
    from: vi.fn(fromImpl),
  };
  return { supabase, recorded };
}

const { approveReportsBulk } = await import('./visit-reports');

const PROFILE = { id: 'profile-1', user_id: 'auth-1' };
const USER = { id: 'auth-1', email: 'jane@example.com' };

const VALID_OPTIONS = {
  signatureData: 'data:image/png;base64,iVBOR=',
  printedName: 'Jane Doe',
  attestationText: realAttestations.TRIP_REPORT_APPROVER_ATTESTATION,
  password: 'pw',
};

beforeEach(() => {
  mockAssertReportReviewerPermission.mockResolvedValue(null);
  mockAssertPasswordReverified.mockResolvedValue(null);
  mockComputeReportContentHash.mockImplementation(async (_supabase: unknown, reportId: string) => ({
    hash: `hash-${reportId}-`.padEnd(64, 'x').slice(0, 64),
    error: null,
  }));
  mockNamesMatch.mockReturnValue(true);
  mockGetProfileRole.mockResolvedValue('admin');
  mockGetStudyIdForVisit.mockResolvedValue({ studyId: 'study-1', error: null });
  mockLogTripReportSignatureAudit.mockResolvedValue({ id: 'audit-1', error: null });
  mockLogTripReportStatusEvent.mockResolvedValue({ id: 'evt-1', error: null });
});

afterEach(() => {
  vi.clearAllMocks();
});

/**
 * Build the per-report query queue the bulk loop runs:
 *   1. trip_reports SELECT (status / reviewer / created_by / visit)
 *   2. trip_reports UPDATE (approval columns)
 */
function perReportOps(
  reportId: string,
  reportStatus: string,
  capture?: (payload: unknown) => void
): ScriptedOp[] {
  return [
    {
      table: 'trip_reports',
      method: 'select',
      resp: {
        data: {
          report_status: reportStatus,
          reviewer_id: PROFILE.id,
          created_by: 'author-of-' + reportId,
          visit_id: 'visit-of-' + reportId,
        },
        error: null,
      },
    },
    {
      table: 'trip_reports',
      method: 'update',
      resp: { data: null, error: null },
      capture: (p) => capture?.(p),
    },
  ];
}

const PROFILE_LOOKUP_OP: ScriptedOp = {
  // loadSignerIdentity → profiles select on user_id
  table: 'profiles',
  method: 'select',
  resp: {
    data: { id: PROFILE.id, email: USER.email, first_name: 'Jane', last_name: 'Doe' },
    error: null,
  },
};

// =====================================================================
// Wholesale rejection
// =====================================================================

describe('approveReportsBulk — wholesale rejection paths', () => {
  it('rejects when no reportIds are provided', async () => {
    const { supabase } = makeSupabase({ user: USER, ops: [] });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const r = await approveReportsBulk([], VALID_OPTIONS);
    expect(r.error).toMatch(/no reports selected/i);
    expect(r.summary.total).toBe(0);
    expect(mockLogTripReportSignatureAudit).not.toHaveBeenCalled();
  });

  it('rejects when more than 50 reports are submitted in one batch', async () => {
    const { supabase } = makeSupabase({ user: USER, ops: [] });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const ids = Array.from({ length: 51 }, (_, i) => `rep-${i}`);
    const r = await approveReportsBulk(ids, VALID_OPTIONS);
    expect(r.error).toMatch(/cannot approve more than/i);
    expect(mockLogTripReportSignatureAudit).not.toHaveBeenCalled();
  });

  it('rejects when attestation text does not match the canonical approver statement', async () => {
    const { supabase } = makeSupabase({ user: USER, ops: [] });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const r = await approveReportsBulk(['rep-1', 'rep-2'], {
      ...VALID_OPTIONS,
      attestationText: 'I agree to the thing',
    });
    expect(r.error).toMatch(/attestation/i);
    expect(mockLogTripReportSignatureAudit).not.toHaveBeenCalled();
    expect(mockAssertPasswordReverified).not.toHaveBeenCalled();
  });

  it('rejects when password reverification fails (no audit rows)', async () => {
    mockAssertPasswordReverified.mockResolvedValueOnce('Incorrect password.');
    const { supabase } = makeSupabase({ user: USER, ops: [PROFILE_LOOKUP_OP] });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const r = await approveReportsBulk(['rep-1', 'rep-2'], VALID_OPTIONS);
    expect(r.error).toMatch(/incorrect password/i);
    expect(mockLogTripReportSignatureAudit).not.toHaveBeenCalled();
  });

  it('rejects when the typed name does not match the profile (no audit rows)', async () => {
    mockNamesMatch.mockReturnValueOnce(false);
    const { supabase } = makeSupabase({ user: USER, ops: [PROFILE_LOOKUP_OP] });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const r = await approveReportsBulk(['rep-1'], { ...VALID_OPTIONS, printedName: 'Imposter' });
    expect(r.error).toMatch(/does not match the name on your account/i);
    expect(mockLogTripReportSignatureAudit).not.toHaveBeenCalled();
  });
});

// =====================================================================
// Happy path
// =====================================================================

describe('approveReportsBulk — happy path', () => {
  it('writes one audit row per report and shares signing_session_id across the batch', async () => {
    const captured: Record<string, unknown>[] = [];
    const ops: ScriptedOp[] = [
      PROFILE_LOOKUP_OP,
      ...perReportOps('rep-1', 'under_review', (p) =>
        captured.push(p as Record<string, unknown>)
      ),
      ...perReportOps('rep-2', 'under_review', (p) =>
        captured.push(p as Record<string, unknown>)
      ),
      ...perReportOps('rep-3', 'under_review', (p) =>
        captured.push(p as Record<string, unknown>)
      ),
    ];
    const { supabase } = makeSupabase({ user: USER, ops });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const r = await approveReportsBulk(['rep-1', 'rep-2', 'rep-3'], VALID_OPTIONS);

    expect(r.error).toBeNull();
    expect(r.summary).toEqual({ total: 3, succeeded: 3, failed: 0 });
    expect(r.results).toHaveLength(3);
    expect(r.results.every((row) => row.ok)).toBe(true);

    // Continuous controlled session: ONE password challenge, ONE name match.
    expect(mockAssertPasswordReverified).toHaveBeenCalledTimes(1);
    expect(mockNamesMatch).toHaveBeenCalledTimes(1);

    // Per-record manifestation: one audit row per report.
    expect(mockLogTripReportSignatureAudit).toHaveBeenCalledTimes(3);
    const auditCalls = mockLogTripReportSignatureAudit.mock.calls.map(
      (c) => c[0] as Record<string, unknown>
    );
    const sessionIds = new Set(auditCalls.map((c) => c.signingSessionId as string));
    expect(sessionIds.size).toBe(1);
    const sessionId = [...sessionIds][0];
    expect(typeof sessionId).toBe('string');
    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/i);

    // Each audit row carries the canonical approver attestation, the
    // correct kind, and a content hash distinct from the others.
    for (const call of auditCalls) {
      expect(call.kind).toBe('approver_approve');
      expect(call.attestationText).toBe(realAttestations.TRIP_REPORT_APPROVER_ATTESTATION);
      expect(call.passwordVerified).toBe(true);
      expect(call.printedName).toBe('Jane Doe');
    }
    const hashes = new Set(auditCalls.map((c) => c.contentHash as string));
    expect(hashes.size).toBe(3);

    // Each report got the approval columns written.
    expect(captured).toHaveLength(3);
    for (const update of captured) {
      expect(update.report_status).toBe('approved_and_signed');
      expect(update.approval_attestation_text).toBe(
        realAttestations.TRIP_REPORT_APPROVER_ATTESTATION
      );
      expect(typeof update.approval_signed_at_db).toBe('string');
    }

    // One status event per report.
    expect(mockLogTripReportStatusEvent).toHaveBeenCalledTimes(3);
  });
});

// =====================================================================
// Mixed batch / failure isolation
// =====================================================================

describe('approveReportsBulk — failure isolation across the batch', () => {
  it('one wrong-status report does not abort the others; succeeded rows still share the session', async () => {
    const captured: Record<string, unknown>[] = [];
    const ops: ScriptedOp[] = [
      PROFILE_LOOKUP_OP,
      // rep-1 OK
      ...perReportOps('rep-1', 'under_review', (p) =>
        captured.push(p as Record<string, unknown>)
      ),
      // rep-2 has wrong status — only the SELECT op is consumed; no UPDATE.
      {
        table: 'trip_reports',
        method: 'select',
        resp: {
          data: {
            report_status: 'returned',
            reviewer_id: PROFILE.id,
            created_by: 'author-of-rep-2',
            visit_id: 'visit-of-rep-2',
          },
          error: null,
        },
      },
      // rep-3 OK
      ...perReportOps('rep-3', 'under_review', (p) =>
        captured.push(p as Record<string, unknown>)
      ),
    ];
    const { supabase } = makeSupabase({ user: USER, ops });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const r = await approveReportsBulk(['rep-1', 'rep-2', 'rep-3'], VALID_OPTIONS);

    expect(r.error).toBeNull();
    expect(r.summary).toEqual({ total: 3, succeeded: 2, failed: 1 });

    const byId = new Map(r.results.map((row) => [row.reportId, row]));
    expect(byId.get('rep-1')!.ok).toBe(true);
    expect(byId.get('rep-3')!.ok).toBe(true);
    expect(byId.get('rep-2')!.ok).toBe(false);
    expect(byId.get('rep-2')!.error).toMatch(/no longer under review/i);

    // Audit rows: only for the successful reports, and they share a session.
    expect(mockLogTripReportSignatureAudit).toHaveBeenCalledTimes(2);
    const auditCalls = mockLogTripReportSignatureAudit.mock.calls.map(
      (c) => c[0] as Record<string, unknown>
    );
    const sessionIds = new Set(auditCalls.map((c) => c.signingSessionId as string));
    expect(sessionIds.size).toBe(1);
    const auditedReportIds = auditCalls.map((c) => c.tripReportId as string).sort();
    expect(auditedReportIds).toEqual(['rep-1', 'rep-3']);
  });

  it('per-report permission failure is surfaced per-row, not as a wholesale error', async () => {
    // rep-1 passes the reviewer permission gate; rep-2 fails it.
    mockAssertReportReviewerPermission
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('You are not a CPM on this study.');

    const captured: Record<string, unknown>[] = [];
    const ops: ScriptedOp[] = [
      PROFILE_LOOKUP_OP,
      // rep-1 OK (select then update)
      ...perReportOps('rep-1', 'under_review', (p) =>
        captured.push(p as Record<string, unknown>)
      ),
      // rep-2: the SELECT runs, but UPDATE never does because the
      // permission check rejects between them.
      {
        table: 'trip_reports',
        method: 'select',
        resp: {
          data: {
            report_status: 'under_review',
            reviewer_id: PROFILE.id,
            created_by: 'author-of-rep-2',
            visit_id: 'visit-of-rep-2',
          },
          error: null,
        },
      },
    ];
    const { supabase } = makeSupabase({ user: USER, ops });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const r = await approveReportsBulk(['rep-1', 'rep-2'], VALID_OPTIONS);

    expect(r.error).toBeNull();
    expect(r.summary).toEqual({ total: 2, succeeded: 1, failed: 1 });
    const byId = new Map(r.results.map((row) => [row.reportId, row]));
    expect(byId.get('rep-1')!.ok).toBe(true);
    expect(byId.get('rep-2')!.ok).toBe(false);
    expect(byId.get('rep-2')!.error).toMatch(/not a CPM on this study/i);

    expect(mockLogTripReportSignatureAudit).toHaveBeenCalledTimes(1);
    const auditCall = mockLogTripReportSignatureAudit.mock.calls[0][0] as Record<string, unknown>;
    expect(auditCall.tripReportId).toBe('rep-1');
  });
});
