/**
 * Forgiving date parser used by the standard CSV bulk uploaders.
 *
 * Spreadsheets export dates in many shapes (Excel often coerces to US-style
 * `M/D/YYYY`; some tools emit `YYYY/MM/DD` or even Excel serial numbers).
 * Our database expects ISO `YYYY-MM-DD`, so we normalize to that on read.
 *
 * Returns the canonical `YYYY-MM-DD` string when the input is unambiguously
 * a real calendar date, or `null` when it cannot be safely interpreted.
 */
export function parseFlexibleDateToIso(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. ISO `YYYY-MM-DD` (optionally followed by a time component).
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/);
  if (iso) return formatIso(iso[1], iso[2], iso[3]);

  // 2. `YYYY/M/D` (slash variant of ISO).
  const slashIso = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slashIso) return formatIso(slashIso[1], slashIso[2], slashIso[3]);

  // 3. `M/D/YYYY` or `M/D/YY` — the most common spreadsheet export format
  //    in the US locale. We can't safely auto-detect D/M/YYYY without an
  //    explicit hint, so we lean US (matches the dummy data and how Excel
  //    surfaces a "short date" cell on en-US machines).
  const us = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (us) {
    let year = us[3];
    if (year.length === 2) {
      const y = parseInt(year, 10);
      year = String(y < 70 ? 2000 + y : 1900 + y);
    }
    return formatIso(year, us[1], us[2]);
  }

  // 4. `M-D-YYYY` (dash variant of US-style).
  const usDash = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (usDash) return formatIso(usDash[3], usDash[1], usDash[2]);

  // 5. Excel serial dates — happen when a CSV export forgot to format the
  //    cell. Excel epoch is 1899-12-30 (after accounting for the 1900 leap
  //    year bug in their date system).
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const n = parseFloat(trimmed);
    if (Number.isFinite(n) && n >= 1 && n < 100000) {
      const ms = (Math.floor(n) - 25569) * 86400 * 1000;
      const dt = new Date(ms);
      if (!Number.isNaN(dt.getTime())) {
        return formatIso(
          String(dt.getUTCFullYear()),
          String(dt.getUTCMonth() + 1),
          String(dt.getUTCDate())
        );
      }
    }
  }

  return null;
}

function formatIso(year: string, month: string, day: string): string | null {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  // Round-trip through Date to validate that the day actually exists in
  // that month (so e.g. `2/30/2025` is rejected even though it parses).
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${pad4(y)}-${pad2(m)}-${pad2(d)}`;
}

function pad4(n: number): string {
  return n.toString().padStart(4, '0');
}
function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}
