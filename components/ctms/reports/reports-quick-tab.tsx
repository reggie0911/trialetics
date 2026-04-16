'use client';

import { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { runQuickReport } from '@/lib/actions/reports';
import { DATA_SOURCES, type ReportDatasetKey, type ReportExecutionResult } from '@/lib/types/reports';
import { ReportResultsTable } from '@/components/reports/report-results-table';

interface ReportsQuickTabProps {
  studyId: string;
  onRun?: (datasetKey: ReportDatasetKey, result: ReportExecutionResult | null, runId: string | null) => void;
}

export function ReportsQuickTab({ studyId, onRun }: ReportsQuickTabProps) {
  const [datasetKey, setDatasetKey] = useState<ReportDatasetKey>('report_tasks');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReportExecutionResult | null>(null);

  const handleRun = async () => {
    setLoading(true);
    const out = await runQuickReport({
      datasetKey,
      studyId,
      limit: 200,
    });
    setLoading(false);
    if (out.error) {
      toast.error(out.error);
      onRun?.(datasetKey, null, out.runId);
      return;
    }
    setResult(out.data);
    onRun?.(datasetKey, out.data, out.runId);
    toast.success('Quick report generated');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Quick Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label>Dataset</Label>
              <Select value={datasetKey} onValueChange={(v) => setDatasetKey(v as ReportDatasetKey)}>
                <SelectTrigger>
                  <SelectValue
                    getDisplayLabel={(value) => DATA_SOURCES.find((ds) => ds.id === value)?.label ?? String(value)}
                  />
                </SelectTrigger>
                <SelectContent>
                  {DATA_SOURCES.map((ds) => (
                    <SelectItem key={ds.id} value={ds.id}>
                      {ds.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button onClick={handleRun} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Run Quick Report
                  </Button>
                }
              />
              <TooltipContent side="top" className="max-w-xs text-xs">
                Run a preset report using the dataset&apos;s default fields.
              </TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {result ? (
            <ReportResultsTable
              results={{ rows: result.rows, total: result.total, columns: result.columns }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Run a quick report to preview results.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
