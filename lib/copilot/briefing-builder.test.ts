import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./insight-builder', () => ({
  buildContextInsights: vi.fn(),
}));

import { buildContextInsights } from './insight-builder';
import { generateBriefing } from './briefing-builder';

const mockedBuildContext = buildContextInsights as unknown as ReturnType<typeof vi.fn>;

afterEach(() => {
  mockedBuildContext.mockReset();
});

describe('generateBriefing', () => {
  it('composes a quiet-morning headline when there are no items', async () => {
    mockedBuildContext.mockResolvedValueOnce({
      insights: [],
      actions: [],
      recommendations: [],
      agentIds: [],
    });

    const briefing = await generateBriefing({
      userId: 'u1',
      userRole: 'admin',
      companyId: 'c1',
    });

    expect(briefing.headline).toMatch(/quiet|nothing/i);
    expect(briefing.items).toHaveLength(0);
    expect(briefing.agentId).toBe('briefing-curator');
    expect(briefing.agentVersion).toBe('1.0.0');
    expect(briefing.briefingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('flags critical-severity insights in the headline', async () => {
    mockedBuildContext.mockResolvedValueOnce({
      insights: [
        {
          id: 'i1',
          title: 'Three sites are off pace',
          body: 'Critical',
          severity: 'critical',
          confidence: 'high',
          agentId: 'kri-sentinel',
          agentVersion: '1.0.0',
          generatedAt: 'now',
        },
        {
          id: 'i2',
          title: 'Enrollment slowing',
          body: 'Warning',
          severity: 'warning',
          confidence: 'medium',
          agentId: 'kri-sentinel',
          agentVersion: '1.0.0',
          generatedAt: 'now',
        },
      ],
      actions: [
        {
          id: 'a1',
          label: 'Run KRI scan',
          description: '',
          agentId: 'kri-sentinel',
          agentVersion: '1.0.0',
          tool: 'getStudyKriValues',
          args: {},
          riskLevel: 'safe',
          requiresApproval: false,
          generatedAt: 'now',
        },
      ],
      recommendations: [],
      agentIds: ['kri-sentinel'],
    });

    const briefing = await generateBriefing({
      userId: 'u1',
      userRole: 'admin',
      companyId: 'c1',
    });

    expect(briefing.headline).toMatch(/urgent attention/i);
    expect(briefing.items).toHaveLength(3);
    expect(briefing.items[0].kind).toBe('insight');
    expect(briefing.items[2].kind).toBe('action');
    expect(briefing.summary).toContain('Three sites are off pace');
  });

  it('summarizes warnings + recommendations when there is no critical', async () => {
    mockedBuildContext.mockResolvedValueOnce({
      insights: [
        {
          id: 'i1',
          title: 'Trip report overdue',
          body: '',
          severity: 'warning',
          confidence: 'medium',
          agentId: 'monitoring-planner',
          agentVersion: '1.0.0',
          generatedAt: 'now',
        },
      ],
      actions: [],
      recommendations: [
        {
          id: 'r1',
          title: 'Draft this week\'s narrative',
          rationale: '',
          agentId: 'dashboard-narrator',
          agentVersion: '1.0.0',
          confidence: 'medium',
          generatedAt: 'now',
        },
      ],
      agentIds: [],
    });

    const briefing = await generateBriefing({
      userId: 'u1',
      userRole: 'manager',
      companyId: 'c1',
    });

    expect(briefing.headline).toMatch(/signal|review/i);
    expect(briefing.summary).toContain('Trip report overdue');
    expect(briefing.summary).toContain('Draft this week');
  });
});
