import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { signDraft } from './drafts';

/**
 * The draft module is mostly Supabase plumbing; the testable invariants are
 * the GxP guard ("e-sign must include a reason for record") and the SHA-256
 * tamper-evidence floor.
 */

function makeStubSupabase() {
  const insertedRows: Record<string, unknown[]> = {};
  return {
    from: vi.fn((table: string) => ({
      insert: (payload: unknown) => {
        insertedRows[table] = insertedRows[table] ?? [];
        insertedRows[table].push(payload);
        return { error: null };
      },
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: null, error: { message: 'no row' } }),
            }),
          }),
        }),
      }),
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        }),
      }),
    })),
  } as unknown as SupabaseClient;
}

describe('signDraft', () => {
  it('throws when reason is missing', async () => {
    const supabase = makeStubSupabase();
    await expect(
      signDraft(supabase, {
        draftId: 'd1',
        userId: 'u1',
        companyId: 'c1',
        reason: '',
      })
    ).rejects.toThrow(/reason/i);
  });

  it('throws when reason is whitespace-only', async () => {
    const supabase = makeStubSupabase();
    await expect(
      signDraft(supabase, {
        draftId: 'd1',
        userId: 'u1',
        companyId: 'c1',
        reason: '   ',
      })
    ).rejects.toThrow(/reason/i);
  });
});
