import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { listQueues } from './work-queues';

/**
 * The Phase 5 implementation materializes the three built-in queues (Today,
 * Drafts to review, Snoozed) on first call so the user always has a place
 * to land.
 */

function makeSupabase(initialQueues: Array<Record<string, unknown>>) {
  const inserted: Array<Record<string, unknown>> = [];

  const supabase = {
    from: vi.fn((table: string) => {
      if (table !== 'copilot_work_queues') {
        throw new Error(`unexpected table: ${table}`);
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: initialQueues, error: null }),
          }),
        }),
        insert: (payload: Array<Record<string, unknown>>) => ({
          select: () => {
            const out = payload.map((p, idx) => ({
              ...p,
              id: `gen-${idx}`,
              created_at: new Date(0).toISOString(),
              updated_at: new Date(0).toISOString(),
            }));
            inserted.push(...out);
            return Promise.resolve({ data: out, error: null });
          },
        }),
      };
    }),
  } as unknown as SupabaseClient;

  return { supabase, inserted };
}

describe('listQueues', () => {
  it('materializes all three built-in queues when none exist', async () => {
    const { supabase, inserted } = makeSupabase([]);
    const queues = await listQueues(supabase, 'u1', 'c1');
    expect(queues.length).toBe(3);
    const names = queues.map(q => q.name).sort();
    expect(names).toEqual(['Drafts to review', 'Snoozed', 'Today']);
    expect(inserted.length).toBe(3);
    expect(queues.every(q => q.isBuiltIn)).toBe(true);
  });

  it('only adds the missing built-ins when some already exist', async () => {
    const existing = [
      {
        id: 'q-today',
        company_id: 'c1',
        user_id: 'u1',
        name: 'Today',
        description: null,
        scope: 'global',
        is_built_in: true,
        created_at: new Date(0).toISOString(),
        updated_at: new Date(0).toISOString(),
      },
    ];
    const { supabase, inserted } = makeSupabase(existing);
    const queues = await listQueues(supabase, 'u1', 'c1');
    expect(queues.length).toBe(3);
    expect(inserted.length).toBe(2);
    expect(inserted.map(r => r.name).sort()).toEqual(['Drafts to review', 'Snoozed']);
  });
});
