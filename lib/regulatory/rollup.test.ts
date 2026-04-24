import { describe, expect, it } from 'vitest';

import {
  buildRegulatoryRollupReason,
  computeRegulatoryStatusFromSubmissionStatuses,
  countSubmissionStatuses,
} from '@/lib/regulatory/rollup';

describe('countSubmissionStatuses', () => {
  it('counts each submission status bucket', () => {
    const counts = countSubmissionStatuses([
      'approved',
      'submitted',
      'pending',
      'approved',
      'rejected',
    ]);

    expect(counts).toEqual({
      pending: 1,
      submitted: 1,
      approved: 2,
      rejected: 1,
    });
  });
});

describe('computeRegulatoryStatusFromSubmissionStatuses', () => {
  it('returns not_started when no submissions exist', () => {
    expect(computeRegulatoryStatusFromSubmissionStatuses([])).toBe('not_started');
  });

  it('returns rejected when any submission is rejected', () => {
    expect(computeRegulatoryStatusFromSubmissionStatuses(['approved', 'rejected'])).toBe('rejected');
  });

  it('returns in_progress when there are pending or submitted rows and no rejected rows', () => {
    expect(computeRegulatoryStatusFromSubmissionStatuses(['approved', 'submitted'])).toBe(
      'in_progress'
    );
    expect(computeRegulatoryStatusFromSubmissionStatuses(['pending'])).toBe('in_progress');
  });

  it('returns approved only when all submissions are approved', () => {
    expect(computeRegulatoryStatusFromSubmissionStatuses(['approved', 'approved'])).toBe(
      'approved'
    );
  });
});

describe('buildRegulatoryRollupReason', () => {
  it('explains the no-submission roll-up', () => {
    expect(buildRegulatoryRollupReason([])).toBe('Roll-up: no submissions -> Not Started');
  });

  it('builds a status count explanation with derived target label', () => {
    expect(buildRegulatoryRollupReason(['approved', 'submitted'])).toBe(
      'Roll-up: 1 approved + 1 submitted -> In Progress'
    );
  });
});
