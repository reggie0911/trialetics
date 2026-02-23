'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Play, Save, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { executeReport, createReportTemplate } from '@/lib/actions/reports';
import type { ReportTemplate, ColumnDefinition, SortConfig } from '@/lib/types/reports';
import { DATA_SOURCES } from '@/lib/types/reports';
import { ReportResultsTable } from './report-results-table';

interface ReportBuilderProps {
  companyId: string;
  template?: ReportTemplate | null;
  onBack: () => void;
}

export function ReportBuilder({ companyId, template, onBack }: ReportBuilderProps) {
  const [name, setName] = useState(template?.name || '');
  const [dataSource, setDataSource] = useState(template?.data_source || '');
  const [columns, setColumns] = useState<ColumnDefinition[]>(template?.columns || []);
  const [sort, setSort] = useState<SortConfig | null>(template?.sort_config || null);
  const [results, setResults] = useState<{ rows: Record<string, unknown>[]; total: number; columns: string[] } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (dataSource && !template) {
      const ds = DATA_SOURCES.find((d) => d.id === dataSource);
      if (ds) setColumns(ds.columns);
    }
  }, [dataSource, template]);

  const handleRun = async () => {
    if (!dataSource || columns.length === 0) return;
    setIsRunning(true);
    const result = await executeReport(companyId, dataSource, columns, undefined, sort || undefined);
    setIsRunning(false);
    if (result.success && result.data) {
      setResults(result.data);
    } else {
      toast({ title: 'Error running report', description: result.error, variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !dataSource) return;
    setIsSaving(true);
    const result = await createReportTemplate({
      name: name.trim(),
      data_source: dataSource,
      columns,
      sort_config: sort || undefined,
    });
    setIsSaving(false);
    if (result.success) {
      toast({ title: 'Report template saved' });
    }
  };

  const toggleColumn = (key: string) => {
    setColumns(columns.map((c) => c.key === key ? { ...c, visible: !c.visible } : c));
  };

  const handleExportCSV = () => {
    if (!results || results.rows.length === 0) return;
    const headers = results.columns;
    const csvRows = [
      headers.join(','),
      ...results.rows.map((row) => headers.map((h) => `"${String(row[h] ?? '')}"`).join(',')),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name || 'report'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <h2 className="text-lg font-medium">{template ? 'Edit Report' : 'New Report'}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Report Name</Label>
              <Input className="mt-1 text-xs" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Report" />
            </div>
            <div>
              <Label className="text-xs">Data Source</Label>
              <Select value={dataSource} onValueChange={setDataSource}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {DATA_SOURCES.map((ds) => (
                    <SelectItem key={ds.id} value={ds.id}>{ds.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {columns.length > 0 && (
              <div>
                <Label className="text-xs mb-2 block">Columns</Label>
                <div className="space-y-1">
                  {columns.map((col) => (
                    <div key={col.key} className="flex items-center space-x-2">
                      <Checkbox
                        checked={col.visible}
                        onCheckedChange={() => toggleColumn(col.key)}
                        id={`col-${col.key}`}
                      />
                      <label htmlFor={`col-${col.key}`} className="text-xs">{col.label}</label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {columns.filter((c) => c.sortable).length > 0 && (
              <div>
                <Label className="text-xs">Sort By</Label>
                <Select
                  value={sort?.column || ''}
                  onValueChange={(v) => setSort(v ? { column: v, ascending: sort?.ascending ?? false } : null)}
                >
                  <SelectTrigger className="mt-1 text-xs"><SelectValue placeholder="Default" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Default</SelectItem>
                    {columns.filter((c) => c.sortable).map((c) => (
                      <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2">
              <Button size="sm" onClick={handleRun} disabled={isRunning || !dataSource} className="flex-1">
                <Play className="mr-1 h-3 w-3" />
                {isRunning ? 'Running...' : 'Run'}
              </Button>
              <Button size="sm" variant="outline" onClick={handleSave} disabled={isSaving || !name.trim() || !dataSource}>
                <Save className="mr-1 h-3 w-3" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Results</CardTitle>
            {results && results.rows.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleExportCSV}>
                <Download className="mr-1 h-3 w-3" />
                CSV
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {results ? (
              <ReportResultsTable results={results} />
            ) : (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Configure your report and click Run to see results
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
