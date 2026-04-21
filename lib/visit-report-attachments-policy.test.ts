/**
 * Unit tests for the shared upload-policy helpers.
 *
 * These cover the magic-byte sniffer (the second line of defence after the
 * bucket's `allowed_mime_types`) and the combined `validateAttachmentCandidate`
 * pipeline used by both the server action and the upload UI.
 */
import { describe, expect, it } from 'vitest';

import {
  ALLOWED_MIME_TYPES,
  ATTACHMENT_LIMITS_HELPER_TEXT,
  MAX_ATTACHMENTS_PER_REPORT,
  MAX_ATTACHMENT_BYTES,
  isDeclaredTypeAllowed,
  isSniffedTypeAllowed,
  sniffMimeType,
  validateAttachmentCandidate,
} from './visit-report-attachments-policy';

const PDF_HEADER = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const PNG_HEADER = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const JPEG_HEADER = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const GIF_HEADER = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x10, 0x00]);
const WEBP_HEADER = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
const ZIP_HEADER = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
const OLE_HEADER = Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const ASCII_TEXT = Uint8Array.from(
  [...'hello, world\n'].map((c) => c.charCodeAt(0)),
);
const WAV_HEADER = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
]); // RIFF...WAVE
const MP3_HEADER = Uint8Array.from([0x49, 0x44, 0x33, 0x04, 0x00]); // ID3
const PE_EXE_HEADER = Uint8Array.from([0x4d, 0x5a, 0x90, 0x00, 0x03]); // MZ

describe('sniffMimeType', () => {
  it('detects PDF by %PDF magic', () => {
    expect(sniffMimeType(PDF_HEADER, 'application/pdf', 'a.pdf')).toBe('application/pdf');
  });

  it('detects PNG by 8-byte PNG magic', () => {
    expect(sniffMimeType(PNG_HEADER, 'image/png', 'a.png')).toBe('image/png');
  });

  it('detects JPEG by FF D8 FF', () => {
    expect(sniffMimeType(JPEG_HEADER, 'image/jpeg', 'a.jpg')).toBe('image/jpeg');
  });

  it('detects GIF', () => {
    expect(sniffMimeType(GIF_HEADER, 'image/gif', 'a.gif')).toBe('image/gif');
  });

  it('detects WebP RIFF/WEBP container', () => {
    expect(sniffMimeType(WEBP_HEADER, 'image/webp', 'a.webp')).toBe('image/webp');
  });

  it('detects ZIP container (docx / xlsx)', () => {
    expect(sniffMimeType(ZIP_HEADER, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'a.docx')).toBe(
      'application/zip-container',
    );
  });

  it('detects legacy OLE compound (doc / xls)', () => {
    expect(sniffMimeType(OLE_HEADER, 'application/msword', 'a.doc')).toBe('application/x-ole-compound');
  });

  it('accepts plain text only when declared mime / extension says so', () => {
    expect(sniffMimeType(ASCII_TEXT, 'text/plain', 'note.txt')).toBe('text/plain-or-csv');
    expect(sniffMimeType(ASCII_TEXT, 'application/octet-stream', 'note.bin')).toBe('unknown');
  });

  it('rejects RIFF without WEBP marker (e.g. WAV) as unknown', () => {
    expect(sniffMimeType(WAV_HEADER, 'image/webp', 'fake.webp')).toBe('unknown');
  });

  it('rejects MP3 / EXE binaries even when renamed to a permitted extension', () => {
    expect(sniffMimeType(MP3_HEADER, 'application/pdf', 'evil.pdf')).toBe('unknown');
    expect(sniffMimeType(PE_EXE_HEADER, 'application/pdf', 'evil.pdf')).toBe('unknown');
  });
});

describe('isDeclaredTypeAllowed', () => {
  it('accepts every MIME in the bucket allowlist', () => {
    for (const mime of ALLOWED_MIME_TYPES) {
      expect(isDeclaredTypeAllowed(mime, 'foo')).toBe(true);
    }
  });

  it('falls back to the file extension when MIME is missing', () => {
    expect(isDeclaredTypeAllowed('', 'report.pdf')).toBe(true);
    expect(isDeclaredTypeAllowed(null, 'data.csv')).toBe(true);
  });

  it('rejects unknown MIME and unknown extension together', () => {
    expect(isDeclaredTypeAllowed('application/octet-stream', 'evil.exe')).toBe(false);
  });
});

describe('isSniffedTypeAllowed', () => {
  it('treats the unknown family as the only blocker', () => {
    expect(isSniffedTypeAllowed('application/pdf')).toBe(true);
    expect(isSniffedTypeAllowed('image/png')).toBe(true);
    expect(isSniffedTypeAllowed('text/plain-or-csv')).toBe(true);
    expect(isSniffedTypeAllowed('unknown')).toBe(false);
  });
});

describe('validateAttachmentCandidate', () => {
  const baseInput = {
    size: 1024,
    declaredMime: 'application/pdf',
    fileName: 'report.pdf',
    headerBytes: PDF_HEADER,
    existingCount: 0,
  } as const;

  it('happy path returns ok=true and the sniffed family', () => {
    const r = validateAttachmentCandidate(baseInput);
    expect(r).toEqual({ ok: true, error: null, sniffed: 'application/pdf' });
  });

  it('rejects when over the per-report cap', () => {
    const r = validateAttachmentCandidate({
      ...baseInput,
      existingCount: MAX_ATTACHMENTS_PER_REPORT,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Maximum 25 attachments/);
  });

  it('rejects empty / non-finite size', () => {
    expect(validateAttachmentCandidate({ ...baseInput, size: 0 }).ok).toBe(false);
    expect(validateAttachmentCandidate({ ...baseInput, size: Number.NaN }).ok).toBe(false);
  });

  it('rejects oversize files', () => {
    const r = validateAttachmentCandidate({ ...baseInput, size: MAX_ATTACHMENT_BYTES + 1 });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('File is too large. Max 10 MB.');
  });

  it('rejects disallowed declared MIME / extension before sniffing', () => {
    const r = validateAttachmentCandidate({
      ...baseInput,
      declaredMime: 'application/x-msdownload',
      fileName: 'evil.exe',
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('This file type is not allowed.');
  });

  it('rejects MIME spoofing (PDF declared but bytes are EXE)', () => {
    const r = validateAttachmentCandidate({
      ...baseInput,
      headerBytes: PE_EXE_HEADER,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('This file type is not allowed.');
    expect(r.sniffed).toBe('unknown');
  });
});

describe('exported policy constants', () => {
  it('exports a 10 MiB byte cap', () => {
    expect(MAX_ATTACHMENT_BYTES).toBe(10 * 1024 * 1024);
  });
  it('exports a 25-file per-report cap', () => {
    expect(MAX_ATTACHMENTS_PER_REPORT).toBe(25);
  });
  it('helper text mentions every salient limit', () => {
    expect(ATTACHMENT_LIMITS_HELPER_TEXT).toMatch(/10 MB/);
    expect(ATTACHMENT_LIMITS_HELPER_TEXT).toMatch(/25 files/);
    expect(ATTACHMENT_LIMITS_HELPER_TEXT).toMatch(/PDF/);
    expect(ATTACHMENT_LIMITS_HELPER_TEXT).toMatch(/CSV/);
  });
});
