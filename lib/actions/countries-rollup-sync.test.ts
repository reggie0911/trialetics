import { beforeEach, describe, expect, it, vi } from 'vitest';

type Resp = { data: unknown; error: { message: string } | null };
type ScriptedOp = {
  table: string;
  method: 'select' | 'insert' | 'update' | 'delete';
  resp: Resp;
  capture?: (payload: unknown, filters: Record<string, unknown>) => void;
};

const mockCreateClient = vi.fn();
const mockAssertStudyWritableForCurrentUser = vi.fn();
const mockRevalidateStudyCtmsLayout = vi.fn();

vi.mock('@/lib/server', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

vi.mock('@/lib/server/study-write-guard', () => ({
  assertStudyWritableForCurrentUser: (...args: unknown[]) =>
    mockAssertStudyWritableForCurrentUser(...args),
}));

vi.mock('@/lib/cache/revalidate-ctms', () => ({
  revalidateStudyCtmsLayout: (...args: unknown[]) => mockRevalidateStudyCtmsLayout(...args),
}));

function makeSupabase(ops: ScriptedOp[]) {
  const queue = [...ops];

  const pop = (table: string, method: ScriptedOp['method']) => {
    const index = queue.findIndex((op) => op.table === table && op.method === method);
    if (index === -1) return undefined;
    const [op] = queue.splice(index, 1);
    return op;
  };

  const from = (table: string) => {
    const state = {
      method: 'select' as ScriptedOp['method'],
      filters: {} as Record<string, unknown>,
      payload: undefined as unknown,
    };

    const settle = (): Promise<Resp> => {
      const op = pop(table, state.method);
      if (op?.capture) op.capture(state.payload, state.filters);
      return Promise.resolve(op?.resp ?? { data: null, error: null });
    };

    const chain: Record<string, unknown> = {
      select: () => chain,
      insert: (payload: unknown) => {
        state.method = 'insert';
        state.payload = payload;
        return chain;
      },
      update: (payload: unknown) => {
        state.method = 'update';
        state.payload = payload;
        return chain;
      },
      delete: () => {
        state.method = 'delete';
        return chain;
      },
      eq: (column: string, value: unknown) => {
        state.filters[column] = value;
        return chain;
      },
      order: () => chain,
      single: settle,
      maybeSingle: settle,
      then: (cb: (result: Resp) => unknown) => settle().then(cb),
    };
    return chain;
  };

  return { from: vi.fn(from) };
}

describe('countries actions regulatory roll-up sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertStudyWritableForCurrentUser.mockResolvedValue({ error: null });
  });

  it('syncs country regulatory status after addSubmission', async () => {
    let countryUpdatePayload: unknown;
    const supabase = makeSupabase([
      {
        table: 'regulatory_submissions',
        method: 'insert',
        resp: {
          data: { id: 'sub-1', study_country_id: 'country-1', submission_type: 'IRB', status: 'approved' },
          error: null,
        },
      },
      {
        table: 'regulatory_submissions',
        method: 'select',
        resp: { data: [{ status: 'approved' }], error: null },
      },
      {
        table: 'study_countries',
        method: 'update',
        resp: { data: null, error: null },
        capture: (payload) => {
          countryUpdatePayload = payload;
        },
      },
    ]);
    mockCreateClient.mockResolvedValue(supabase);

    const { addSubmission } = await import('@/lib/actions/countries');
    const result = await addSubmission({
      study_id: 'study-1',
      study_country_id: 'country-1',
      submission_type: 'IRB',
      status: 'approved',
    });

    expect(result.error).toBeNull();
    expect(countryUpdatePayload).toEqual({ regulatory_status: 'approved' });
    expect(mockRevalidateStudyCtmsLayout).toHaveBeenCalledWith('study-1');
  });

  it('syncs country regulatory status after updateSubmission', async () => {
    let countryUpdatePayload: unknown;
    const supabase = makeSupabase([
      {
        table: 'regulatory_submissions',
        method: 'select',
        resp: { data: { study_country_id: 'country-2' }, error: null },
      },
      {
        table: 'regulatory_submissions',
        method: 'update',
        resp: { data: null, error: null },
      },
      {
        table: 'regulatory_submissions',
        method: 'select',
        resp: { data: [{ status: 'submitted' }, { status: 'approved' }], error: null },
      },
      {
        table: 'study_countries',
        method: 'update',
        resp: { data: null, error: null },
        capture: (payload) => {
          countryUpdatePayload = payload;
        },
      },
    ]);
    mockCreateClient.mockResolvedValue(supabase);

    const { updateSubmission } = await import('@/lib/actions/countries');
    const result = await updateSubmission({
      id: 'sub-2',
      study_id: 'study-1',
      status: 'submitted',
    });

    expect(result.error).toBeNull();
    expect(countryUpdatePayload).toEqual({ regulatory_status: 'in_progress' });
    expect(mockRevalidateStudyCtmsLayout).toHaveBeenCalledWith('study-1');
  });

  it('syncs country regulatory status after deleteSubmission', async () => {
    let countryUpdatePayload: unknown;
    const supabase = makeSupabase([
      {
        table: 'regulatory_submissions',
        method: 'select',
        resp: { data: { study_country_id: 'country-3' }, error: null },
      },
      {
        table: 'regulatory_submissions',
        method: 'delete',
        resp: { data: null, error: null },
      },
      {
        table: 'regulatory_submissions',
        method: 'select',
        resp: { data: [], error: null },
      },
      {
        table: 'study_countries',
        method: 'update',
        resp: { data: null, error: null },
        capture: (payload) => {
          countryUpdatePayload = payload;
        },
      },
    ]);
    mockCreateClient.mockResolvedValue(supabase);

    const { deleteSubmission } = await import('@/lib/actions/countries');
    const result = await deleteSubmission('sub-3', 'study-1');

    expect(result.error).toBeNull();
    expect(countryUpdatePayload).toEqual({ regulatory_status: 'not_started' });
    expect(mockRevalidateStudyCtmsLayout).toHaveBeenCalledWith('study-1');
  });
});
