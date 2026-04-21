import JSZip from 'jszip';
import { pdf } from '@react-pdf/renderer';
import React from 'react';
import {
  VisitReportPdfDocument,
  type VisitReportPdfData,
} from '@/components/ctms/trip-reports/visit-report-pdf-document';
import { getApprovedTripReportPdfData } from '@/lib/actions/visit-reports';
import { saveBlobAsFile } from '@/lib/utils/visit-report-pdf';

export interface BulkPdfItem {
  visitId: string;
  /** Pre-computed by the caller (study/site/visit-type/date). Must be unique inside the batch. */
  filename: string;
  footerLeft?: string;
  footerRight?: string;
}

export interface BulkPdfFailure {
  visitId: string;
  filename: string;
  error: string;
}

export interface BulkPdfProgress {
  done: number;
  total: number;
  currentVisitId: string | null;
  currentFilename: string | null;
  failures: BulkPdfFailure[];
}

export interface BulkPdfResult {
  failures: BulkPdfFailure[];
  succeeded: number;
  total: number;
}

/**
 * De-duplicate filenames inside the zip so collisions don't silently
 * overwrite. Appends `(2)`, `(3)`, ... before the `.pdf` extension.
 */
function uniqueFilename(used: Set<string>, candidate: string): string {
  if (!used.has(candidate)) {
    used.add(candidate);
    return candidate;
  }
  const dot = candidate.lastIndexOf('.');
  const stem = dot === -1 ? candidate : candidate.slice(0, dot);
  const ext = dot === -1 ? '' : candidate.slice(dot);
  let i = 2;
  let next = `${stem} (${i})${ext}`;
  while (used.has(next)) {
    i += 1;
    next = `${stem} (${i})${ext}`;
  }
  used.add(next);
  return next;
}

/**
 * Bundle N approved trip reports into a single ZIP downloaded by the
 * browser. Pure client-side: reuses `getApprovedTripReportPdfData`
 * (which keeps its own RLS / role gate so we cannot leak content via
 * the bulk path) and the existing `@react-pdf/renderer` pipeline.
 *
 * Failure semantics: per-report best effort. One failed PDF does not
 * abort the batch; failures are returned to the caller so it can show
 * a row-by-row summary.
 */
export async function downloadVisitReportPdfBundle(
  items: BulkPdfItem[],
  opts: {
    zipFilename: string;
    onProgress?: (p: BulkPdfProgress) => void;
    /** Default 2. Bounded so a CPM with a slow laptop / many reports doesn't block the tab. */
    concurrency?: number;
  }
): Promise<BulkPdfResult> {
  const total = items.length;
  const concurrency = Math.max(1, Math.min(opts.concurrency ?? 2, 4));
  const failures: BulkPdfFailure[] = [];
  const usedNames = new Set<string>();
  const zip = new JSZip();
  let done = 0;
  let cursor = 0;

  const emit = (currentVisitId: string | null, currentFilename: string | null) => {
    opts.onProgress?.({
      done,
      total,
      currentVisitId,
      currentFilename,
      failures: failures.slice(),
    });
  };

  emit(null, null);
  if (total === 0) {
    return { failures, succeeded: 0, total: 0 };
  }

  async function worker() {
    while (true) {
      const idx = cursor;
      cursor += 1;
      if (idx >= items.length) return;
      const item = items[idx];
      const filename = uniqueFilename(usedNames, item.filename);
      emit(item.visitId, filename);
      try {
        const result = await getApprovedTripReportPdfData(item.visitId);
        if ('error' in result) {
          failures.push({ visitId: item.visitId, filename, error: result.error });
        } else {
          const doc = React.createElement(VisitReportPdfDocument, {
            data: result.data as VisitReportPdfData,
            footerLeft: item.footerLeft,
            footerRight: item.footerRight,
          });
          const blob = await pdf(doc as never).toBlob();
          zip.file(filename, blob);
        }
      } catch (err) {
        failures.push({
          visitId: item.visitId,
          filename,
          error: err instanceof Error ? err.message : 'Failed to render PDF.',
        });
      } finally {
        done += 1;
        emit(item.visitId, filename);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const succeeded = total - failures.length;

  // Even if every report failed we still hand the user an empty zip
  // -- it just contains the per-row error report so they have something
  // local to attach if they file a support ticket.
  if (failures.length > 0) {
    const lines = failures.map((f) => `${f.visitId}\t${f.filename}\t${f.error}`);
    zip.file(
      'failures.txt',
      [
        'Bulk visit-report PDF generation completed with errors.',
        `Total: ${total}    Succeeded: ${succeeded}    Failed: ${failures.length}`,
        '',
        'visit_id\tintended_filename\terror',
        ...lines,
      ].join('\n')
    );
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  saveBlobAsFile(blob, opts.zipFilename);
  emit(null, null);

  return { failures, succeeded, total };
}
