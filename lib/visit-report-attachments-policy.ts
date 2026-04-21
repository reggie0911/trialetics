/**
 * Shared policy constants and helpers for visit-report attachment uploads.
 *
 * Used by:
 *   - `lib/actions/visit-reports.ts` (`uploadVisitReportAttachment`) for server-side enforcement
 *   - `components/ctms/trip-reports/visit-report-authoring.tsx` for client-side pre-flight UX
 *
 * Mirrors the bucket configuration in
 *   `supabase/migrations/20260319300000_visit_report_attachments.sql`
 * and is the single source of truth for the size, file-count, and MIME limits
 * that we surface to users.
 */

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MiB

export const MAX_ATTACHMENTS_PER_REPORT = 25;

export const ALLOWED_MIME_TYPES: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
] as const;

export const ALLOWED_EXTENSIONS: readonly string[] = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.txt',
  '.csv',
] as const;

export const ATTACHMENT_LIMITS_HELPER_TEXT =
  'Max 10 MB · PDF, Word, Excel, images (PNG/JPG/GIF/WebP), TXT, CSV · up to 25 files per report';

export type SniffedMimeType =
  | 'application/pdf'
  | 'image/png'
  | 'image/jpeg'
  | 'image/gif'
  | 'image/webp'
  | 'application/zip-container' // covers docx / xlsx (Office Open XML)
  | 'application/x-ole-compound' // covers legacy doc / xls
  | 'text/plain-or-csv'
  | 'unknown';

function bytesStartWith(bytes: Uint8Array, prefix: number[], offset = 0): boolean {
  if (bytes.length < offset + prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (bytes[offset + i] !== prefix[i]) return false;
  }
  return true;
}

function isPrintableTextBytes(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return false;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    // tab, lf, cr are fine; other controls (< 0x20) are not.
    if (b === 0x09 || b === 0x0a || b === 0x0d) continue;
    if (b < 0x20) return false;
    if (b === 0x7f) return false;
    // High bytes (>= 0x80) may appear in valid UTF-8; permit them.
  }
  return true;
}

/**
 * Identify the true file type from the first few bytes (and the declared
 * MIME / extension as a fallback for ambiguous text formats). The result is
 * one of the broad family tags listed in `SniffedMimeType`, not the exact
 * MIME of the declared file.
 */
export function sniffMimeType(
  headerBytes: Uint8Array,
  declaredMime: string | null | undefined,
  fileName: string | null | undefined,
): SniffedMimeType {
  // PDF: "%PDF"
  if (bytesStartWith(headerBytes, [0x25, 0x50, 0x44, 0x46])) return 'application/pdf';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytesStartWith(headerBytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (bytesStartWith(headerBytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';

  // GIF: "GIF87a" or "GIF89a"
  if (
    bytesStartWith(headerBytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    bytesStartWith(headerBytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ) {
    return 'image/gif';
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    bytesStartWith(headerBytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytesStartWith(headerBytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return 'image/webp';
  }

  // ZIP container (used by docx, xlsx, pptx): "PK\x03\x04" (or empty PK\x05\x06)
  if (
    bytesStartWith(headerBytes, [0x50, 0x4b, 0x03, 0x04]) ||
    bytesStartWith(headerBytes, [0x50, 0x4b, 0x05, 0x06]) ||
    bytesStartWith(headerBytes, [0x50, 0x4b, 0x07, 0x08])
  ) {
    return 'application/zip-container';
  }

  // OLE compound document (legacy .doc, .xls, .ppt): D0 CF 11 E0 A1 B1 1A E1
  if (
    bytesStartWith(headerBytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
  ) {
    return 'application/x-ole-compound';
  }

  // Text fallback. Only accept when declared MIME or extension says it's text.
  const declared = (declaredMime ?? '').toLowerCase();
  const lowerName = (fileName ?? '').toLowerCase();
  const isTextDeclared =
    declared === 'text/plain' ||
    declared === 'text/csv' ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.csv');
  if (isTextDeclared && isPrintableTextBytes(headerBytes)) {
    return 'text/plain-or-csv';
  }

  return 'unknown';
}

/** True if the sniffed family is allowed by our policy. */
export function isSniffedTypeAllowed(sniffed: SniffedMimeType): boolean {
  return sniffed !== 'unknown';
}

/** True if the declared MIME (or, if absent, the extension) is allowed. */
export function isDeclaredTypeAllowed(
  declaredMime: string | null | undefined,
  fileName: string | null | undefined,
): boolean {
  const mime = (declaredMime ?? '').toLowerCase();
  if (mime && ALLOWED_MIME_TYPES.includes(mime)) return true;
  const lowerName = (fileName ?? '').toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

export interface ValidateAttachmentInput {
  size: number;
  declaredMime: string | null | undefined;
  fileName: string | null | undefined;
  headerBytes: Uint8Array;
  existingCount: number;
}

export interface ValidateAttachmentResult {
  ok: boolean;
  error: string | null;
  sniffed: SniffedMimeType;
}

/**
 * Run the full server-side / client-side validation pipeline for a single
 * upload candidate. Returns a single user-facing error string on the first
 * failure.
 */
export function validateAttachmentCandidate(
  input: ValidateAttachmentInput,
): ValidateAttachmentResult {
  if (input.existingCount >= MAX_ATTACHMENTS_PER_REPORT) {
    return {
      ok: false,
      error: `Maximum ${MAX_ATTACHMENTS_PER_REPORT} attachments per report.`,
      sniffed: 'unknown',
    };
  }
  if (!Number.isFinite(input.size) || input.size <= 0) {
    return { ok: false, error: 'No file provided', sniffed: 'unknown' };
  }
  if (input.size > MAX_ATTACHMENT_BYTES) {
    return {
      ok: false,
      error: 'File is too large. Max 10 MB.',
      sniffed: 'unknown',
    };
  }
  if (!isDeclaredTypeAllowed(input.declaredMime, input.fileName)) {
    return {
      ok: false,
      error: 'This file type is not allowed.',
      sniffed: 'unknown',
    };
  }
  const sniffed = sniffMimeType(input.headerBytes, input.declaredMime, input.fileName);
  if (!isSniffedTypeAllowed(sniffed)) {
    return {
      ok: false,
      error: 'This file type is not allowed.',
      sniffed,
    };
  }
  return { ok: true, error: null, sniffed };
}
