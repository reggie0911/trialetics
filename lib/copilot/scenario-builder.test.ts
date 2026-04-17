import { describe, expect, it } from 'vitest';

import { parseScenarioPrompt, runScenario } from './scenario-builder';

describe('parseScenarioPrompt', () => {
  it('detects add_sites', () => {
    expect(parseScenarioPrompt('add 5 sites in Q2').kind).toBe('add_sites');
  });

  it('detects timeline_shift', () => {
    expect(parseScenarioPrompt('what if the study slips by 6 weeks?').kind).toBe('timeline_shift');
  });

  it('detects budget_change', () => {
    expect(parseScenarioPrompt('what if we cut budget by 20%?').kind).toBe('budget_change');
  });

  it('detects dropout_rate', () => {
    expect(parseScenarioPrompt('what if dropout rises 3%?').kind).toBe('dropout_rate');
  });

  it('captures magnitude', () => {
    expect(parseScenarioPrompt('add 7 sites').magnitude).toBe(7);
  });
});

describe('runScenario', () => {
  it('produces rows for add_sites', () => {
    const projection = runScenario('add 3 sites');
    expect(projection.rows.length).toBeGreaterThan(0);
    const sitesRow = projection.rows.find((r) => /active sites/i.test(r.label));
    expect(sitesRow).toBeTruthy();
    expect(sitesRow?.changed).toBe(true);
  });

  it('emits caveats', () => {
    const projection = runScenario('add 2 sites');
    expect(projection.caveats.length).toBeGreaterThan(0);
  });

  it('emits at least one next action', () => {
    const projection = runScenario('add 5 sites');
    expect(projection.nextActions.length).toBeGreaterThan(0);
  });

  it('handles timeline_shift', () => {
    const projection = runScenario('what if we slip by 4 weeks?');
    expect(projection.rows.find((r) => /carry cost/i.test(r.label))).toBeTruthy();
  });

  it('passes through structured inputs', () => {
    const projection = runScenario({ kind: 'remove_site', prompt: 'close 2 sites', magnitude: 2 });
    expect(projection.inputs.kind).toBe('remove_site');
  });
});
