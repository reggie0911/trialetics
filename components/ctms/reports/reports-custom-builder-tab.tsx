'use client';

import { useMemo, useState } from 'react';
import { Plus, Play, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { runCustomReport } from '@/lib/actions/reports';
import {
  DATA_SOURCES,
  type ReportDatasetKey,
  type ReportFilterConfig,
  type ReportExecutionResult,
  type ReportGroupingConfig,
  type ReportSummaryMetricConfig,
} from '@/lib/types/reports';
import { ReportResultsTable } from '@/components/reports/report-results-table';

interface ReportsCustomBuilderTabProps {
  studyId: string;
  onConfigurationChange?: (config: {
    datasetKey: ReportDatasetKey;
    selectedFields: string[];
    filters: ReportFilterConfig[];
    grouping: ReportGroupingConfig[];
    summaryMetrics: ReportSummaryMetricConfig[];
    result: ReportExecutionResult | null;
    runId: string | null;
  }) => void;
}

export function ReportsCustomBuilderTab({ studyId, onConfigurationChange }: ReportsCustomBuilderTabProps) {
  const [datasetKey, setDatasetKey] = useState<ReportDatasetKey>('report_tasks');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<ReportFilterConfig[]>([]);
  const [groupField, setGroupField] = useState<string>('none');
  const [summaryField, setSummaryField] = useState<string>('none');
  const [result, setResult] = useState<ReportExecutionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const dataset = useMemo(() => DATA_SOURCES.find((x) => x.id === datasetKey), [datasetKey]);
  const fieldOptions = dataset?.fields ?? [];
  const fieldLabelByKey = useMemo(
    () => Object.fromEntries(fieldOptions.map((f) => [f.key, f.label])),
    [fieldOptions]
  );
  const fieldLabel = (value: string | null) => (value ? fieldLabelByKey[value] ?? value : '');

  const operatorLabel: Record<ReportFilterConfig['operator'], string> = {
    eq: 'Equals',
    neq: 'Not equal',
    ilike: 'Contains',
    gt: 'Greater than',
    gte: 'Greater than or equal',
    lt: 'Less than',
    lte: 'Less than or equal',
    in: 'In list',
    contains: 'Contains JSON',
    is_null: 'Is empty',
    not_null: 'Is not empty',
    between: 'Between',
  };

  const toggleField = (key: string) => {
    setSelectedFields((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));
  };

  const addFilter = () => {
    const fallback = fieldOptions[0]?.key ?? '';
    if (!fallback) return;
    setFilters((prev) => [...prev, { field: fallback, operator: 'eq', value: '' }]);
  };

  const updateFilter = (index: number, patch: Partial<ReportFilterConfig>) => {
    setFilters((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const removeFilter = (index: number) => setFilters((prev) => prev.filter((_, i) => i !== index));

  const runBuilder = async () => {
    if (!selectedFields.length) {
      toast.error('Select at least one field before running the report.');
      return;
    }

    setLoading(true);
    const grouping = groupField === 'none' ? [] : [{ field: groupField }];
    const summaryMetrics =
      summaryField === 'none'
        ? []
        : [{ id: `sum_${summaryField}`, field: summaryField, aggregation: 'sum' as const, label: `Sum of ${summaryField}` }];

    const out = await runCustomReport({
      datasetKey,
      studyId,
      selectedFields,
      filters,
      grouping,
      summaryMetrics,
      limit: 300,
    });
    setLoading(false);
    if (out.error) {
      toast.error(out.error);
      return;
    }
    setResult(out.data);
    onConfigurationChange?.({
      datasetKey,
      selectedFields,
      filters,
      grouping,
      summaryMetrics,
      result: out.data,
      runId: out.runId,
    });
    toast.success('Custom report generated');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Custom Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="space-y-2">
            <Label>Fields</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {fieldOptions.map((field) => (
                <label key={field.key} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <Checkbox
                    checked={selectedFields.includes(field.key)}
                    onCheckedChange={() => toggleField(field.key)}
                  />
                  <span>{field.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Filters</Label>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button type="button" variant="outline" size="sm" onClick={addFilter}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Filter
                    </Button>
                  }
                />
                <TooltipContent side="top" className="max-w-xs text-xs">
                  Add a field/operator/value filter condition.
                </TooltipContent>
              </Tooltip>
            </div>
            {filters.length === 0 ? (
              <p className="text-xs text-muted-foreground">No filters configured.</p>
            ) : (
              <div className="space-y-2">
                {filters.map((filter, idx) => (
                  <div key={`${filter.field}-${idx}`} className="grid gap-2 md:grid-cols-[1fr_140px_1fr_auto]">
                    <Select value={filter.field} onValueChange={(value) => updateFilter(idx, { field: value })}>
                      <SelectTrigger>
                        <SelectValue
                          getDisplayLabel={(value) => fieldLabel(value)}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldOptions.map((field) => (
                          <SelectItem key={field.key} value={field.key}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={filter.operator}
                      onValueChange={(value) =>
                        updateFilter(idx, {
                          operator: value as ReportFilterConfig['operator'],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          getDisplayLabel={(value) =>
                            operatorLabel[value as ReportFilterConfig['operator']] ?? String(value)
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eq">Equals</SelectItem>
                        <SelectItem value="neq">Not equal</SelectItem>
                        <SelectItem value="ilike">Contains</SelectItem>
                        <SelectItem value="gt">Greater than</SelectItem>
                        <SelectItem value="lt">Less than</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      value={String(filter.value ?? '')}
                      onChange={(e) => updateFilter(idx, { value: e.target.value })}
                      placeholder="Value"
                    />

                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeFilter(idx)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        Remove this filter condition.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Group by</Label>
              <Select value={groupField} onValueChange={setGroupField}>
                <SelectTrigger>
                  <SelectValue
                    getDisplayLabel={(value) => (value === 'none' ? 'No Grouping' : fieldLabel(value))}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No grouping</SelectItem>
                  {fieldOptions.map((field) => (
                    <SelectItem key={field.key} value={field.key}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Summary metric (sum)</Label>
              <Select value={summaryField} onValueChange={setSummaryField}>
                <SelectTrigger>
                  <SelectValue
                    getDisplayLabel={(value) => (value === 'none' ? 'No Summary Metric' : fieldLabel(value))}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No summary metric</SelectItem>
                  {fieldOptions.map((field) => (
                    <SelectItem key={field.key} value={field.key}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button type="button" onClick={runBuilder} disabled={loading || !selectedFields.length}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                  Run Custom Report
                </Button>
              }
            />
            <TooltipContent side="top" className="max-w-xs text-xs">
              Execute your selected fields, filters, grouping, and summary settings.
            </TooltipContent>
          </Tooltip>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {result ? (
            <>
              <ReportResultsTable results={{ rows: result.rows, total: result.total, columns: result.columns }} />
              {result.summary && Object.keys(result.summary).length > 0 && (
                <div className="rounded-md border p-3">
                  <p className="mb-2 text-sm font-medium">Summary Metrics</p>
                  <div className="grid gap-2 md:grid-cols-3">
                    {Object.entries(result.summary).map(([k, v]) => (
                      <div key={k} className="rounded-md border bg-muted/20 p-2 text-sm">
                        <p className="text-xs text-muted-foreground">{k}</p>
                        <p className="font-semibold">{Number.isFinite(v) ? v.toLocaleString() : '-'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Run the custom builder to preview your report output.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
