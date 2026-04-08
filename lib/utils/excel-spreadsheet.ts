import ExcelJS from 'exceljs';
import { Readable } from 'node:stream';

function cellValueToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null) {
    const v = value as unknown as Record<string, unknown>;
    if (Array.isArray(v.richText)) {
      return (v.richText as { text: string }[]).map((t) => t.text).join('');
    }
    if (typeof v.text === 'string') return v.text;
    if ('result' in v && v.result != null) return String(v.result);
    if (typeof v.hyperlink === 'string' && typeof v.text === 'string') return String(v.text);
    if (v.error != null) return '';
  }
  return '';
}

/**
 * Load an .xlsx buffer and flatten to plain text (tabs between cells, rows newline).
 * Used for AI / text extraction instead of the deprecated `xlsx` package.
 */
export async function spreadsheetBufferToPlainText(
  input: Uint8Array | ArrayBuffer | Buffer,
  opts: { sheetMode: 'first' | 'all'; maxLength: number }
): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  const u8 =
    input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : Buffer.isBuffer(input)
        ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
        : input;
  await workbook.xlsx.read(Readable.from(Buffer.from(u8)));
  const parts: string[] = [];
  let sheetIndex = 0;
  for (const sheet of workbook.worksheets) {
    if (opts.sheetMode === 'first' && sheetIndex > 0) break;
    parts.push(`--- Sheet: ${sheet.name} ---`);
    sheet.eachRow((row) => {
      const vals = row.values as ExcelJS.CellValue[] | undefined;
      if (!vals || vals.length < 2) return;
      const cells = vals.slice(1).map((c) => cellValueToString(c));
      parts.push(cells.join('\t'));
    });
    sheetIndex++;
  }
  return parts.join('\n').slice(0, opts.maxLength);
}
