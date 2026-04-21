import { describe, expect, it } from 'vitest';

import { parseEcrfCsvText, ECRF_CSV_TECHNICAL_HEADERS, ECRF_CSV_FRIENDLY_HEADERS } from './ecrf-csv';
import { buildEmptyTemplateCsv } from '@/lib/exporters/ecrf-template';
import {
  computeEcrfBulkPreview,
  type EcrfBulkMode,
  type ExistingCrf,
  type ExistingQuestion,
  type ExistingVisit,
} from './ecrf-bulk-preview';

const friendlyRow = ECRF_CSV_TECHNICAL_HEADERS.map(
  (k) => ECRF_CSV_FRIENDLY_HEADERS[k]
).join(',');
const csv = (rows: string[]) => [friendlyRow, ...rows].join('\n');

const empty = { visits: [] as ExistingVisit[], crfs: [] as ExistingCrf[], questions: [] as ExistingQuestion[] };

describe('computeEcrfBulkPreview', () => {
  it('counts every row as new on an empty version (append)', () => {
    const parsed = parseEcrfCsvText(buildEmptyTemplateCsv());
    expect(parsed.errors).toEqual([]);
    const preview = computeEcrfBulkPreview(parsed.rows, 'append', empty);
    expect(preview.visitsToCreate).toBeGreaterThanOrEqual(2);
    expect(preview.crfsToCreate).toBeGreaterThanOrEqual(2);
    expect(preview.questionsToCreate).toBeGreaterThanOrEqual(1);
    expect(preview.visitsToUpdate).toBe(0);
    expect(preview.visitsToDelete).toBe(0);
  });

  it('upsert reports updates when names match', () => {
    const parsed = parseEcrfCsvText(
      csv([
        'Baseline,Day 0,0,Vital Signs,,Severity,,single_select,true,Mild|Moderate|Severe',
      ])
    );
    expect(parsed.errors).toEqual([]);
    const existing = {
      visits: [{ id: 'v1', visit_name: 'Baseline' }],
      crfs: [{ id: 'c1', visit_definition_id: 'v1', name: 'Vital Signs' }],
      questions: [{ id: 'q1', crf_id: 'c1', label: 'Severity' }],
    };
    const preview = computeEcrfBulkPreview(parsed.rows, 'upsert', existing);
    expect(preview.visitsToUpdate).toBe(1);
    expect(preview.crfsToUpdate).toBe(1);
    expect(preview.questionsToUpdate).toBe(1);
    expect(preview.visitsToCreate).toBe(0);
    expect(preview.crfsToCreate).toBe(0);
    expect(preview.questionsToCreate).toBe(0);
  });

  it('replace reports deletes for the entire existing tree', () => {
    const parsed = parseEcrfCsvText(
      csv(['Baseline,Day 0,0,,,,,,false,'])
    );
    const existing = {
      visits: [
        { id: 'v1', visit_name: 'Old A' },
        { id: 'v2', visit_name: 'Old B' },
      ],
      crfs: [{ id: 'c1', visit_definition_id: 'v1', name: 'Vitals' }],
      questions: [{ id: 'q1', crf_id: 'c1', label: 'Severity' }],
    };
    const preview = computeEcrfBulkPreview(parsed.rows, 'replace', existing);
    expect(preview.visitsToDelete).toBe(2);
    expect(preview.crfsToDelete).toBe(1);
    expect(preview.questionsToDelete).toBe(1);
    expect(preview.visitsToCreate).toBe(1);
  });

  it.each<EcrfBulkMode>(['append', 'upsert', 'replace'])(
    'never reports negative counts (mode=%s)',
    (mode) => {
      const parsed = parseEcrfCsvText(buildEmptyTemplateCsv());
      const preview = computeEcrfBulkPreview(parsed.rows, mode, empty);
      for (const value of Object.values(preview)) {
        expect(value).toBeGreaterThanOrEqual(0);
      }
    }
  );
});
