import { describe, expect, it } from 'vitest';

import { buildReportSpec } from './nl-report-builder';

describe('buildReportSpec', () => {
  it('detects entity from prompt', () => {
    expect(buildReportSpec('show me sites by country').entity).toBe('sites');
    expect(buildReportSpec('list all studies').entity).toBe('studies');
    expect(buildReportSpec('subjects enrolled this week').entity).toBe('subjects');
    expect(buildReportSpec('total payments by site').entity).toBe('sites');
  });

  it('picks bar chart when "by X" appears', () => {
    expect(buildReportSpec('show enrollment by country').chart).toBe('bar');
  });

  it('defaults to table when no chart hint', () => {
    expect(buildReportSpec('list all sites').chart).toBe('table');
  });

  it('parses status filters', () => {
    const spec = buildReportSpec('only active studies');
    expect(spec.filters.find((f) => f.field === 'status')?.value).toBe('active');
  });

  it('parses negative filters', () => {
    const spec = buildReportSpec('exclude paused studies');
    const f = spec.filters.find((f) => f.field === 'status');
    expect(f?.op).toBe('neq');
    expect(f?.value).toBe('paused');
  });

  it('parses percentage thresholds', () => {
    const spec = buildReportSpec('sites with enrollment < 50%');
    const f = spec.filters.find((f) => f.field === 'enrollment');
    expect(f?.op).toBe('lt');
    expect(f?.value).toBe(50);
  });

  it('detects group-by', () => {
    expect(buildReportSpec('subjects by country').groupBy).toContain('country');
    expect(buildReportSpec('payments by month').groupBy).toContain('month');
  });

  it('emits a caveat when no filters detected', () => {
    const spec = buildReportSpec('list everything');
    expect(spec.caveats.some((c) => /no filters/i.test(c))).toBe(true);
  });

  it('builds a useful headline', () => {
    const spec = buildReportSpec('show subjects by country for active oncology studies');
    expect(spec.headline.toLowerCase()).toContain('count of subjects');
    expect(spec.headline.toLowerCase()).toContain('country');
    expect(spec.filters.some((f) => f.field === 'status')).toBe(true);
    expect(spec.filters.some((f) => f.field === 'therapeutic_area')).toBe(true);
  });
});
