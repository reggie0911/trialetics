/**
 * Server-action coverage for the per-row author/recall/send-to-review
 * flags exposed by `getTripReportTrackerList`.
 *
 * The flags themselves are pure derivations from
 *   (currentProfileId, report.created_by, isCra, status)
 * but the surrounding function pulls from many tables, so this file uses
 * a scripted-op fake Supabase client (same pattern as the other
 * visit-reports.* tests) to assert the matrix:
 *
 *   roles    = { author CRA, non-author CRA, CPM, plain admin }
 *   statuses = { authoring, returned, submitted, under_review,
 *                approved_and_signed }
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

const mockGetProfileRole = vi.fn().mockResolvedValue('user');
vi.mock('@/lib/visit-report-permissions', async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    getProfileRole: (...a: unknown[]) => mockGetProfileRole(...a),
  };
});

// ---------------------------------------------------------------------------
// In-memory Supabase chain (table+method scripted, with `.in` capture).
// ---------------------------------------------------------------------------

type Resp = { data: unknown; error: { message: string } | null };
interface ScriptedOp {
  table: string;
  method?: 'select' | 'insert' | 'update' | 'delete' | 'count';
  resp: Resp;
  capture?: (payload: unknown, filters: Record<string, unknown>) => void;
}

function makeSupabase(opts: {
  user?: { id: string; email: string } | null;
  ops: ScriptedOp[];
}) {
  const queue = opts.ops.map((o) => ({ ...o }));

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
    chain.insert = (p: unknown) => { state.method = 'insert'; state.payload = p; return chain; };
    chain.update = (p: unknown) => { state.method = 'update'; state.payload = p; return chain; };
    chain.delete = () => { state.method = 'delete'; return chain; };
    chain.eq = (col: string, val: unknown) => { state.filters[col] = val; return chain; };
    chain.in = (col: string, val: unknown) => { state.filters[col] = val; return chain; };
    chain.lt = () => chain;
    chain.is = () => chain;
    chain.not = () => chain;
    chain.order = () => chain;
    chain.limit = () => chain;

    const settle = (): Promise<Resp & { count?: number | null }> => {
      const op = popMatch(table, state.method);
      if (op?.capture) op.capture(state.payload, state.filters);
      return Promise.resolve(op?.resp ?? { data: null, error: null });
    };
    chain.single = settle;
    chain.maybeSingle = settle;
    chain.then = (cb: (v: Resp) => unknown) => settle().then(cb);
    return chain;
  };

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: opts.user ?? null }, error: null }),
    },
    from: vi.fn(fromImpl),
  };
}

const STUDY_ID = 'study-1';
const VISIT_ID = 'visit-1';
const REPORT_ID = 'report-1';
const TEMPLATE_ID = 'tmpl-1';

const AUTHOR_USER = { id: 'auth-author', email: 'author@example.com' };
const AUTHOR_PROFILE_ID = 'profile-author';
const OTHER_PROFILE_ID = 'profile-other';

interface FlagScenarioOptions {
  /** profile id signed in. AUTHOR_PROFILE_ID = the report's created_by. */
  currentProfileId: string;
  /** Roles the current profile holds on STUDY_ID. */
  studyRoles: ('clinical_research_associate' | 'clinical_project_manager')[];
  /** Persisted report_status. */
  status:
    | 'report_pending'
    | 'authoring'
    | 'submitted'
    | 'under_review'
    | 'returned'
    | 'approved_and_signed';
  /** Optional override: who created the report (defaults to AUTHOR_PROFILE_ID). */
  reportCreatedBy?: string;
  /** App-level role; defaults to 'user' (non-admin). */
  appRole?: 'admin' | 'user';
}

function makeOpsForScenario(opts: FlagScenarioOptions): ScriptedOp[] {
  const createdBy = opts.reportCreatedBy ?? AUTHOR_PROFILE_ID;
  const memberRows = opts.studyRoles.map((role) => ({ study_id: STUDY_ID, role }));
  return [
    // getProfileId -> profiles.select.eq(user_id).single
    { table: 'profiles', method: 'select', resp: { data: { id: opts.currentProfileId }, error: null } },
    // monitoring_visits select(...).order
    {
      table: 'monitoring_visits',
      method: 'select',
      resp: {
        data: [
          {
            id: VISIT_ID,
            study_id: STUDY_ID,
            site_id: 'site-1',
            visit_type: 'monitoring',
            planned_date: '2026-01-01',
            actual_date: null,
            start_date: '2026-01-01',
            end_date: '2026-01-02',
            visit_name: 'V1',
            created_at: '2026-01-01T00:00:00Z',
            study_sites: { name: 'Site A' },
            studies: { title: 'Study A' },
          },
        ],
        error: null,
      },
    },
    // trip_reports select(...).in('visit_id')
    {
      table: 'trip_reports',
      method: 'select',
      resp: {
        data: [
          {
            id: REPORT_ID,
            visit_id: VISIT_ID,
            status: opts.status,
            report_status: opts.status,
            template_id: TEMPLATE_ID,
            submitted_date: opts.status === 'authoring' || opts.status === 'returned' ? null : '2026-01-05',
            approved_date: opts.status === 'approved_and_signed' ? '2026-01-10' : null,
            reviewed_at: opts.status === 'under_review' || opts.status === 'approved_and_signed' ? '2026-01-08' : null,
            created_by: createdBy,
            approved_by: opts.status === 'approved_and_signed' ? OTHER_PROFILE_ID : null,
            reviewer_id: opts.status === 'under_review' || opts.status === 'approved_and_signed' ? OTHER_PROFILE_ID : null,
            submission_due_date: '2026-01-15',
            approval_due_date: '2026-01-22',
            created_at: '2026-01-01T00:00:00Z',
            expected_send_date_confirmation_letter: null,
            expected_send_date_followup_letter: null,
            date_followup_letter_uploaded: null,
            date_mvl_log_uploaded: null,
          },
        ],
        error: null,
      },
    },
    // visit_report_templates select(...).in('id')
    {
      table: 'visit_report_templates',
      method: 'select',
      resp: {
        data: [{ id: TEMPLATE_ID, days_submission: 14, days_approval: 7, days_basis: 'calendar' }],
        error: null,
      },
    },
    // profiles select(name fields).in('id')
    {
      table: 'profiles',
      method: 'select',
      resp: {
        data: [
          { id: AUTHOR_PROFILE_ID, first_name: 'Auth', last_name: 'Or' },
          { id: OTHER_PROFILE_ID, first_name: 'Re', last_name: 'Viewer' },
        ],
        error: null,
      },
    },
    // study_team_members select(study_id, role).eq.eq.in.in
    { table: 'study_team_members', method: 'select', resp: { data: memberRows, error: null } },
  ];
}

beforeEach(() => {
  mockGetProfileRole.mockResolvedValue('user');
});

afterEach(() => {
  vi.clearAllMocks();
});

const { getTripReportTrackerList } = await import('./visit-reports');

async function runScenario(opts: FlagScenarioOptions) {
  if (opts.appRole) mockGetProfileRole.mockResolvedValue(opts.appRole);
  const supabase = makeSupabase({ user: AUTHOR_USER, ops: makeOpsForScenario(opts) });
  mockCreateClient.mockResolvedValue(supabase);
  mockCreateAdminClient.mockReturnValue(supabase);
  const result = await getTripReportTrackerList(STUDY_ID);
  expect(result.rows).toHaveLength(1);
  return result.rows[0];
}

describe('getTripReportTrackerList — quick-action flags', () => {
  describe('author CRA on the study', () => {
    it('authoring → can_send_to_review only', async () => {
      const row = await runScenario({
        currentProfileId: AUTHOR_PROFILE_ID,
        studyRoles: ['clinical_research_associate'],
        status: 'authoring',
      });
      expect(row.is_report_author).toBe(true);
      expect(row.can_send_to_review).toBe(true);
      expect(row.can_recall_report).toBe(false);
    });

    it('returned → can_send_to_review only (Resubmit)', async () => {
      const row = await runScenario({
        currentProfileId: AUTHOR_PROFILE_ID,
        studyRoles: ['clinical_research_associate'],
        status: 'returned',
      });
      expect(row.is_report_author).toBe(true);
      expect(row.can_send_to_review).toBe(true);
      expect(row.can_recall_report).toBe(false);
    });

    it('submitted → can_recall_report only', async () => {
      const row = await runScenario({
        currentProfileId: AUTHOR_PROFILE_ID,
        studyRoles: ['clinical_research_associate'],
        status: 'submitted',
      });
      expect(row.is_report_author).toBe(true);
      expect(row.can_recall_report).toBe(true);
      expect(row.can_send_to_review).toBe(false);
    });

    it('under_review → neither', async () => {
      const row = await runScenario({
        currentProfileId: AUTHOR_PROFILE_ID,
        studyRoles: ['clinical_research_associate'],
        status: 'under_review',
      });
      expect(row.is_report_author).toBe(true);
      expect(row.can_recall_report).toBe(false);
      expect(row.can_send_to_review).toBe(false);
    });

    it('approved_and_signed → neither', async () => {
      const row = await runScenario({
        currentProfileId: AUTHOR_PROFILE_ID,
        studyRoles: ['clinical_research_associate'],
        status: 'approved_and_signed',
      });
      expect(row.is_report_author).toBe(true);
      expect(row.can_recall_report).toBe(false);
      expect(row.can_send_to_review).toBe(false);
    });
  });

  describe('non-author CRA on the study', () => {
    it('submitted → no recall, no send', async () => {
      const row = await runScenario({
        currentProfileId: OTHER_PROFILE_ID,
        studyRoles: ['clinical_research_associate'],
        status: 'submitted',
      });
      expect(row.is_report_author).toBe(false);
      expect(row.can_recall_report).toBe(false);
      expect(row.can_send_to_review).toBe(false);
    });

    it('authoring → no send (not the author, even though edit may be allowed)', async () => {
      const row = await runScenario({
        currentProfileId: OTHER_PROFILE_ID,
        studyRoles: ['clinical_research_associate'],
        status: 'authoring',
      });
      expect(row.is_report_author).toBe(false);
      expect(row.can_send_to_review).toBe(false);
    });
  });

  describe('CPM on the study (not the author)', () => {
    it.each(['authoring', 'returned', 'submitted', 'under_review', 'approved_and_signed'] as const)(
      '%s → neither',
      async (status) => {
        const row = await runScenario({
          currentProfileId: OTHER_PROFILE_ID,
          studyRoles: ['clinical_project_manager'],
          status,
        });
        expect(row.is_report_author).toBe(false);
        expect(row.can_recall_report).toBe(false);
        expect(row.can_send_to_review).toBe(false);
      }
    );
  });

  describe('company admin with no study membership', () => {
    it.each(['authoring', 'submitted', 'approved_and_signed'] as const)(
      '%s → neither (admin without CRA role cannot recall/submit)',
      async (status) => {
        const row = await runScenario({
          currentProfileId: OTHER_PROFILE_ID,
          studyRoles: [],
          status,
          appRole: 'admin',
        });
        expect(row.is_report_author).toBe(false);
        expect(row.can_recall_report).toBe(false);
        expect(row.can_send_to_review).toBe(false);
      }
    );
  });

  describe('author who is also CPM but NOT CRA on the study', () => {
    it('submitted → cannot recall (recall requires CRA membership)', async () => {
      const row = await runScenario({
        currentProfileId: AUTHOR_PROFILE_ID,
        studyRoles: ['clinical_project_manager'],
        status: 'submitted',
      });
      expect(row.is_report_author).toBe(true);
      expect(row.can_recall_report).toBe(false);
    });

    it('authoring → cannot send to review (requires CRA membership)', async () => {
      const row = await runScenario({
        currentProfileId: AUTHOR_PROFILE_ID,
        studyRoles: ['clinical_project_manager'],
        status: 'authoring',
      });
      expect(row.is_report_author).toBe(true);
      expect(row.can_send_to_review).toBe(false);
    });
  });
});
