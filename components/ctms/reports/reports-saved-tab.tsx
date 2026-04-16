'use client';

import { useMemo, useState } from 'react';
import { Loader2, Play, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  deleteSavedReportDefinition,
  runSavedReportDefinition,
  saveReportDefinition,
} from '@/lib/actions/reports';
import type {
  ReportDatasetKey,
  ReportDefinitionRecord,
  ReportFilterConfig,
  ReportGroupingConfig,
  ReportSummaryMetricConfig,
} from '@/lib/types/reports';

interface ReportsSavedTabProps {
  studyId: string;
  savedReports: ReportDefinitionRecord[];
  currentConfig: {
    datasetKey: ReportDatasetKey;
    selectedFields: string[];
    filters: ReportFilterConfig[];
    grouping: ReportGroupingConfig[];
    summaryMetrics: ReportSummaryMetricConfig[];
  } | null;
  onSavedReportsChange: (rows: ReportDefinitionRecord[]) => void;
}

export function ReportsSavedTab({
  studyId,
  savedReports,
  currentConfig,
  onSavedReportsChange,
}: ReportsSavedTabProps) {
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const canSave = useMemo(
    () => Boolean(currentConfig && currentConfig.selectedFields.length && newName.trim()),
    [currentConfig, newName]
  );

  const handleSaveCurrent = async () => {
    if (!currentConfig) return;
    setSaving(true);
    const out = await saveReportDefinition({
      studyId,
      name: newName.trim(),
      description: newDescription.trim() || null,
      datasetKey: currentConfig.datasetKey,
      selectedFields: currentConfig.selectedFields,
      filters: currentConfig.filters,
      grouping: currentConfig.grouping,
      summaryMetrics: currentConfig.summaryMetrics,
      chartConfig: { type: 'table' },
      isShared: false,
    });
    setSaving(false);
    if (out.error || !out.data) {
      toast.error(out.error ?? 'Unable to save report definition');
      return;
    }
    onSavedReportsChange([out.data, ...savedReports]);
    setNewName('');
    setNewDescription('');
    toast.success('Report definition saved');
  };

  const handleRunSaved = async (row: ReportDefinitionRecord) => {
    setRunningId(row.id);
    const out = await runSavedReportDefinition(row.id, { limit: 200 });
    setRunningId(null);
    if (out.error) {
      toast.error(out.error);
      return;
    }
    toast.success(`Saved report "${row.name}" executed`);
  };

  const handleDeleteSaved = async (row: ReportDefinitionRecord) => {
    setDeletingId(row.id);
    const out = await deleteSavedReportDefinition(row.id);
    setDeletingId(null);
    if (out.error) {
      toast.error(out.error);
      return;
    }
    onSavedReportsChange(savedReports.filter((x) => x.id !== row.id));
    toast.success('Saved report removed');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Save Current Builder Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Report Name</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Site invoice aging" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button onClick={handleSaveCurrent} disabled={!canSave || saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Report
                </Button>
              }
            />
            <TooltipContent side="top" className="max-w-xs text-xs">
              Save the current Custom Builder field/filter/grouping settings.
            </TooltipContent>
          </Tooltip>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {savedReports.length ? (
            savedReports.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.dataset_key} • Updated {new Date(row.updated_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRunSaved(row)}
                          disabled={runningId === row.id}
                        >
                          {runningId === row.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="mr-2 h-4 w-4" />
                          )}
                          Run
                        </Button>
                      }
                    />
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      Run this saved report definition with its persisted filters.
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSaved(row)}
                          disabled={deletingId === row.id}
                        >
                          {deletingId === row.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      }
                    />
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      Archive this saved report definition.
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No saved report definitions yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
