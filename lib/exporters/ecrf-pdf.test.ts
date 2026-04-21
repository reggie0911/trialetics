import { describe, expect, it } from 'vitest';

import { renderEcrfPdf, type EcrfPdfInput } from './ecrf-pdf';
import type {
  EcrfTemplateVersion,
  StudyCrf,
  StudyCrfQuestion,
  StudyVisitDefinition,
} from '@/lib/types/ctms';

function fixture(): EcrfPdfInput {
  const version: EcrfTemplateVersion = {
    id: 'tv1',
    study_id: 's1',
    version_number: 1,
    name: 'Version 1',
    status: 'draft',
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    published_at: null,
    archived_at: null,
  };

  const visit: StudyVisitDefinition = {
    id: 'v1',
    study_id: 's1',
    template_version_id: 'tv1',
    visit_name: 'Baseline',
    timepoint_label: 'Day 0',
    timepoint_days: 0,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
  };

  const crf: StudyCrf = {
    id: 'c1',
    study_id: 's1',
    template_version_id: 'tv1',
    visit_definition_id: 'v1',
    name: 'Vital Signs',
    description: 'Investigator-recorded vitals at baseline.',
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
  };

  const questions: StudyCrfQuestion[] = [
    {
      id: 'q1',
      crf_id: 'c1',
      template_version_id: 'tv1',
      label: 'Severity',
      help_text: 'Investigator-rated severity at baseline.',
      question_type: 'single_select',
      options: ['Mild', 'Moderate', 'Severe'],
      required: true,
      sort_order: 0,
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'q2',
      crf_id: 'c1',
      template_version_id: 'tv1',
      label: 'Notes',
      help_text: null,
      question_type: 'textarea',
      options: null,
      required: false,
      sort_order: 1,
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  return {
    study: { id: 's1', name: 'Demo Study', protocol_id: 'PROTO-001' },
    version,
    visits: [visit],
    crfs: [crf],
    questions,
    generatedAt: new Date('2026-04-18T10:00:00Z'),
    generatedBy: 'tester@example.com',
  };
}

describe('renderEcrfPdf', () => {
  it('returns a non-empty PDF Buffer with the %PDF- magic header', async () => {
    const buf = await renderEcrfPdf(fixture());
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.byteLength).toBeGreaterThan(1000);
    expect(buf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  }, 30_000);

  it('renders cleanly with zero visits', async () => {
    const input = fixture();
    input.visits = [];
    input.crfs = [];
    input.questions = [];
    const buf = await renderEcrfPdf(input);
    expect(buf.byteLength).toBeGreaterThan(500);
    expect(buf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  }, 30_000);
});
