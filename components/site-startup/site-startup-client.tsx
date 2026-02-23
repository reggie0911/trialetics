'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getStartupChecklists, createStartupChecklist, updateStartupStep, getStartupProgress } from '@/lib/actions/site-startup';
import type { SiteStartupChecklist, StartupStepStatus } from '@/lib/types/site-startup';
import {
  STARTUP_CHECKLIST_STATUS_LABELS,
  STARTUP_STEP_STATUS_LABELS,
  STARTUP_STEP_CATEGORY_LABELS,
} from '@/lib/types/site-startup';
import { StartupChecklistView } from './startup-checklist-view';

interface SiteStartupClientProps {
  companyId: string;
}

export function SiteStartupClient({ companyId }: SiteStartupClientProps) {
  const [checklists, setChecklists] = useState<SiteStartupChecklist[]>([]);
  const [progress, setProgress] = useState<{ total_sites: number; not_started: number; in_progress: number; completed: number; avg_completion_pct: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setIsLoading(true);
    const [clResult, progressResult] = await Promise.all([
      getStartupChecklists(companyId),
      getStartupProgress(companyId),
    ]);
    if (clResult.success && clResult.data) setChecklists(clResult.data);
    if (progressResult.success && progressResult.data) setProgress(progressResult.data);
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const handleStepUpdate = async (stepId: string, status: StartupStepStatus) => {
    await updateStartupStep(stepId, { status });
    load();
    toast({ title: 'Step updated' });
  };

  const getCompletionPct = (checklist: SiteStartupChecklist) => {
    const steps = checklist.steps || [];
    const required = steps.filter(s => s.is_required);
    const done = required.filter(s => s.status === 'completed' || s.status === 'not_applicable');
    return required.length > 0 ? Math.round((done.length / required.length) * 100) : 0;
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      not_started: 'bg-gray-100 text-gray-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
    };
    return colors[status] || '';
  };

  return (
    <div className="space-y-6">
      {progress && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Sites</p>
            <p className="text-xl font-semibold">{progress.total_sites}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Not Started</p>
            <p className="text-xl font-semibold text-gray-500">{progress.not_started}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">In Progress</p>
            <p className="text-xl font-semibold text-yellow-600">{progress.in_progress}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-xl font-semibold text-green-600">{progress.completed}</p>
          </div>
          <div className="rounded-lg border bg-white p-3 text-center">
            <p className="text-xs text-muted-foreground">Avg Completion</p>
            <p className="text-xl font-semibold">{progress.avg_completion_pct}%</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : checklists.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No site startup checklists yet. Create one from the Sites tab in Clinical Trials Management.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {checklists.map((cl) => {
            const pct = getCompletionPct(cl);
            const siteName = cl.site?.organization?.name || cl.site?.site_number || 'Unknown Site';
            return (
              <Card key={cl.id}>
                <CardHeader
                  className="cursor-pointer pb-3"
                  onClick={() => setExpandedId(expandedId === cl.id ? null : cl.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-sm font-medium">{siteName}</CardTitle>
                      <p className="text-xs text-muted-foreground">{cl.template_name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32">
                        <Progress value={pct} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1 text-right">{pct}%</p>
                      </div>
                      <Badge variant="secondary" className={statusColor(cl.status)}>
                        {STARTUP_CHECKLIST_STATUS_LABELS[cl.status]}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                {expandedId === cl.id && cl.steps && (
                  <CardContent className="pt-0">
                    <StartupChecklistView steps={cl.steps} onStepUpdate={handleStepUpdate} />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
