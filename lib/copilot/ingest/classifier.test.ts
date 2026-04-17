import { describe, expect, it } from 'vitest';

import { classifyHeuristic } from './classifier';

describe('classifyHeuristic', () => {
  it('classifies a budget spreadsheet from filename + keywords', () => {
    const result = classifyHeuristic(
      'Site Budget v3.xlsx',
      'Per-subject rate USD 1,200. Per-visit fees and payment terms below.'
    );
    expect(result.docType).toBe('budget');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('classifies a monitoring visit report', () => {
    const result = classifyHeuristic(
      'IMV-001-Site42.pdf',
      'Monitoring visit report for Site 42. SDV completed for 12 subjects. Action items: 3 open.'
    );
    expect(result.docType).toBe('monitoring_report');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('returns unknown when no rule matches', () => {
    const result = classifyHeuristic('random.txt', 'Lorem ipsum dolor sit amet.');
    expect(result.docType).toBe('unknown');
    expect(result.confidence).toBe(0);
  });

  it('prefers protocol amendment over protocol when both keywords appear', () => {
    const result = classifyHeuristic(
      'Protocol Amendment 2.pdf',
      'Clinical Trial Protocol amendment 2: revised inclusion/exclusion criteria.'
    );
    expect(result.docType).toBe('protocol_amendment');
  });

  it('attaches matched keyword signals for traceability', () => {
    const result = classifyHeuristic(
      'training-log.xlsx',
      'GCP training completed on Jan 15, 2025. Training Log for site staff.'
    );
    expect(result.docType).toBe('training_log');
    expect(Array.isArray((result.signals as { matches?: unknown[] }).matches)).toBe(true);
    expect((result.signals as { matches: string[] }).matches.length).toBeGreaterThan(0);
  });

  it('boosts confidence when filename hint matches', () => {
    const withHint = classifyHeuristic('CAPA_2025.docx', 'A corrective and preventive action.');
    const withoutHint = classifyHeuristic('document.docx', 'A corrective and preventive action.');
    expect(withHint.confidence).toBeGreaterThan(withoutHint.confidence);
  });

  it('caps confidence at 0.95', () => {
    const result = classifyHeuristic(
      'budget-ratecard.xlsx',
      'budget budget budget rate fees per-subject per-visit USD currency budget budget'
    );
    expect(result.confidence).toBeLessThanOrEqual(0.95);
  });
});
