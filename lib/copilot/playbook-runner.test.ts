import { describe, expect, it, vi } from 'vitest';

import {
  BUILT_IN_PLAYBOOKS,
  advancePlaybookStep,
  startPlaybookRun,
} from './playbook-runner';

vi.mock('./audit', () => ({
  recordAudit: vi.fn().mockResolvedValue({ ok: true }),
}));

function makeSupabaseStub() {
  const inserted: Record<string, unknown>[] = [];
  let runRow: Record<string, unknown> | null = null;

  const stub = {
    from(table: string) {
      if (table === 'copilot_playbooks') {
        return {
          select() { return this; },
          eq() { return this; },
          is() { return this; },
          maybeSingle: async () => ({ data: null }),
        };
      }
      if (table === 'copilot_playbook_runs') {
        return {
          insert(payload: Record<string, unknown>) {
            return {
              select() { return this; },
              single: async () => {
                runRow = {
                  id: 'run-1',
                  ...payload,
                  started_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                inserted.push(runRow);
                return { data: runRow, error: null };
              },
            };
          },
          select() { return this; },
          eq() { return this; },
          maybeSingle: async () => ({ data: runRow }),
          update(patch: Record<string, unknown>) {
            return {
              eq() { return this; },
              select() { return this; },
              single: async () => {
                runRow = { ...runRow!, ...patch, updated_at: new Date().toISOString() };
                return { data: runRow, error: null };
              },
            };
          },
        };
      }
      return {} as never;
    },
    inserted,
  };
  return stub;
}

describe('playbook runner', () => {
  it('starts a run for a built-in playbook with all steps initialized', async () => {
    const sb = makeSupabaseStub() as unknown as Parameters<typeof startPlaybookRun>[0];
    const playbook = BUILT_IN_PLAYBOOKS[0];

    const run = await startPlaybookRun(sb, {
      companyId: 'co1',
      userId: 'u1',
      playbookId: playbook.id,
    });

    expect(run).toBeTruthy();
    expect(run!.stepStates.length).toBe(playbook.steps.length);
    expect(run!.stepStates[0].status).toBe('in_progress');
    expect(run!.stepStates.slice(1).every((s) => s.status === 'pending')).toBe(true);
  });

  it('advances steps in order', async () => {
    const sb = makeSupabaseStub() as unknown as Parameters<typeof startPlaybookRun>[0];
    const playbook = BUILT_IN_PLAYBOOKS[0];

    const initial = await startPlaybookRun(sb, {
      companyId: 'co1',
      userId: 'u1',
      playbookId: playbook.id,
    });
    expect(initial).toBeTruthy();

    const advanced = await advancePlaybookStep(sb, {
      companyId: 'co1',
      userId: 'u1',
      runId: initial!.id,
      stepIndex: 0,
      outcome: 'completed',
    });

    expect(advanced).toBeTruthy();
    expect(advanced!.stepStates[0].status).toBe('completed');
    expect(advanced!.stepStates[1].status).toBe('in_progress');
    expect(advanced!.currentStep).toBe(1);
  });

  it('marks the run completed after the last step', async () => {
    const sb = makeSupabaseStub() as unknown as Parameters<typeof startPlaybookRun>[0];
    const playbook = BUILT_IN_PLAYBOOKS[2]; // monitoring-visit-prep, 5 steps

    const initial = await startPlaybookRun(sb, {
      companyId: 'co1',
      userId: 'u1',
      playbookId: playbook.id,
    });

    let run = initial!;
    for (let i = 0; i < playbook.steps.length; i += 1) {
      const r = await advancePlaybookStep(sb, {
        companyId: 'co1',
        userId: 'u1',
        runId: run.id,
        stepIndex: i,
        outcome: 'completed',
      });
      expect(r).toBeTruthy();
      run = r!;
    }
    expect(run.status).toBe('completed');
  });

  it('blocks advance keeps run paused on the same step', async () => {
    const sb = makeSupabaseStub() as unknown as Parameters<typeof startPlaybookRun>[0];
    const playbook = BUILT_IN_PLAYBOOKS[0];

    const initial = await startPlaybookRun(sb, {
      companyId: 'co1',
      userId: 'u1',
      playbookId: playbook.id,
    });

    const advanced = await advancePlaybookStep(sb, {
      companyId: 'co1',
      userId: 'u1',
      runId: initial!.id,
      stepIndex: 0,
      outcome: 'blocked',
      note: 'Waiting on PI signature',
    });

    expect(advanced!.status).toBe('paused');
    expect(advanced!.currentStep).toBe(0);
    expect(advanced!.stepStates[0].status).toBe('blocked');
  });
});
