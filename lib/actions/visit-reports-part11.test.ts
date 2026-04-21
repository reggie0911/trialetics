/**
 * Server-action coverage for the 21 CFR Part 11 signing pipeline. The
 * helpers themselves (name match, password reverification, content
 * hash) are exercised in lib/visit-report-signature.test.ts; this file
 * focuses on the orchestrating server actions: input validation, audit
 * row emission, server-side timestamping, and the post-approval edit
 * lock that protects signed records.
 *
 * Strategy:
 * - vi.mock the heavy module dependencies (Supabase clients, Next.js
 *   runtime, signature helpers, notifications, PDF data builder) so we
 *   can assert what the action *does* with their results, not how they
 *   are implemented.
 * - For each action we wire a minimal in-memory Supabase that replays
 *   the queries the action issues in order.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// =====================================================================
// Module-level mocks (must be declared before importing the SUT).
// =====================================================================

const mockCreateClient = vi.fn();
const mockCreateAdminClient = vi.fn();

vi.mock('@/lib/server', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));
vi.mock('@/lib/server-admin', () => ({
  createAdminClient: (...args: unknown[]) => mockCreateAdminClient(...args),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Map()),
}));

// Notifications + PDF data + company logo are all side-effect modules
// the actions touch on the success path. Stub them to no-ops so we can
// concentrate on the signature flow.
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

// Permission gates: we are not testing RBAC here (visit-report-permissions
// has its own suite). Pass-through "allow" so we exercise the signing
// codepath. Individual tests can override via `mockReturnValueOnce`.
const mockAssertReportAuthorPermission = vi.fn().mockResolvedValue(null);
const mockAssertReportCpmPermission = vi.fn().mockResolvedValue(null);
const mockAssertReportReviewerPermission = vi.fn().mockResolvedValue(null);
const mockGetStudyIdForVisit = vi.fn().mockResolvedValue({ studyId: 'study-1', error: null });
const mockGetProfileRole = vi.fn().mockResolvedValue('admin');
vi.mock('@/lib/visit-report-permissions', async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    assertReportAuthorPermission: (...a: unknown[]) => mockAssertReportAuthorPermission(...a),
    assertReportCpmPermission: (...a: unknown[]) => mockAssertReportCpmPermission(...a),
    assertReportReviewerPermission: (...a: unknown[]) =>
      mockAssertReportReviewerPermission(...a),
    getStudyIdForVisit: (...a: unknown[]) => mockGetStudyIdForVisit(...a),
    getProfileRole: (...a: unknown[]) => mockGetProfileRole(...a),
  };
});

// Audit + status-event writers: capture their calls so tests can assert
// the full audit row that would be persisted.
const mockLogTripReportSignatureAudit = vi.fn().mockResolvedValue({ id: 'audit-1', error: null });
const mockLogTripReportStatusEvent = vi.fn().mockResolvedValue({ id: 'evt-1', error: null });
vi.mock('@/lib/trip-report-audit', () => ({
  logTripReportSignatureAudit: (...a: unknown[]) => mockLogTripReportSignatureAudit(...a),
  logTripReportStatusEvent: (...a: unknown[]) => mockLogTripReportStatusEvent(...a),
}));

// Signature helpers — already covered by visit-report-signature.test.ts.
// Re-export the canonical attestation strings so the SUT compares
// against the same constants the test assertions use.
const realAttestations = await import('@/lib/visit-report-signature-attestations');
const mockAssertPasswordReverified = vi.fn().mockResolvedValue(null);
const mockComputeReportContentHash = vi
  .fn()
  .mockResolvedValue({ hash: 'a'.repeat(64), error: null });
const mockNamesMatch = vi.fn().mockReturnValue(true);
vi.mock('@/lib/visit-report-signature', () => ({
  TRIP_REPORT_AUTHOR_ATTESTATION: realAttestations.TRIP_REPORT_AUTHOR_ATTESTATION,
  TRIP_REPORT_APPROVER_ATTESTATION: realAttestations.TRIP_REPORT_APPROVER_ATTESTATION,
  TRIP_REPORT_VOID_ATTESTATION: realAttestations.TRIP_REPORT_VOID_ATTESTATION,
  assertPasswordReverified: (...a: unknown[]) => mockAssertPasswordReverified(...a),
  computeReportContentHash: (...a: unknown[]) => mockComputeReportContentHash(...a),
  namesMatch: (...a: unknown[]) => mockNamesMatch(...a),
}));

// Template-version helpers are not under test here.
vi.mock('@/lib/actions/visit-report-template-versions', () => ({
  loadTemplateForReport: vi.fn().mockResolvedValue({ template: null, error: null }),
  maybeRefreshSnapshotForReport: vi.fn().mockResolvedValue({ refreshed: false, error: null }),
  resolveTemplateQuestionVersionId: vi.fn().mockResolvedValue({ id: null, error: null }),
  snapshotTemplateForReport: vi.fn().mockResolvedValue({ error: null }),
}));

// =====================================================================
// In-memory Supabase chain
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

// =====================================================================
// SUT
// =====================================================================

const { submitReport, approveReport, voidApproval, saveReportNarrative } = await import(
  './visit-reports'
);

const PROFILE = { id: 'profile-1', user_id: 'auth-1' };
const USER = { id: 'auth-1', email: 'jane@example.com' };

beforeEach(() => {
  mockAssertReportAuthorPermission.mockResolvedValue(null);
  mockAssertReportCpmPermission.mockResolvedValue(null);
  mockAssertReportReviewerPermission.mockResolvedValue(null);
  mockAssertPasswordReverified.mockResolvedValue(null);
  mockComputeReportContentHash.mockResolvedValue({ hash: 'a'.repeat(64), error: null });
  mockNamesMatch.mockReturnValue(true);
  mockGetProfileRole.mockResolvedValue('admin');
  mockGetStudyIdForVisit.mockResolvedValue({ studyId: 'study-1', error: null });
  mockLogTripReportSignatureAudit.mockResolvedValue({ id: 'audit-1', error: null });
  mockLogTripReportStatusEvent.mockResolvedValue({ id: 'evt-1', error: null });
});

afterEach(() => {
  vi.clearAllMocks();
});

// =====================================================================
// submitReport
// =====================================================================

describe('submitReport — Part 11 signing manifestations', () => {
  function defaultOps(reportStatus = 'authoring'): ScriptedOp[] {
    return [
      // loadSignerIdentity → profiles select on user_id
      {
        table: 'profiles',
        method: 'select',
        resp: { data: { id: PROFILE.id, email: USER.email, first_name: 'Jane', last_name: 'Doe' }, error: null },
      },
      // assertReportAuthorPermission is mocked, no DB calls
      // maybeRefreshSnapshotForReport is mocked
      // trip_reports select report_status before update
      {
        table: 'trip_reports',
        method: 'select',
        resp: {
          data: { report_status: reportStatus, visit_id: 'visit-1', reviewer_id: null },
          error: null,
        },
      },
      // computeReportContentHash is mocked
      // trip_reports update with new signature columns
      { table: 'trip_reports', method: 'update', resp: { data: null, error: null } },
    ];
  }

  it('rejects when printed name is missing', async () => {
    const { supabase } = makeSupabase({ user: USER, ops: [] });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const result = await submitReport('rep-1', {
      signatureData: 'data:image/png;base64,iVBOR=',
      printedName: '   ',
      attestationText: realAttestations.TRIP_REPORT_AUTHOR_ATTESTATION,
      password: 'pw',
    });

    expect(result.error).toMatch(/type your full legal name/i);
    expect(mockLogTripReportSignatureAudit).not.toHaveBeenCalled();
  });

  it('rejects when attestation text does not match the canonical statement', async () => {
    const { supabase } = makeSupabase({ user: USER, ops: [] });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const result = await submitReport('rep-1', {
      signatureData: 'data:image/png;base64,iVBOR=',
      printedName: 'Jane Doe',
      attestationText: 'I agree to the thing',
      password: 'pw',
    });

    expect(result.error).toMatch(/attestation/i);
    expect(mockLogTripReportSignatureAudit).not.toHaveBeenCalled();
  });

  it('rejects when signature image is missing', async () => {
    const { supabase } = makeSupabase({ user: USER, ops: [] });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const result = await submitReport('rep-1', {
      signatureData: '   ',
      printedName: 'Jane Doe',
      attestationText: realAttestations.TRIP_REPORT_AUTHOR_ATTESTATION,
      password: 'pw',
    });
    expect(result.error).toMatch(/signature is required/i);
  });

  it('rejects when password reverification fails', async () => {
    mockAssertPasswordReverified.mockResolvedValueOnce('Incorrect password');
    const { supabase } = makeSupabase({ user: USER, ops: defaultOps() });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const result = await submitReport('rep-1', {
      signatureData: 'data:image/png;base64,iVBOR=',
      printedName: 'Jane Doe',
      attestationText: realAttestations.TRIP_REPORT_AUTHOR_ATTESTATION,
      password: 'wrong',
    });
    expect(result.error).toMatch(/incorrect password/i);
    expect(mockLogTripReportSignatureAudit).not.toHaveBeenCalled();
  });

  it('rejects when the typed printed name does not match the profile', async () => {
    mockNamesMatch.mockReturnValueOnce(false);
    const { supabase } = makeSupabase({ user: USER, ops: defaultOps() });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const result = await submitReport('rep-1', {
      signatureData: 'data:image/png;base64,iVBOR=',
      printedName: 'Imposter',
      attestationText: realAttestations.TRIP_REPORT_AUTHOR_ATTESTATION,
      password: 'pw',
    });
    expect(result.error).toMatch(/does not match the name on your account/i);
    expect(mockLogTripReportSignatureAudit).not.toHaveBeenCalled();
  });

  it('on success, writes server-side signed_at_db, content hash, and audit row', async () => {
    let capturedUpdate: unknown;
    const ops = defaultOps();
    ops[ops.length - 1].capture = (payload) => {
      capturedUpdate = payload;
    };
    const { supabase } = makeSupabase({ user: USER, ops });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const result = await submitReport('rep-1', {
      signatureData: 'data:image/png;base64,iVBOR=',
      signedAt: '2025-01-01T00:00:00.000Z',
      printedName: 'Jane Doe',
      attestationText: realAttestations.TRIP_REPORT_AUTHOR_ATTESTATION,
      password: 'pw',
    });

    expect(result.error).toBeNull();
    const update = capturedUpdate as Record<string, unknown>;
    expect(update.report_status).toBe('submitted');
    expect(update.author_submission_printed_name).toBe('Jane Doe');
    expect(update.author_submission_attestation_text).toBe(
      realAttestations.TRIP_REPORT_AUTHOR_ATTESTATION
    );
    expect(update.author_submission_content_hash).toBe('a'.repeat(64));
    // The server-side timestamp is "now" (not the client-provided value);
    // it must be a fresh ISO string distinct from the client signedAt.
    expect(typeof update.author_submission_signed_at_db).toBe('string');
    expect(update.author_submission_signed_at_db).not.toBe('2025-01-01T00:00:00.000Z');

    // Audit row carries the same printed name + attestation + content
    // hash and is flagged as password-verified.
    expect(mockLogTripReportSignatureAudit).toHaveBeenCalledTimes(1);
    const auditCall = mockLogTripReportSignatureAudit.mock.calls[0][0] as Record<string, unknown>;
    expect(auditCall).toMatchObject({
      tripReportId: 'rep-1',
      kind: 'author_submit',
      actorProfileId: PROFILE.id,
      printedName: 'Jane Doe',
      attestationText: realAttestations.TRIP_REPORT_AUTHOR_ATTESTATION,
      contentHash: 'a'.repeat(64),
      passwordVerified: true,
    });
  });

  it('hard-fails when the audit row cannot be written (no orphan signature)', async () => {
    mockLogTripReportSignatureAudit.mockResolvedValueOnce({
      id: null,
      error: 'audit table down',
    });
    const { supabase } = makeSupabase({ user: USER, ops: defaultOps() });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const result = await submitReport('rep-1', {
      signatureData: 'data:image/png;base64,iVBOR=',
      printedName: 'Jane Doe',
      attestationText: realAttestations.TRIP_REPORT_AUTHOR_ATTESTATION,
      password: 'pw',
    });
    expect(result.error).toMatch(/audit/i);
  });
});

// =====================================================================
// approveReport
// =====================================================================

describe('approveReport — Part 11 signing manifestations', () => {
  function defaultOps(reportStatus = 'under_review'): ScriptedOp[] {
    return [
      // loadSignerIdentity → profiles select on user_id
      {
        table: 'profiles',
        method: 'select',
        resp: { data: { id: PROFILE.id, email: USER.email, first_name: 'Jane', last_name: 'Doe' }, error: null },
      },
      // trip_reports select report_status, reviewer_id
      {
        table: 'trip_reports',
        method: 'select',
        resp: {
          data: {
            report_status: reportStatus,
            reviewer_id: PROFILE.id,
            visit_id: 'visit-1',
            template_id: 'tmpl-1',
          },
          error: null,
        },
      },
      // trip_reports update with approval columns
      { table: 'trip_reports', method: 'update', resp: { data: null, error: null } },
    ];
  }

  it('rejects when attestation text does not match the canonical approver statement', async () => {
    const { supabase } = makeSupabase({ user: USER, ops: [] });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const result = await approveReport('rep-1', {
      signatureData: 'data:image/png;base64,iVBOR=',
      printedName: 'Jane Doe',
      attestationText: realAttestations.TRIP_REPORT_AUTHOR_ATTESTATION, // wrong role
      password: 'pw',
    });
    expect(result.error).toMatch(/attestation/i);
    expect(mockLogTripReportSignatureAudit).not.toHaveBeenCalled();
  });

  it('on success, writes approval audit with approver attestation and content hash', async () => {
    let capturedUpdate: unknown;
    const ops = defaultOps();
    ops[ops.length - 1].capture = (payload) => {
      capturedUpdate = payload;
    };
    const { supabase } = makeSupabase({ user: USER, ops });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const result = await approveReport('rep-1', {
      signatureData: 'data:image/png;base64,iVBOR=',
      printedName: 'Jane Doe',
      attestationText: realAttestations.TRIP_REPORT_APPROVER_ATTESTATION,
      password: 'pw',
    });

    expect(result.error).toBeNull();
    const update = capturedUpdate as Record<string, unknown>;
    expect(update.report_status).toBe('approved_and_signed');
    expect(update.approval_printed_name).toBe('Jane Doe');
    expect(update.approval_attestation_text).toBe(
      realAttestations.TRIP_REPORT_APPROVER_ATTESTATION
    );
    expect(update.approval_content_hash).toBe('a'.repeat(64));
    expect(typeof update.approval_signed_at_db).toBe('string');

    expect(mockLogTripReportSignatureAudit).toHaveBeenCalledTimes(1);
    const auditCall = mockLogTripReportSignatureAudit.mock.calls[0][0] as Record<string, unknown>;
    expect(auditCall).toMatchObject({
      kind: 'approver_approve',
      printedName: 'Jane Doe',
      attestationText: realAttestations.TRIP_REPORT_APPROVER_ATTESTATION,
      contentHash: 'a'.repeat(64),
      passwordVerified: true,
    });
  });
});

// =====================================================================
// voidApproval
// =====================================================================

describe('voidApproval — clears approval columns and writes void audit', () => {
  it('rejects when reason is too short', async () => {
    const { supabase } = makeSupabase({ user: USER, ops: [] });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const result = await voidApproval('rep-1', { reason: 'too short', password: 'pw' });
    expect(result.error).toMatch(/at least/i);
    expect(mockLogTripReportSignatureAudit).not.toHaveBeenCalled();
  });

  it('rejects when password is empty', async () => {
    const { supabase } = makeSupabase({ user: USER, ops: [] });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const result = await voidApproval('rep-1', {
      reason: 'a sufficiently long reason for voiding the approval',
      password: '',
    });
    expect(result.error).toMatch(/password is required/i);
  });

  it('on success, clears approval signature columns and writes void audit', async () => {
    let capturedUpdate: unknown;
    const ops: ScriptedOp[] = [
      // profiles select for current user (auth.getUser → profile)
      { table: 'profiles', method: 'select', resp: { data: { id: PROFILE.id }, error: null } },
      // getProfileRole → profiles select for role (used by helper)
      { table: 'profiles', method: 'select', resp: { data: { role: 'admin' }, error: null } },
      // trip_reports select report_status
      {
        table: 'trip_reports',
        method: 'select',
        resp: { data: { report_status: 'approved_and_signed' }, error: null },
      },
      // signer profile name lookup
      {
        table: 'profiles',
        method: 'select',
        resp: { data: { first_name: 'Admin', last_name: 'User' }, error: null },
      },
      // trip_reports update — clear approval columns
      {
        table: 'trip_reports',
        method: 'update',
        resp: { data: null, error: null },
        capture: (p) => {
          capturedUpdate = p;
        },
      },
    ];
    const { supabase } = makeSupabase({ user: USER, ops });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const result = await voidApproval('rep-1', {
      reason: 'Voided due to material content correction required.',
      password: 'pw',
    });

    expect(result.error).toBeNull();
    const update = capturedUpdate as Record<string, unknown>;
    expect(update.report_status).toBe('returned');
    expect(update.approval_printed_name).toBeNull();
    expect(update.approval_attestation_text).toBeNull();
    expect(update.approval_signed_at_db).toBeNull();
    expect(update.approval_content_hash).toBeNull();
    expect(update.approval_signature_data).toBeNull();

    expect(mockLogTripReportSignatureAudit).toHaveBeenCalledTimes(1);
    const audit = mockLogTripReportSignatureAudit.mock.calls[0][0] as Record<string, unknown>;
    expect(audit).toMatchObject({
      kind: 'void_approval',
      attestationText: realAttestations.TRIP_REPORT_VOID_ATTESTATION,
      passwordVerified: true,
    });
    expect(audit.reason).toMatch(/material content correction/i);
  });
});

// =====================================================================
// saveReportNarrative — post-approval edit lock
// =====================================================================

describe('post-approval content lock', () => {
  it('saveReportNarrative refuses to mutate an approved_and_signed report', async () => {
    // assertAuthorCanEditReport (internal) calls assertReportAuthorPermission
    // (mocked to allow) and then re-reads trip_reports.report_status.
    const { supabase } = makeSupabase({
      user: USER,
      ops: [
        // getProfileId → profiles select on user_id
        { table: 'profiles', method: 'select', resp: { data: { id: PROFILE.id }, error: null } },
        // assertAuthorCanEditReport → trip_reports select report_status
        {
          table: 'trip_reports',
          method: 'select',
          resp: { data: { report_status: 'approved_and_signed' }, error: null },
        },
      ],
    });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const result = await saveReportNarrative('rep-1', 'attempted edit');
    expect(result.error).toMatch(/cannot be edited/i);
  });
});
