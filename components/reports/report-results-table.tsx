'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ReportResultsTableProps {
  results: {
    rows: Record<string, unknown>[];
    total: number;
    columns: string[];
  };
}

export function ReportResultsTable({ results }: ReportResultsTableProps) {
  if (results.rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        No results found
      </div>
    );
  }

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'object') return JSON.stringify(val);
    const str = String(val);
    if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
      return new Date(str).toLocaleString();
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return new Date(str).toLocaleDateString();
    }
    return str;
  };

  const formatHeader = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {results.columns.map((col) => (
                <TableHead key={col} className="text-xs whitespace-nowrap">
                  {formatHeader(col)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.rows.map((row, i) => (
              <TableRow key={i}>
                {results.columns.map((col) => (
                  <TableCell key={col} className="text-xs whitespace-nowrap">
                    {formatValue(row[col])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Showing {results.rows.length} of {results.total} results
      </p>
    </div>
  );
}
