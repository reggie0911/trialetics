import type { CountryDashboardRow } from '@/lib/actions/countries';

/**
 * Escape a single CSV cell per RFC 4180: wrap in quotes if it contains
 * a comma, quote, newline, or leading/trailing whitespace; double internal quotes.
 */
function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str) || str !== str.trim()) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(values: Array<string | number | null | undefined>): string {
  return values.map(csvCell).join(',');
}

const COUNTRY_HEADERS = [
  'Country',
  'ISO Code',
  'Participation Status',
  'Regulatory Status',
  'Submissions',
  'Total Sites',
  'Active Sites',
  'Enrolling Sites',
  'Last Updated',
  'Last Updated By',
];

const SUBMISSION_HEADERS = [
  'Country',
  'ISO Code',
  'Submission Type',
  'Status',
  'Reference',
  'Submission Date',
  'Approval Date',
  'Expiry Date',
];

function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function buildCountriesCsv(countries: CountryDashboardRow[]): string {
  const lines: string[] = [];
  lines.push('# Countries');
  lines.push(csvRow(COUNTRY_HEADERS));
  for (const country of countries) {
    lines.push(
      csvRow([
        country.country_name,
        country.country_code,
        country.status,
        country.regulatory_status ?? '',
        (country.regulatory_submissions ?? []).length,
        country.totalSites,
        country.activeSites,
        country.enrollingSites,
        formatIsoDate(country.lastUpdatedAt ?? country.updated_at),
        country.lastUpdatedByName ?? '',
      ]),
    );
  }

  lines.push('');
  lines.push('# Submissions');
  lines.push(csvRow(SUBMISSION_HEADERS));
  for (const country of countries) {
    for (const sub of country.regulatory_submissions ?? []) {
      lines.push(
        csvRow([
          country.country_name,
          country.country_code,
          sub.submission_type,
          sub.status,
          sub.reference_number ?? '',
          formatIsoDate(sub.submission_date),
          formatIsoDate(sub.approval_date),
          formatIsoDate(sub.expiry_date),
        ]),
      );
    }
  }

  return lines.join('\r\n');
}

export function downloadCountriesCsv(
  countries: CountryDashboardRow[],
  filenameStem: string,
): void {
  const csv = buildCountriesCsv(countries);
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${filenameStem}-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
