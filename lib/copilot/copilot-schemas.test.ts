import { describe, expect, it } from 'vitest';

import {
  actionChipSchema,
  agentCardSchema,
  insightCardSchema,
  parseCopilotCard,
  recommendationCardSchema,
} from './copilot-schemas';

const baseSource = { id: 's1', label: 'Site 1', kind: 'site' as const };

describe('insightCardSchema', () => {
  it('accepts a fully populated insight payload', () => {
    const ok = insightCardSchema.safeParse({
      id: 'i1',
      title: 'KRI breach',
      body: 'Site 042 breached the data quality KRI',
      severity: 'critical',
      confidence: 'high',
      whyThis: 'Two consecutive periods over the threshold.',
      agentId: 'kri-sentinel',
      agentVersion: '1.0.0',
      sources: [baseSource],
      metric: { label: 'Queries', value: '12', delta: '+4', deltaDirection: 'up' },
      generatedAt: '2026-04-17T00:00:00Z',
    });
    expect(ok.success).toBe(true);
  });

  it('rejects unknown severity', () => {
    const bad = insightCardSchema.safeParse({
      id: 'i1',
      title: 'x',
      body: 'y',
      severity: 'meh',
      confidence: 'high',
      agentId: 'a',
      generatedAt: 'now',
    });
    expect(bad.success).toBe(false);
  });
});

describe('actionChipSchema', () => {
  it('requires risk level + approval flag', () => {
    const ok = actionChipSchema.safeParse({
      id: 'a1',
      label: 'Run scan',
      agentId: 'kri-sentinel',
      tool: 'getStudyKriValues',
      riskLevel: 'safe',
      requiresApproval: false,
      generatedAt: 'now',
    });
    expect(ok.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const bad = actionChipSchema.safeParse({
      id: 'a1',
      label: 'x',
      agentId: 'a',
      tool: 't',
      generatedAt: 'now',
    });
    expect(bad.success).toBe(false);
  });
});

describe('recommendationCardSchema', () => {
  it('accepts a recommendation with an embedded action chip', () => {
    const ok = recommendationCardSchema.safeParse({
      id: 'r1',
      title: 'Open briefing',
      rationale: 'Daily morning summary.',
      agentId: 'briefing-curator',
      confidence: 'medium',
      action: {
        id: 'a1',
        label: 'Open',
        agentId: 'briefing-curator',
        tool: 'openBriefing',
        riskLevel: 'safe',
        requiresApproval: false,
        generatedAt: 'now',
      },
      generatedAt: 'now',
    });
    expect(ok.success).toBe(true);
  });
});

describe('agentCardSchema', () => {
  it('accepts a recommended agent card', () => {
    const ok = agentCardSchema.safeParse({
      id: 'kri-sentinel',
      name: 'KRI Sentinel',
      description: 'Monitors KRIs.',
      recommended: true,
      moduleContext: ['/protected/reports'],
      agentVersion: '1.0.0',
    });
    expect(ok.success).toBe(true);
  });
});

describe('parseCopilotCard helper', () => {
  it('returns null on invalid payload, never throws', () => {
    const result = parseCopilotCard('insight_card', { id: 1 });
    expect(result).toBeNull();
  });

  it('returns the parsed payload on valid input', () => {
    const result = parseCopilotCard('agent_card', {
      id: 'a',
      name: 'A',
      description: 'd',
      recommended: false,
      moduleContext: [],
    });
    expect(result?.id).toBe('a');
  });
});
