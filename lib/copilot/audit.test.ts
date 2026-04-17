import { describe, expect, it, vi } from 'vitest';

import { buildToolInvokedEntry, recordAudit } from './audit';

interface InsertCall {
  table: string;
  payload: unknown;
}

function makeMockSupabase(opts: { failOn?: string } = {}) {
  const calls: InsertCall[] = [];
  const insert = vi.fn(async (_payload: unknown) => {
    if (opts.failOn === 'copilot_audit_log') {
      return { error: { message: 'simulated failure' } };
    }
    return { error: null };
  });
  const from = vi.fn((table: string) => {
    return {
      insert: (payload: unknown) => {
        calls.push({ table, payload });
        return insert(payload);
      },
    };
  });
  // Cast to unknown then to SupabaseClient because tests don't use the full
  // Supabase surface area.
  return { supabase: { from } as unknown as Parameters<typeof recordAudit>[0], calls };
}

describe('recordAudit', () => {
  it('inserts the audit row with all fields populated', async () => {
    const { supabase, calls } = makeMockSupabase();
    const result = await recordAudit(supabase, {
      userId: 'u1',
      companyId: 'c1',
      agentId: 'kri-sentinel',
      agentVersion: '1.2.0',
      action: 'tool_invoked',
      toolName: 'recordKriValue',
      resourceKind: 'kri',
      resourceId: 'r1',
      reason: 'demo',
      details: { value: 42 },
      ipAddress: '127.0.0.1',
      userAgent: 'node',
    });

    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].table).toBe('copilot_audit_log');
    expect(calls[0].payload).toMatchObject({
      user_id: 'u1',
      company_id: 'c1',
      agent_id: 'kri-sentinel',
      agent_version: '1.2.0',
      action: 'tool_invoked',
      tool_name: 'recordKriValue',
      resource_kind: 'kri',
      resource_id: 'r1',
      reason: 'demo',
    });
  });

  it('defaults agent_version to 1.0.0 when missing', async () => {
    const { supabase, calls } = makeMockSupabase();
    await recordAudit(supabase, {
      userId: null,
      companyId: null,
      agentId: 'briefing-curator',
      action: 'briefing_generated',
    });
    expect(calls[0].payload).toMatchObject({ agent_version: '1.0.0' });
  });

  it('returns ok=false but never throws when supabase reports an error', async () => {
    const { supabase } = makeMockSupabase({ failOn: 'copilot_audit_log' });
    const result = await recordAudit(supabase, {
      userId: 'u1',
      companyId: 'c1',
      agentId: 'memory-keeper',
      action: 'memory_set',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('simulated failure');
  });
});

describe('buildToolInvokedEntry', () => {
  it('produces a CopilotAuditEntry with action=tool_invoked', () => {
    const entry = buildToolInvokedEntry({
      userId: 'u1',
      companyId: 'c1',
      agentId: 'milestones-timeline',
      agentVersion: '1.0.0',
      toolName: 'createMilestone',
      resourceKind: 'study',
      resourceId: 's1',
      reason: 'sponsor request',
      details: { milestone_id: 'm1' },
    });
    expect(entry).toMatchObject({
      action: 'tool_invoked',
      toolName: 'createMilestone',
      resourceKind: 'study',
      reason: 'sponsor request',
    });
  });
});
