import { describe, expect, it, vi } from 'vitest';

import { recordTelemetry } from './telemetry';

function makeMock(opts: { fail?: boolean } = {}) {
  const calls: { table: string; payload: unknown }[] = [];
  const from = vi.fn((table: string) => ({
    insert: async (payload: unknown) => {
      calls.push({ table, payload });
      if (opts.fail) return { error: { message: 'boom' } };
      return { error: null };
    },
  }));
  return { supabase: { from } as unknown as Parameters<typeof recordTelemetry>[0], calls };
}

describe('recordTelemetry', () => {
  it('inserts a complete telemetry row', async () => {
    const { supabase, calls } = makeMock();
    const result = await recordTelemetry(supabase, {
      userId: 'u1',
      companyId: 'c1',
      eventName: 'card_pinned',
      agentId: 'kri-sentinel',
      agentVersion: '1.0.0',
      module: 'study',
      pathname: '/protected/studies/abc',
      cardId: 'insight_xyz',
      durationMs: 240,
      metadata: { from: 'header' },
    });
    expect(result.ok).toBe(true);
    expect(calls[0].table).toBe('copilot_telemetry');
    expect(calls[0].payload).toMatchObject({
      user_id: 'u1',
      company_id: 'c1',
      event_name: 'card_pinned',
      agent_id: 'kri-sentinel',
      module: 'study',
      pathname: '/protected/studies/abc',
      card_id: 'insight_xyz',
      duration_ms: 240,
    });
  });

  it('coerces missing optional fields to null', async () => {
    const { supabase, calls } = makeMock();
    await recordTelemetry(supabase, {
      userId: 'u1',
      companyId: null,
      eventName: 'panel_opened',
    });
    expect(calls[0].payload).toMatchObject({
      agent_id: null,
      module: null,
      pathname: null,
      card_id: null,
      duration_ms: null,
      metadata: null,
    });
  });

  it('swallows insert failures (telemetry must never break flows)', async () => {
    const { supabase } = makeMock({ fail: true });
    const result = await recordTelemetry(supabase, {
      userId: 'u1',
      companyId: 'c1',
      eventName: 'tab_changed',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('boom');
  });
});
