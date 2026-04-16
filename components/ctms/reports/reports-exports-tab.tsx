'use client';

import { useState, type ReactNode } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { exportReportResult } from '@/lib/actions/reports';
import type {
  ReportDatasetKey,
  ReportExportFormat,
  ReportFilterConfig,
  ReportGroupingConfig,
  ReportSummaryMetricConfig,
} from '@/lib/types/reports';

interface ReportsExportsTabProps {
  studyId: string;
  config: {
    datasetKey: ReportDatasetKey;
    selectedFields: string[];
    filters: ReportFilterConfig[];
    grouping: ReportGroupingConfig[];
    summaryMetrics: ReportSummaryMetricConfig[];
  } | null;
}

function rowsToCsv(rows: Record<string, unknown>[], columns: string[]) {
  const esc = (value: unknown) => {
    const v = value == null ? '' : String(value);
    if (v.includes(',') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const header = columns.join(',');
  const body = rows.map((row) => columns.map((c) => esc(row[c])).join(',')).join('\n');
  return `${header}\n${body}`;
}

function triggerDownload(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsExportsTab({ studyId, config }: ReportsExportsTabProps) {
  const [loadingFormat, setLoadingFormat] = useState<ReportExportFormat | null>(null);

  const handleExport = async (format: ReportExportFormat) => {
    if (!config || !config.selectedFields.length) {
      toast.error('Configure and run a report first to export.');
      return;
    }

    setLoadingFormat(format);
    const out = await exportReportResult({
      datasetKey: config.datasetKey,
      studyId,
      selectedFields: config.selectedFields,
      filters: config.filters,
      grouping: config.grouping,
      summaryMetrics: config.summaryMetrics,
      format,
    });
    setLoadingFormat(null);

    if (out.error || !out.data) {
      toast.error(out.error ?? 'Export failed');
      return;
    }

    const csv = rowsToCsv(out.data.rows, out.data.columns);
    if (format === 'csv') {
      triggerDownload(out.data.fileName, csv, 'text/csv;charset=utf-8');
    } else if (format === 'xlsx') {
      triggerDownload(out.data.fileName, csv, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else {
      triggerDownload(out.data.fileName, csv, 'application/pdf');
    }
    toast.success(`${format.toUpperCase()} export prepared`);
  };

  const renderExportButton = (format: ReportExportFormat, label: string, icon: ReactNode, tooltip: string) => (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            onClick={() => handleExport(format)}
            disabled={loadingFormat !== null}
          >
            {loadingFormat === format ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : icon}
            {label}
          </Button>
        }
      />
      <TooltipContent side="top" className="max-w-xs text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Export uses report guardrails. Larger datasets require tighter filters or scheduled delivery once enabled.
        </p>
        <div className="flex flex-wrap gap-2">
          {renderExportButton('csv', 'Export CSV', <Download className="mr-2 h-4 w-4" />, 'Download comma-separated report output.')}
          {renderExportButton('xlsx', 'Export Excel', <FileSpreadsheet className="mr-2 h-4 w-4" />, 'Prepare Excel-compatible output for spreadsheet workflows.')}
          {renderExportButton('pdf', 'Export PDF', <FileText className="mr-2 h-4 w-4" />, 'Prepare printable PDF-style output for sharing.')}
        </div>
      </CardContent>
    </Card>
  );
}
