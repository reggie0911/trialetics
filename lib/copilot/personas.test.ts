import { describe, expect, it } from 'vitest';

import { personaPromptSnippet, type CopilotPersona } from './personas';

function makePersona(overrides: Partial<CopilotPersona> = {}): CopilotPersona {
  return {
    id: 'p1',
    userId: 'u1',
    companyId: 'c1',
    name: 'Default',
    isActive: true,
    role: null,
    tone: 'balanced',
    timezone: null,
    units: 'metric',
    guardrails: [],
    preferredAgents: [],
    metadata: {},
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

describe('personaPromptSnippet', () => {
  it('returns empty string when persona is null', () => {
    expect(personaPromptSnippet(null)).toBe('');
  });

  it('includes tone, units, role, and timezone when present', () => {
    const snippet = personaPromptSnippet(
      makePersona({ role: 'CRA', timezone: 'America/Chicago', tone: 'concise', units: 'imperial' })
    );
    expect(snippet).toContain('Role: CRA');
    expect(snippet).toContain('Tone: concise');
    expect(snippet).toContain('Units: imperial');
    expect(snippet).toContain('Timezone: America/Chicago');
  });

  it('lists guardrails (capped at 5)', () => {
    const guardrails = Array.from({ length: 10 }, (_, i) => `Rule ${i + 1}`);
    const snippet = personaPromptSnippet(makePersona({ guardrails }));
    expect(snippet).toContain('Rule 1');
    expect(snippet).toContain('Rule 5');
    expect(snippet).not.toContain('Rule 6');
  });

  it('always reminds the model not to override regulatory guardrails', () => {
    const snippet = personaPromptSnippet(makePersona());
    expect(snippet.toLowerCase()).toContain('regulatory');
  });
});
