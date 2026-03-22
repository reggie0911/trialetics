/**
 * Format `DocEntry.lastUpdated` for the Documentation UI.
 *
 * Registry values use calendar dates (`YYYY-MM-DD`). `new Date('YYYY-MM-DD')` parses as
 * UTC midnight and can render as the previous day in US timezones — use local date parts instead.
 */
export function formatDocLastUpdatedForDisplay(
  value: string,
  style: 'short' | 'long'
): string {
  const trimmed = value.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    const y = Number(dateOnly[1]);
    const m = Number(dateOnly[2]) - 1;
    const d = Number(dateOnly[3]);
    const local = new Date(y, m, d);
    return local.toLocaleDateString(
      'en-US',
      style === 'short'
        ? { month: 'short', day: 'numeric', year: 'numeric' }
        : { year: 'numeric', month: 'long', day: 'numeric' }
    );
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(
      'en-US',
      style === 'short'
        ? { month: 'short', day: 'numeric', year: 'numeric' }
        : { year: 'numeric', month: 'long', day: 'numeric' }
    );
  }

  return trimmed;
}
