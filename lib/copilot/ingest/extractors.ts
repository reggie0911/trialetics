import 'server-only';

import { spreadsheetBufferToPlainText } from '@/lib/utils/excel-spreadsheet';

/**
 * Extractors for the Phase 6 document ingestion pipeline.
 *
 * Each extractor takes a Buffer and returns an `ExtractedDocument`:
 *
 *   {
 *     plainText: string                 // for prompts / search / classifier
 *     sections: ExtractedSection[]      // structured units (page, slide, sheet, paragraph)
 *     metadata: ExtractedMetadata       // dates, version, page counts, etc.
 *     warnings: string[]                // non-fatal extraction issues
 *   }
 *
 * Heavy / format-specific dependencies are loaded lazily so the API route
 * doesn't pay for them on uploads it doesn't need them for.
 */

export type ExtractedSectionKind = 'text' | 'table' | 'slide' | 'sheet' | 'email' | 'metadata';

export interface ExtractedSection {
  kind: ExtractedSectionKind;
  /** Human label for the section (e.g., "Sheet 1: Budget Summary", "Slide 3"). */
  label: string;
  /** Plain-text content for prompt-feeding. Tables are pre-flattened. */
  content: string;
  /** Optional structured payload for tables / charts. */
  structured?: Record<string, unknown>;
  /** 1-indexed page or slide number when meaningful. */
  pageOrSlide?: number;
  sheetName?: string;
}

export interface ExtractedMetadata {
  pageCount?: number;
  slideCount?: number;
  sheetCount?: number;
  authors?: string[];
  title?: string;
  createdAt?: string;
  modifiedAt?: string;
  [key: string]: unknown;
}

export interface ExtractedDocument {
  plainText: string;
  sections: ExtractedSection[];
  metadata: ExtractedMetadata;
  warnings: string[];
}

const MAX_SECTION_CHARS = 60_000;
const MAX_TOTAL_CHARS = 250_000;

function clip(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}\n[…truncated…]` : s;
}

function emptyResult(warning: string): ExtractedDocument {
  return { plainText: '', sections: [], metadata: {}, warnings: [warning] };
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------
export async function extractPdf(buffer: Buffer): Promise<ExtractedDocument> {
  try {
    // pdf-parse v2.x exposes a class-based API; we instantiate, load, and extract.
    const { PDFParse } = await import('pdf-parse') as {
      PDFParse: new (opts: { data: Buffer | Uint8Array }) => {
        getText: () => Promise<{ text?: string; pages?: Array<{ text?: string }>; numpages?: number }>;
        getInfo: () => Promise<{ info?: Record<string, unknown> }>;
        destroy: () => Promise<void>;
      };
    };
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const [textResult, infoResult] = await Promise.all([parser.getText(), parser.getInfo().catch(() => ({}))]);
    await parser.destroy().catch(() => {});

    const pages = textResult.pages ?? [];
    const sections: ExtractedSection[] = pages.length
      ? pages.map((p, i) => ({
          kind: 'text' as const,
          label: `Page ${i + 1}`,
          content: clip(p.text ?? '', MAX_SECTION_CHARS),
          pageOrSlide: i + 1,
        }))
      : [
          {
            kind: 'text',
            label: 'PDF body',
            content: clip(textResult.text ?? '', MAX_SECTION_CHARS),
          },
        ];

    const fullText = clip(
      pages.length ? pages.map(p => p.text ?? '').join('\n\n') : (textResult.text ?? ''),
      MAX_TOTAL_CHARS
    );

    const info = ('info' in infoResult ? infoResult.info : {}) ?? {};
    return {
      plainText: fullText,
      sections,
      metadata: {
        pageCount: textResult.numpages ?? pages.length,
        title: (info.Title as string | undefined) ?? undefined,
        authors: info.Author ? [String(info.Author)] : undefined,
      },
      warnings: fullText.trim() ? [] : ['PDF appears to be image-only; OCR not yet wired'],
    };
  } catch (err) {
    return emptyResult(`PDF extraction failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ---------------------------------------------------------------------------
// Excel (xlsx/xls)
// ---------------------------------------------------------------------------
export async function extractSpreadsheet(buffer: Buffer): Promise<ExtractedDocument> {
  try {
    // Best-effort: feed the whole workbook through the existing helper for
    // the prompt-friendly text, then attempt to parse per-sheet structured
    // tables for the structured payload.
    const text = await spreadsheetBufferToPlainText(buffer, {
      sheetMode: 'all',
      maxLength: MAX_TOTAL_CHARS,
    });

    let sections: ExtractedSection[] = [];
    let sheetCount: number | undefined;
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      // exceljs typings predate Node 22's parameterized Buffer<ArrayBufferLike>;
      // cast through `unknown` to satisfy the older Buffer signature at compile time.
      await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);
      sheetCount = wb.worksheets.length;
      sections = wb.worksheets.map(ws => {
        const rows: string[][] = [];
        ws.eachRow({ includeEmpty: false }, row => {
          const cells: string[] = [];
          row.eachCell({ includeEmpty: true }, cell => {
            cells.push(cell.text ?? '');
          });
          rows.push(cells);
        });
        const headers = rows[0] ?? [];
        const dataRows = rows.slice(1, 201);
        const flat = rows.slice(0, 201).map(r => r.join(' | ')).join('\n');
        return {
          kind: 'sheet' as const,
          label: `Sheet: ${ws.name}`,
          content: clip(flat, MAX_SECTION_CHARS),
          sheetName: ws.name,
          structured: { headers, rowCount: rows.length, sampleRows: dataRows },
        };
      });
    } catch {
      sections = [
        {
          kind: 'sheet',
          label: 'Workbook',
          content: clip(text, MAX_SECTION_CHARS),
        },
      ];
    }

    return {
      plainText: clip(text, MAX_TOTAL_CHARS),
      sections,
      metadata: { sheetCount },
      warnings: [],
    };
  } catch (err) {
    return emptyResult(`Spreadsheet extraction failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ---------------------------------------------------------------------------
// CSV / TSV / plain text
// ---------------------------------------------------------------------------
export async function extractTextLike(buffer: Buffer, mimeType: string): Promise<ExtractedDocument> {
  const text = clip(buffer.toString('utf-8'), MAX_TOTAL_CHARS);
  return {
    plainText: text,
    sections: [
      {
        kind: mimeType.includes('csv') || mimeType.includes('tsv') ? 'table' : 'text',
        label: mimeType.includes('csv') || mimeType.includes('tsv') ? 'CSV/TSV body' : 'Text body',
        content: clip(text, MAX_SECTION_CHARS),
      },
    ],
    metadata: {},
    warnings: [],
  };
}

// ---------------------------------------------------------------------------
// Word .docx
// ---------------------------------------------------------------------------
export async function extractDocx(buffer: Buffer): Promise<ExtractedDocument> {
  try {
    const mammoth = await import('mammoth');
    const { value, messages } = await mammoth.extractRawText({ buffer });
    const text = clip(value, MAX_TOTAL_CHARS);
    return {
      plainText: text,
      sections: [
        {
          kind: 'text',
          label: 'Word document body',
          content: clip(text, MAX_SECTION_CHARS),
        },
      ],
      metadata: {},
      warnings: (messages ?? []).slice(0, 5).map(m => m.message),
    };
  } catch (err) {
    return emptyResult(`Word extraction failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ---------------------------------------------------------------------------
// PowerPoint .pptx + Office formats via officeparser
// ---------------------------------------------------------------------------
export async function extractOffice(buffer: Buffer, mimeType: string): Promise<ExtractedDocument> {
  try {
    const officeparser = await import('officeparser') as unknown as {
      parseOfficeAsync: (buf: Buffer, opts?: Record<string, unknown>) => Promise<string>;
    };
    const text = await officeparser.parseOfficeAsync(buffer);
    const clipped = clip(text, MAX_TOTAL_CHARS);
    const isPpt = mimeType.includes('presentation') || mimeType.includes('powerpoint');
    return {
      plainText: clipped,
      sections: [
        {
          kind: isPpt ? 'slide' : 'text',
          label: isPpt ? 'Slide deck body' : 'Office document body',
          content: clip(clipped, MAX_SECTION_CHARS),
        },
      ],
      metadata: {},
      warnings: [],
    };
  } catch (err) {
    return emptyResult(`Office extraction failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ---------------------------------------------------------------------------
// Email .eml / .msg
// ---------------------------------------------------------------------------
export async function extractEmail(buffer: Buffer): Promise<ExtractedDocument> {
  try {
    const { simpleParser } = await import('mailparser');
    const parsed = await simpleParser(buffer);
    const htmlAsString = typeof parsed.html === 'string' ? parsed.html : '';
    const body = clip(parsed.text || htmlAsString.replace(/<[^>]+>/g, ' '), MAX_TOTAL_CHARS);
    const fromText = Array.isArray(parsed.from) ? parsed.from[0]?.text ?? '' : parsed.from?.text ?? '';
    const toText = Array.isArray(parsed.to) ? parsed.to.map(t => t.text).filter(Boolean).join(', ') : parsed.to?.text ?? '';
    const header = [
      `Subject: ${parsed.subject ?? ''}`,
      `From: ${fromText}`,
      `To: ${toText}`,
      `Date: ${parsed.date ? parsed.date.toISOString() : ''}`,
      '',
    ].join('\n');
    const full = `${header}${body}`;
    return {
      plainText: clip(full, MAX_TOTAL_CHARS),
      sections: [
        {
          kind: 'email',
          label: parsed.subject ?? 'Email',
          content: clip(full, MAX_SECTION_CHARS),
          structured: {
            subject: parsed.subject ?? null,
            from: fromText || null,
            to: toText || null,
            date: parsed.date?.toISOString() ?? null,
          },
        },
      ],
      metadata: { title: parsed.subject ?? undefined, modifiedAt: parsed.date?.toISOString() },
      warnings: [],
    };
  } catch (err) {
    return emptyResult(`Email extraction failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ---------------------------------------------------------------------------
// Top-level dispatch
// ---------------------------------------------------------------------------
export interface ExtractInput {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

export async function extractDocument(input: ExtractInput): Promise<ExtractedDocument> {
  const { buffer, mimeType, filename } = input;
  const lower = filename.toLowerCase();

  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) {
    return extractPdf(buffer);
  }
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    lower.endsWith('.xlsx') ||
    lower.endsWith('.xls')
  ) {
    return extractSpreadsheet(buffer);
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || lower.endsWith('.docx')) {
    return extractDocx(buffer);
  }
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    mimeType === 'application/vnd.ms-powerpoint' ||
    lower.endsWith('.pptx') ||
    lower.endsWith('.ppt')
  ) {
    return extractOffice(buffer, mimeType);
  }
  if (
    mimeType === 'application/msword' ||
    lower.endsWith('.doc')
  ) {
    return extractOffice(buffer, mimeType);
  }
  if (mimeType === 'message/rfc822' || lower.endsWith('.eml') || lower.endsWith('.msg')) {
    return extractEmail(buffer);
  }
  if (mimeType.startsWith('text/') || lower.endsWith('.csv') || lower.endsWith('.tsv') || lower.endsWith('.txt')) {
    return extractTextLike(buffer, mimeType);
  }
  return emptyResult(`Unsupported file type: ${mimeType || 'unknown'}`);
}
