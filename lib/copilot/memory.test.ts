import { describe, expect, it, vi } from 'vitest';

import { deleteMemory, getMemory, setMemory } from './memory';

interface Call {
  table: string;
  op: 'select' | 'upsert' | 'delete' | 'insert';
  args?: unknown;
}

/**
 * Tiny chainable Supabase mock. Each test seeds the data path it needs.
 * Implements the subset of the Supabase JS API that memory.ts uses:
 *
 *   from(table).select('*').eq().eq().eq().order()       // getMemory
 *   from(table).upsert(row, opts).select('*').single()   // setMemory
 *   from(table).delete().eq().eq()                       // deleteMemory
 *   from(table).insert(row)                              // recordAudit (audit log)
 */
function makeMock(opts: {
  selectRows?: unknown[];
  upsertRow?: unknown;
  upsertError?: { message: string };
  deleteError?: { message: string };
} = {}) {
  const calls: Call[] = [];

  const fromFn = vi.fn((table: string) => {
    return {
      select: () => {
        calls.push({ table, op: 'select' });
        const chain = {
          _table: table,
          eq: () => chain,
          order: async () => ({ data: opts.selectRows ?? [], error: null }),
          maybeSingle: async () => ({
            data: (opts.selectRows && opts.selectRows[0]) ?? null,
            error: null,
          }),
          single: async () => ({
            data: opts.upsertRow ?? null,
            error: opts.upsertError ?? null,
          }),
        };
        return chain;
      },
      upsert: (row: unknown) => {
        calls.push({ table, op: 'upsert', args: row });
        return {
          select: () => ({
            single: async () => ({
              data: opts.upsertRow ?? null,
              error: opts.upsertError ?? null,
            }),
          }),
        };
      },
      delete: () => {
        calls.push({ table, op: 'delete' });
        const chain = {
          eq: () => chain,
          then: undefined as unknown,
        };
        // The real Supabase chain is awaitable; emulate it with a thenable
        // returned from the final `.eq()`.
        Object.defineProperty(chain, 'then', {
          value: (resolve: (v: { error: unknown }) => void) =>
            resolve({ error: opts.deleteError ?? null }),
        });
        return chain;
      },
      insert: async (row: unknown) => {
        calls.push({ table, op: 'insert', args: row });
        return { error: null };
      },
    };
  });

  return { supabase: { from: fromFn } as unknown as Parameters<typeof setMemory>[0], calls };
}

describe('getMemory', () => {
  it('returns mapped entries', async () => {
    const { supabase } = makeMock({
      selectRows: [
        {
          id: 'm1',
          user_id: 'u1',
          company_id: 'c1',
          scope: 'global',
          key: 'preferred_view',
          value: { tone: 'concise' },
          source: 'user',
          agent_id: null,
          agent_version: null,
          created_at: 't',
          updated_at: 't',
        },
      ],
    });
    const out = await getMemory(supabase, { userId: 'u1' });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 'm1', scope: 'global', key: 'preferred_view' });
  });
});

describe('setMemory', () => {
  it('upserts and writes an audit entry', async () => {
    const { supabase, calls } = makeMock({
      upsertRow: {
        id: 'm1',
        user_id: 'u1',
        company_id: 'c1',
        scope: 'global',
        key: 'preferred_view',
        value: { tone: 'concise' },
        source: 'agent',
        agent_id: 'memory-keeper',
        agent_version: '1.0.0',
        created_at: 't',
        updated_at: 't',
      },
    });

    const result = await setMemory(supabase, {
      userId: 'u1',
      companyId: 'c1',
      key: 'preferred_view',
      value: { tone: 'concise' },
      reason: 'user asked',
    });

    expect(result.ok).toBe(true);
    expect(result.entry?.key).toBe('preferred_view');

    // Should have called upsert on copilot_memory and insert on copilot_audit_log.
    expect(calls.find(c => c.table === 'copilot_memory' && c.op === 'upsert')).toBeTruthy();
    expect(calls.find(c => c.table === 'copilot_audit_log' && c.op === 'insert')).toBeTruthy();
  });

  it('returns ok=false on upsert error', async () => {
    const { supabase } = makeMock({ upsertError: { message: 'permission denied' } });
    const result = await setMemory(supabase, {
      userId: 'u1',
      companyId: 'c1',
      key: 'x',
      value: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('permission denied');
  });
});

describe('deleteMemory', () => {
  it('records audit when delete succeeds', async () => {
    const { supabase, calls } = makeMock();
    const result = await deleteMemory(supabase, {
      userId: 'u1',
      companyId: 'c1',
      id: 'm1',
      reason: 'no longer needed',
    });
    expect(result.ok).toBe(true);
    expect(calls.find(c => c.table === 'copilot_memory' && c.op === 'delete')).toBeTruthy();
    expect(calls.find(c => c.table === 'copilot_audit_log' && c.op === 'insert')).toBeTruthy();
  });
});
