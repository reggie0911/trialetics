import { describe, expect, it } from 'vitest';

import {
  ECRF_CSV_FRIENDLY_HEADERS,
  ECRF_CSV_TECHNICAL_HEADERS,
  parseEcrfCsvText,
} from './ecrf-csv';
import {
  buildEmptyTemplateCsv,
  buildPopulatedTemplateCsv,
} from '@/lib/exporters/ecrf-template';
import type {
  StudyCrf,
  StudyCrfQuestion,
  StudyVisitDefinition,
} from '@/lib/types/ctms';

const friendlyRow = ECRF_CSV_TECHNICAL_HEADERS.map(
  (k) => ECRF_CSV_FRIENDLY_HEADERS[k]
).join(',');
const technicalRow = ECRF_CSV_TECHNICAL_HEADERS.join(',');

/** Single friendly header row — current template format. */
function csv(rows: string[]): string {
  return [friendlyRow, ...rows].join('\n');
}

/** Legacy two-row header (verbose friendly + technical) for backwards-compat tests. */
function csvLegacy(rows: string[]): string {
  const verboseFriendly = [
    'Visit Name',
    'Timepoint Label',
    'Timepoint (Days)',
    'CRF Name',
    'CRF Description',
    'Question Label',
    'Help Text',
    'Question Type (text/textarea/number/date/single_select/multi_select/yes_no)',
    'Required (true/false)',
    'Options (pipe-separated)',
  ].join(',');
  return [verboseFriendly, technicalRow, ...rows].join('\n');
}

describe('parseEcrfCsvText', () => {
  it('parses a minimal visit-only row', () => {
    const result = parseEcrfCsvText(csv(['Baseline,Day 0,0,,,,,,false,']));
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].visit_name).toBe('Baseline');
    expect(result.rows[0].visit_timepoint_days).toBe(0);
    expect(result.rows[0].crf_name).toBeNull();
    expect(result.rows[0].question_label).toBeNull();
  });

  it('parses a full question row with select options', () => {
    const result = parseEcrfCsvText(
      csv([
        'Baseline,Baseline,0,Vital Signs,Vitals,Severity,help,single_select,true,Mild|Moderate|Severe',
      ])
    );
    expect(result.errors).toEqual([]);
    expect(result.rows[0].question_options).toEqual(['Mild', 'Moderate', 'Severe']);
    expect(result.rows[0].question_required).toBe(true);
    expect(result.rows[0].question_type).toBe('single_select');
  });

  it('rejects missing required column', () => {
    const broken = ['Visit Name', 'wrong_header'].join('\n') + '\nBaseline\n';
    const result = parseEcrfCsvText(broken);
    expect(result.errors.some((e) => /Missing required column/.test(e.message))).toBe(true);
  });

  it('errors when question_label is present without crf_name', () => {
    const result = parseEcrfCsvText(
      csv(['Baseline,Day 0,0,,,Some Question,,text,false,'])
    );
    expect(
      result.errors.some((e) =>
        /crf_name is required when question_label is set/.test(e.message)
      )
    ).toBe(true);
  });

  it('errors when single_select has no options', () => {
    const result = parseEcrfCsvText(
      csv(['Baseline,Day 0,0,Vitals,,Severity,,single_select,true,'])
    );
    expect(
      result.errors.some((e) =>
        /question_options is required for single_select/.test(e.message)
      )
    ).toBe(true);
  });

  it('silently strips options when question_type is not a select type', () => {
    const result = parseEcrfCsvText(
      csv(['Baseline,Day 0,0,Vitals,,Notes,,text,false,a|b'])
    );
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].question_options).toBeNull();
    expect(result.rows[0].question_type).toBe('text');
  });

  it('accepts yes_no questions with a redundant Yes|No options column', () => {
    const result = parseEcrfCsvText(
      csv(['Baseline,Day 0,0,Vitals,,Smoker?,,yes_no,true,Yes|No'])
    );
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].question_type).toBe('yes_no');
    // Options are silently stripped on non-select types.
    expect(result.rows[0].question_options).toBeNull();
    expect(result.rows[0].question_required).toBe(true);
  });

  it('parses the legacy two-row header layout (backwards compat)', () => {
    const result = parseEcrfCsvText(
      csvLegacy([
        'Baseline,Baseline,0,Vital Signs,Vitals,Severity,help,single_select,true,Mild|Moderate|Severe',
      ])
    );
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].question_options).toEqual(['Mild', 'Moderate', 'Severe']);
    expect(result.rows[0].question_type).toBe('single_select');
  });

  it('errors on inconsistent visit timepoint metadata', () => {
    const result = parseEcrfCsvText(
      csv([
        'Baseline,Baseline,0,,,,,,false,',
        'Baseline,Baseline,3,,,,,,false,',
      ])
    );
    expect(
      result.errors.some((e) => /inconsistent timepoint metadata/.test(e.message))
    ).toBe(true);
  });

  it('rejects a non-boolean question_required', () => {
    const result = parseEcrfCsvText(
      csv(['Baseline,Day 0,0,Vitals,,Notes,,text,maybe,'])
    );
    expect(
      result.errors.some((e) => /not a valid boolean/.test(e.message))
    ).toBe(true);
  });

  it('rejects a non-integer timepoint', () => {
    const result = parseEcrfCsvText(
      csv(['Baseline,Day 0,not-a-number,,,,,,false,'])
    );
    expect(
      result.errors.some((e) => /not a valid integer/.test(e.message))
    ).toBe(true);
  });
});

describe('buildEmptyTemplateCsv', () => {
  it('round-trips through the parser without errors', () => {
    const text = buildEmptyTemplateCsv();
    const parsed = parseEcrfCsvText(text);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows.length).toBeGreaterThanOrEqual(3);
  });
});

describe('buildPopulatedTemplateCsv', () => {
  const visit: StudyVisitDefinition = {
    id: 'v1',
    study_id: 's1',
    template_version_id: 'tv1',
    visit_name: 'Baseline',
    timepoint_label: 'Day 0',
    timepoint_days: 0,
    sort_order: 0,
    created_at: '',
  };

  const crf: StudyCrf = {
    id: 'c1',
    study_id: 's1',
    template_version_id: 'tv1',
    visit_definition_id: 'v1',
    name: 'Vital Signs',
    description: 'Vitals',
    sort_order: 0,
    created_at: '',
  };

  const question: StudyCrfQuestion = {
    id: 'q1',
    crf_id: 'c1',
    template_version_id: 'tv1',
    label: 'Severity',
    help_text: null,
    question_type: 'single_select',
    required: true,
    options: ['Mild', 'Moderate', 'Severe'],
    sort_order: 0,
    created_at: '',
  };

  it('round-trips through the parser without errors', () => {
    const text = buildPopulatedTemplateCsv({
      visits: [visit],
      crfs: [crf],
      questions: [question],
    });
    const parsed = parseEcrfCsvText(text);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].question_options).toEqual(['Mild', 'Moderate', 'Severe']);
  });

  it('emits an empty visit row when a visit has no CRFs', () => {
    const text = buildPopulatedTemplateCsv({
      visits: [visit],
      crfs: [],
      questions: [],
    });
    const parsed = parseEcrfCsvText(text);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].crf_name).toBeNull();
  });
});
