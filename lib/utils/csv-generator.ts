/**
 * Server-side CSV generation utility (no DOM dependency).
 */
export function generateCSVString(
  rows: Record<string, unknown>[],
  columns?: { key: string; label: string }[]
): string {
  if (rows.length === 0) return '';

  const keys = columns ? columns.map(c => c.key) : Object.keys(rows[0]);
  const headers = columns ? columns.map(c => c.label) : keys;

  const header = headers
    .map(h => `"${String(h).replace(/"/g, '""')}"`)
    .join(',');

  const body = rows.map(row =>
    keys
      .map(k => {
        const v = String(row[k] ?? '').replace(/"/g, '""');
        return `"${v}"`;
      })
      .join(',')
  );

  return [header, ...body].join('\n');
}
