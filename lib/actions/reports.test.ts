import { describe, expect, it } from 'vitest';
import {
  runReportInputSchema,
  sanitizeSelectedFields,
  sanitizeFilters,
  resolveExportGuardrail,
  REPORT_EXPORT_SYNC_MAX_ROWS,
} from '@/lib/reports/reporting-policy';

describe('report query validation', () => {
  it('rejects invalid dataset keys', () => {
    const parsed = runReportInputSchema.safeParse({
      datasetKey: 'not_a_dataset',
      selectedFields: ['status'],
      filters: [],
      grouping: [],
      summaryMetrics: [],
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts valid quick run payload shape', () => {
    const parsed = runReportInputSchema.safeParse({
      datasetKey: 'report_tasks',
      selectedFields: ['title', 'status'],
      filters: [{ field: 'status', operator: 'eq', value: 'open' }],
      grouping: [],
      summaryMetrics: [],
      limit: 50,
    });
    expect(parsed.success).toBe(true);
  });
});

describe('report field RBAC and filtering policy', () => {
  it('removes PHI fields for non-admin users', () => {
    const fields = sanitizeSelectedFields('report_subjects', ['subject_number', 'status'], 'user', false);
    expect(fields).toEqual(['status']);
  });

  it('allows PHI fields for admins', () => {
    const fields = sanitizeSelectedFields('report_subjects', ['subject_number', 'status'], 'admin', false);
    expect(fields).toEqual(['subject_number', 'status']);
  });

  it('drops filter fields outside dataset allowlist', () => {
    const filters = sanitizeFilters('report_tasks', [
      { field: 'status', operator: 'eq', value: 'open' },
      { field: 'unknown_field', operator: 'eq', value: 'x' },
    ]);
    expect(filters).toEqual([{ field: 'status', operator: 'eq', value: 'open' }]);
  });
});

describe('report export guardrails and audit status mapping', () => {
  it('marks export as failed when row count exceeds cap', () => {
    const guardrail = resolveExportGuardrail(REPORT_EXPORT_SYNC_MAX_ROWS + 1);
    expect(guardrail.status).toBe('failed');
    expect(guardrail.errorCode).toBe('row_limit_exceeded');
    expect(guardrail.errorMessage).toContain(String(REPORT_EXPORT_SYNC_MAX_ROWS));
  });

  it('marks export as succeeded within cap', () => {
    const guardrail = resolveExportGuardrail(100);
    expect(guardrail.status).toBe('succeeded');
    expect(guardrail.errorCode).toBeNull();
  });
});
