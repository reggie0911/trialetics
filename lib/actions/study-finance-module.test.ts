import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { fmOptimisticLockMismatch, FM_STALE_RECORD_MESSAGE } from '@/lib/finance-module/optimistic-lock';

const loadFinanceWriteContext = vi.fn();

vi.mock('@/lib/finance-module/permissions', () => ({
  loadFinanceWriteContext: (...args: unknown[]) => loadFinanceWriteContext(...args),
  loadFinanceReadContext: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('study-finance-module — guards and optimistic locking', () => {
  let deleteInvoice: typeof import('@/lib/actions/study-finance-module').deleteInvoice;

  beforeAll(async () => {
    const mod = await import('@/lib/actions/study-finance-module');
    deleteInvoice = mod.deleteInvoice;
  }, 30_000);

  beforeEach(() => {
    loadFinanceWriteContext.mockReset();
  });

  it('fmOptimisticLockMismatch is false for identical timestamps', () => {
    expect(fmOptimisticLockMismatch('2025-06-01T12:00:00.000Z', '2025-06-01T12:00:00.000Z')).toBe(false);
  });

  it('fmOptimisticLockMismatch is true when timestamps differ', () => {
    expect(fmOptimisticLockMismatch('2025-06-01T12:00:00.000Z', '2025-06-02T12:00:00.000Z')).toBe(true);
  });

  it('exposes stable stale-record copy', () => {
    expect(FM_STALE_RECORD_MESSAGE).toContain('Refresh');
  });

  it('deleteInvoice rejects invalid study id before hitting permissions', async () => {
    const r = await deleteInvoice({
      studyId: 'not-a-uuid',
      invoiceId: '550e8400-e29b-41d4-a716-446655440001',
      updatedAt: '2025-06-01T12:00:00.000Z',
    });
    expect(r.error).toBeTruthy();
    expect(loadFinanceWriteContext).not.toHaveBeenCalled();
  });

  it('deleteInvoice returns permission error when write context is missing', async () => {
    loadFinanceWriteContext.mockResolvedValue({ context: null, error: 'No finance write access.' });
    const r = await deleteInvoice({
      studyId: '550e8400-e29b-41d4-a716-446655440000',
      invoiceId: '550e8400-e29b-41d4-a716-446655440001',
      updatedAt: '2025-06-01T12:00:00.000Z',
    });
    expect(r.error).toBe('No finance write access.');
  });

  it('deleteInvoice returns STALE_RECORD when client updatedAt mismatches server row', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        approval_status: 'draft',
        updated_at: '2025-06-01T12:00:00.000Z',
      },
      error: null,
    });
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle,
    };
    const from = vi.fn(() => chain);
    const supabase = { from };
    loadFinanceWriteContext.mockResolvedValue({
      context: {
        studyId: '550e8400-e29b-41d4-a716-446655440000',
        companyId: '550e8400-e29b-41d4-a716-446655440002',
        userId: '550e8400-e29b-41d4-a716-446655440003',
        supabase,
      },
      error: null,
    });

    const r = await deleteInvoice({
      studyId: '550e8400-e29b-41d4-a716-446655440000',
      invoiceId: '550e8400-e29b-41d4-a716-446655440001',
      updatedAt: '2025-06-01T15:00:00.000Z',
    });
    expect(r.code).toBe('STALE_RECORD');
    expect(r.error).toBe(FM_STALE_RECORD_MESSAGE);
  });
});
