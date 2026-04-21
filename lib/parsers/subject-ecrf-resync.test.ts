import { describe, expect, it } from 'vitest';

import {
  computeResyncAdditions,
  type LiveTemplateVisit,
  type SubjectVisitSnapshotRef,
} from './subject-ecrf-resync';

function visit(
  visit_definition_id: string,
  visit_name: string,
  sort_order: number,
  crfs: Array<[string, string]> = [],
): LiveTemplateVisit {
  return {
    visit_definition_id,
    visit_name,
    sort_order,
    crfs: crfs.map(([crf_definition_id, name], i) => ({
      crf_definition_id,
      name,
      sort_order: i,
    })),
  };
}

function subjectVisit(
  visit_definition_id: string | null,
  ...crf_definition_ids: string[]
): SubjectVisitSnapshotRef {
  return { visit_definition_id, crf_definition_ids };
}

describe('computeResyncAdditions', () => {
  it('returns no additions when subject is fully in sync with the live template', () => {
    const live: LiveTemplateVisit[] = [
      visit('v1', 'Screening', 0, [['c1', 'Demographics']]),
      visit('v2', 'Baseline', 1, [['c2', 'Vital Signs']]),
    ];
    const subject: SubjectVisitSnapshotRef[] = [
      subjectVisit('v1', 'c1'),
      subjectVisit('v2', 'c2'),
    ];

    const result = computeResyncAdditions(live, subject);

    expect(result.visitsToAdd).toEqual([]);
    expect(result.crfsToAdd).toEqual([]);
  });

  it('adds a brand-new visit and every CRF beneath it', () => {
    const live: LiveTemplateVisit[] = [
      visit('v1', 'Screening', 0, [['c1', 'Demographics']]),
      visit('v2', 'Baseline', 1, [['c2', 'Vital Signs'], ['c3', 'Labs']]),
    ];
    const subject: SubjectVisitSnapshotRef[] = [subjectVisit('v1', 'c1')];

    const result = computeResyncAdditions(live, subject);

    expect(result.visitsToAdd).toEqual(['v2']);
    expect(result.crfsToAdd).toEqual([
      { visit_definition_id: 'v2', crf_definition_id: 'c2' },
      { visit_definition_id: 'v2', crf_definition_id: 'c3' },
    ]);
  });

  it('adds a new CRF inside an existing visit without re-adding the visit', () => {
    const live: LiveTemplateVisit[] = [
      visit('v1', 'Screening', 0, [
        ['c1', 'Demographics'],
        ['c2', 'New CRF'],
      ]),
    ];
    const subject: SubjectVisitSnapshotRef[] = [subjectVisit('v1', 'c1')];

    const result = computeResyncAdditions(live, subject);

    expect(result.visitsToAdd).toEqual([]);
    expect(result.crfsToAdd).toEqual([
      { visit_definition_id: 'v1', crf_definition_id: 'c2' },
    ]);
  });

  it('preserves CRFs the subject has but the live template no longer does', () => {
    // Live template dropped c1; the subject still has it. Resync must NOT
    // remove c1 (regulatory-safe), so the result is "no additions".
    const live: LiveTemplateVisit[] = [visit('v1', 'Screening', 0, [])];
    const subject: SubjectVisitSnapshotRef[] = [subjectVisit('v1', 'c1')];

    const result = computeResyncAdditions(live, subject);

    expect(result.visitsToAdd).toEqual([]);
    expect(result.crfsToAdd).toEqual([]);
  });

  it('ignores hand-added subject visits that have no visit_definition_id', () => {
    // The hand-added visit (visit_definition_id: null) should not block the
    // live template's v1 from being added on resync.
    const live: LiveTemplateVisit[] = [
      visit('v1', 'Screening', 0, [['c1', 'Demographics']]),
    ];
    const subject: SubjectVisitSnapshotRef[] = [
      subjectVisit(null, 'unrelated-crf-id'),
    ];

    const result = computeResyncAdditions(live, subject);

    expect(result.visitsToAdd).toEqual(['v1']);
    expect(result.crfsToAdd).toEqual([
      { visit_definition_id: 'v1', crf_definition_id: 'c1' },
    ]);
  });
});
