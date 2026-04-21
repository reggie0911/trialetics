/**
 * Server-action coverage for the visit-report attachment upload + download
 * paths after the audit/hardening pass:
 *
 *   - `uploadVisitReportAttachment`
 *       * rejects oversize files
 *       * rejects MIME spoofing (declared PDF, bytes are EXE)
 *       * rejects when the per-report file count cap is hit
 *       * happy path inserts with `scan_status='pending'` and invokes the
 *         `scan-visit-report-attachment` edge function exactly once
 *
 *   - `getAttachmentDownloadUrl`
 *       * pending  -> "still being scanned"
 *       * infected -> "quarantined"
 *       * error    -> "scan failed"
 *       * clean    -> signed URL is returned
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_REPORT,
} from '../visit-report-attachments-policy';

// ---------------------------------------------------------------------------
// Module mocks. The whole tree of permission / notification / template helpers
// is collapsed to no-ops so we exercise only the upload + download logic.
// ---------------------------------------------------------------------------

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
vi.mock('@/lib/trip-report-audit', () => ({
  logTripReportSignatureAudit: vi.fn().mockResolvedValue({ id: 'a-1', error: null }),
  logTripReportStatusEvent: vi.fn().mockResolvedValue({ id: 'e-1', error: null }),
}));
vi.mock('@/lib/visit-report-signature', () => ({
  TRIP_REPORT_AUTHOR_ATTESTATION: 'a',
  TRIP_REPORT_APPROVER_ATTESTATION: 'a',
  TRIP_REPORT_VOID_ATTESTATION: 'a',
  assertPasswordReverified: vi.fn().mockResolvedValue(null),
  computeReportContentHash: vi.fn().mockResolvedValue({ hash: 'h', error: null }),
  namesMatch: vi.fn().mockReturnValue(true),
}));
vi.mock('@/lib/actions/visit-report-template-versions', () => ({
  loadTemplateForReport: vi.fn().mockResolvedValue({ template: null, error: null }),
  maybeRefreshSnapshotForReport: vi.fn().mockResolvedValue({ refreshed: false, error: null }),
  resolveTemplateQuestionVersionId: vi.fn().mockResolvedValue({ id: null, error: null }),
  snapshotTemplateForReport: vi.fn().mockResolvedValue({ error: null }),
}));

const mockCanViewTripReportContent = vi.fn().mockResolvedValue(true);
const mockAssertReportAuthorPermission = vi.fn().mockResolvedValue(null);
vi.mock('@/lib/visit-report-permissions', async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    canViewTripReportContent: (...a: unknown[]) => mockCanViewTripReportContent(...a),
    assertReportAuthorPermission: (...a: unknown[]) => mockAssertReportAuthorPermission(...a),
  };
});

// ---------------------------------------------------------------------------
// In-memory Supabase chain (storage + functions.invoke aware).
// ---------------------------------------------------------------------------

type Resp = { data: unknown; error: { message: string } | null };
interface ScriptedOp {
  table: string;
  method?: 'select' | 'insert' | 'update' | 'delete' | 'count';
  resp: Resp;
  capture?: (payload: unknown, filters: Record<string, unknown>) => void;
}

interface RecordedInsert {
  table: string;
  payload: unknown;
}

function makeSupabase(opts: {
  user?: { id: string; email: string } | null;
  ops: ScriptedOp[];
  storageUploadResult?: { error: { message: string } | null };
  signedUrl?: string | null;
  invokeResult?: Resp;
}) {
  const queue = opts.ops.map((o) => ({ ...o }));
  const insertsRecorded: RecordedInsert[] = [];

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
      method: 'select' as 'select' | 'insert' | 'update' | 'delete' | 'count',
      filters: {} as Record<string, unknown>,
      payload: undefined as unknown,
    };
    const chain: Record<string, unknown> = {};
    chain.select = (_cols?: string, opts2?: { count?: string; head?: boolean }) => {
      if (opts2?.count) state.method = 'count';
      return chain;
    };
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
    chain.lt = (col: string, val: unknown) => {
      state.filters[`${col}__lt`] = val;
      return chain;
    };
    chain.is = () => chain;
    chain.not = () => chain;
    chain.order = () => chain;
    chain.limit = () => chain;

    const settle = (): Promise<Resp & { count?: number | null }> => {
      const op = popMatch(table, state.method);
      if (state.method === 'insert') {
        insertsRecorded.push({ table, payload: state.payload });
      }
      if (op?.capture) op.capture(state.payload, state.filters);
      return Promise.resolve(op?.resp ?? { data: null, error: null });
    };
    chain.single = settle;
    chain.maybeSingle = settle;
    chain.then = (cb: (v: Resp) => unknown) => settle().then(cb);
    return chain;
  };

  const storageUpload = vi.fn().mockResolvedValue(
    opts.storageUploadResult ?? { error: null },
  );
  const storageRemove = vi.fn().mockResolvedValue({ error: null });
  const createSignedUrl = vi.fn().mockResolvedValue({
    data: { signedUrl: opts.signedUrl ?? 'https://signed.example/path' },
    error: null,
  });

  const functionsInvoke = vi
    .fn()
    .mockResolvedValue(opts.invokeResult ?? { data: { ok: true }, error: null });

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: opts.user ?? null }, error: null }),
    },
    from: vi.fn(fromImpl),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: storageUpload,
        remove: storageRemove,
        createSignedUrl,
      }),
    },
    functions: {
      invoke: functionsInvoke,
    },
  };

  return { supabase, insertsRecorded, storageUpload, createSignedUrl, functionsInvoke };
}

const PROFILE = { id: 'profile-1', user_id: 'auth-1' };
const USER = { id: 'auth-1', email: 'jane@example.com' };
const REPORT_ID = '11111111-1111-1111-1111-111111111111';
const ATTACHMENT_ID = '22222222-2222-2222-2222-222222222222';

function makeFile(bytes: Uint8Array, name: string, mime: string, sizeOverride?: number): File {
  const arr = new Uint8Array(sizeOverride ?? bytes.length);
  arr.set(bytes, 0);
  return new File([arr], name, { type: mime });
}

// Pre-built byte headers.
const PDF_BYTES = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a]);
const PE_EXE_BYTES = Uint8Array.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);

const { uploadVisitReportAttachment, getAttachmentDownloadUrl } = await import('./visit-reports');

// ---------------------------------------------------------------------------

beforeEach(() => {
  mockCanViewTripReportContent.mockResolvedValue(true);
  mockAssertReportAuthorPermission.mockResolvedValue(null);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// uploadVisitReportAttachment
// ---------------------------------------------------------------------------

describe('uploadVisitReportAttachment', () => {
  function uploadOps(opts: { existingCount: number; reportStatus?: string }): ScriptedOp[] {
    return [
      // getProfileId -> profiles.select.eq(user_id).single
      { table: 'profiles', method: 'select', resp: { data: { id: PROFILE.id }, error: null } },
      // getProfileId on second call from assertAuthorCanEditReport's createClient is the same client; not a new one in our mock.
      // assertAuthorCanEditReport -> trip_reports.select('report_status').eq.maybeSingle
      {
        table: 'trip_reports',
        method: 'select',
        resp: { data: { report_status: opts.reportStatus ?? 'authoring' }, error: null },
      },
      // upload action: trip_reports.select('id').eq.single
      {
        table: 'trip_reports',
        method: 'select',
        resp: { data: { id: REPORT_ID }, error: null },
      },
      // count of existing attachments
      {
        table: 'visit_report_attachments',
        method: 'count',
        resp: { data: null, error: null, ...({ count: opts.existingCount } as object) } as Resp,
      },
      // insert into visit_report_attachments
      {
        table: 'visit_report_attachments',
        method: 'insert',
        resp: {
          data: { id: ATTACHMENT_ID, scan_status: 'pending' },
          error: null,
        },
      },
      // revalidateAfterReportMutation -> trip_reports.select(visit_id)
      {
        table: 'trip_reports',
        method: 'select',
        resp: { data: { visit_id: 'visit-1' }, error: null },
      },
      // monitoring_visits.select(study_id)
      {
        table: 'monitoring_visits',
        method: 'select',
        resp: { data: { study_id: 'study-1' }, error: null },
      },
    ];
  }

  it('rejects oversize files (server-side revalidation)', async () => {
    const file = makeFile(PDF_BYTES, 'big.pdf', 'application/pdf', MAX_ATTACHMENT_BYTES + 1);
    const fd = new FormData();
    fd.append('file', file);

    const { supabase } = makeSupabase({
      user: USER,
      ops: uploadOps({ existingCount: 0 }),
    });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const out = await uploadVisitReportAttachment(REPORT_ID, fd);
    expect(out.error).toBe('File is too large. Max 10 MB.');
    expect(out.data).toBeNull();
  });

  it('rejects MIME spoofing (declared PDF but bytes are EXE)', async () => {
    const file = makeFile(PE_EXE_BYTES, 'evil.pdf', 'application/pdf');
    const fd = new FormData();
    fd.append('file', file);

    const { supabase } = makeSupabase({
      user: USER,
      ops: uploadOps({ existingCount: 0 }),
    });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const out = await uploadVisitReportAttachment(REPORT_ID, fd);
    expect(out.error).toBe('This file type is not allowed.');
    expect(out.data).toBeNull();
  });

  it('rejects when the per-report file count cap is hit', async () => {
    const file = makeFile(PDF_BYTES, 'extra.pdf', 'application/pdf');
    const fd = new FormData();
    fd.append('file', file);

    const { supabase } = makeSupabase({
      user: USER,
      ops: uploadOps({ existingCount: MAX_ATTACHMENTS_PER_REPORT }),
    });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const out = await uploadVisitReportAttachment(REPORT_ID, fd);
    expect(out.error).toMatch(/Maximum 25 attachments per report/);
    expect(out.data).toBeNull();
  });

  it('happy path inserts scan_status=pending and invokes the scanner exactly once', async () => {
    const file = makeFile(PDF_BYTES, 'good.pdf', 'application/pdf');
    const fd = new FormData();
    fd.append('file', file);

    const insertCapture = vi.fn();
    const ops = uploadOps({ existingCount: 0 });
    // Patch the insert op to capture the payload.
    const insertOp = ops.find((o) => o.table === 'visit_report_attachments' && o.method === 'insert');
    if (insertOp) insertOp.capture = insertCapture;

    const { supabase, storageUpload, functionsInvoke } = makeSupabase({
      user: USER,
      ops,
    });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const out = await uploadVisitReportAttachment(REPORT_ID, fd);
    expect(out.error).toBeNull();
    expect(out.data).not.toBeNull();
    expect(storageUpload).toHaveBeenCalledTimes(1);
    expect(insertCapture).toHaveBeenCalledTimes(1);
    const inserted = insertCapture.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.scan_status).toBe('pending');
    expect(inserted.trip_report_id).toBe(REPORT_ID);
    expect(inserted.file_name).toBe('good.pdf');

    // Wait a microtask so the fire-and-forget invoke promise settles.
    await new Promise((r) => setTimeout(r, 0));
    expect(functionsInvoke).toHaveBeenCalledTimes(1);
    expect(functionsInvoke.mock.calls[0][0]).toBe('scan-visit-report-attachment');
    expect(functionsInvoke.mock.calls[0][1]).toEqual({ body: { attachmentId: ATTACHMENT_ID } });
  });
});

// ---------------------------------------------------------------------------
// getAttachmentDownloadUrl
// ---------------------------------------------------------------------------

describe('getAttachmentDownloadUrl', () => {
  function downloadOps(scanStatus: string): {
    downloadOps: ScriptedOp[];
    expectedSignedCalls: number;
  } {
    const isClean = scanStatus === 'clean' || scanStatus === 'skipped';
    const ops: ScriptedOp[] = [
      // getProfileId
      { table: 'profiles', method: 'select', resp: { data: { id: PROFILE.id }, error: null } },
      // admin.from('visit_report_attachments').select('id, storage_path, trip_report_id, scan_status')
      {
        table: 'visit_report_attachments',
        method: 'select',
        resp: {
          data: {
            id: ATTACHMENT_ID,
            storage_path: `${REPORT_ID}/abc-file.pdf`,
            trip_report_id: REPORT_ID,
            scan_status: scanStatus,
          },
          error: null,
        },
      },
    ];
    if (isClean) {
      ops.push(
        {
          table: 'trip_reports',
          method: 'select',
          resp: { data: { report_status: 'approved_and_signed', visit_id: 'visit-1' }, error: null },
        },
        { table: 'monitoring_visits', method: 'select', resp: { data: { study_id: 'study-1' }, error: null } },
        { table: 'studies', method: 'select', resp: { data: { company_id: 'co-1' }, error: null } },
        { table: 'profiles', method: 'select', resp: { data: { company_id: 'co-1' }, error: null } },
      );
    }
    return { downloadOps: ops, expectedSignedCalls: isClean ? 1 : 0 };
  }

  it('blocks pending downloads with a friendly message', async () => {
    const { downloadOps: ops } = downloadOps('pending');
    const { supabase, createSignedUrl } = makeSupabase({ user: USER, ops });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const out = await getAttachmentDownloadUrl(ATTACHMENT_ID);
    expect(out.url).toBeNull();
    expect(out.error).toBe('Attachment is still being scanned. Please try again in a moment.');
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('blocks infected downloads with a quarantine message', async () => {
    const { downloadOps: ops } = downloadOps('infected');
    const { supabase, createSignedUrl } = makeSupabase({ user: USER, ops });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const out = await getAttachmentDownloadUrl(ATTACHMENT_ID);
    expect(out.url).toBeNull();
    expect(out.error).toMatch(/quarantined/);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('blocks errored scans with a scan-failed message', async () => {
    const { downloadOps: ops } = downloadOps('error');
    const { supabase, createSignedUrl } = makeSupabase({ user: USER, ops });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const out = await getAttachmentDownloadUrl(ATTACHMENT_ID);
    expect(out.url).toBeNull();
    expect(out.error).toMatch(/scan failed/i);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('returns a signed URL for clean scans', async () => {
    const { downloadOps: ops } = downloadOps('clean');
    const { supabase, createSignedUrl } = makeSupabase({
      user: USER,
      ops,
      signedUrl: 'https://signed.example/clean',
    });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const out = await getAttachmentDownloadUrl(ATTACHMENT_ID);
    expect(out.error).toBeNull();
    expect(out.url).toBe('https://signed.example/clean');
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('returns a signed URL for skipped scans (dev/preview env)', async () => {
    const { downloadOps: ops } = downloadOps('skipped');
    const { supabase, createSignedUrl } = makeSupabase({
      user: USER,
      ops,
      signedUrl: 'https://signed.example/skipped',
    });
    mockCreateClient.mockResolvedValue(supabase);
    mockCreateAdminClient.mockReturnValue(supabase);

    const out = await getAttachmentDownloadUrl(ATTACHMENT_ID);
    expect(out.error).toBeNull();
    expect(out.url).toBe('https://signed.example/skipped');
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
  });
});
