import type { EcrfBulkRow } from '@/lib/parsers/ecrf-csv';
import type {
  EcrfBulkMode,
  EcrfBulkPreview,
} from '@/lib/parsers/ecrf-bulk-preview';

export interface EcrfBulkResultCounts {
  visits_created: number;
  visits_updated: number;
  crfs_created: number;
  crfs_updated: number;
  questions_created: number;
  questions_updated: number;
}

export interface EcrfBulkImportInput {
  studyId: string;
  versionId: string;
  mode: EcrfBulkMode;
  rows: EcrfBulkRow[];
  /** When true, runs the analysis only and returns counts without writing. */
  dryRun?: boolean;
  /** Required for replace mode; UI must collect a type-to-confirm value. */
  confirmReplaceText?: string;
}

export interface EcrfBulkImportResult {
  ok: boolean;
  error: string | null;
  preview: EcrfBulkPreview | null;
  result: EcrfBulkResultCounts | null;
}
