'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  getSelectionDecisions,
  createSelectionDecision,
  getEvaluations,
} from '@/lib/actions/feasibility';
import type {
  SiteSelectionDecisionRecord,
  FeasibilitySiteEvaluation,
  SelectionDecision,
} from '@/lib/types/feasibility';
import { SELECTION_DECISION_LABELS } from '@/lib/types/feasibility';

interface SiteSelectionDialogProps {
  studyId: string;
  companyId: string;
}

const decisionColors: Record<string, string> = {
  selected: 'bg-green-100 text-green-800',
  backup: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  deferred: 'bg-yellow-100 text-yellow-800',
};

export function SiteSelectionDialog({ studyId, companyId }: SiteSelectionDialogProps) {
  const { toast } = useToast();
  const [decisions, setDecisions] = useState<SiteSelectionDecisionRecord[]>([]);
  const [evaluations, setEvaluations] = useState<FeasibilitySiteEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [decision, setDecision] = useState<SelectionDecision>('selected');
  const [rationale, setRationale] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [decisionsRes, evalsRes] = await Promise.all([
      getSelectionDecisions(studyId),
      getEvaluations(studyId),
    ]);
    if (decisionsRes.success && decisionsRes.data) setDecisions(decisionsRes.data);
    if (evalsRes.success && evalsRes.data) setEvaluations(evalsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [studyId]);

  const decidedOrgIds = new Set(decisions.map((d) => d.organization_id));
  const undecidedEvals = evaluations.filter((e) => !decidedOrgIds.has(e.organization_id));

  const handleDecide = async () => {
    if (!selectedOrgId) return;
    setSaving(true);
    const res = await createSelectionDecision({
      feasibility_study_id: studyId,
      organization_id: selectedOrgId,
      decision,
      rationale: rationale.trim() || undefined,
    });
    setSaving(false);
    if (res.success) {
      toast({ title: 'Decision recorded' });
      setSelectedOrgId('');
      setRationale('');
      load();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-4">Loading...</p>;
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="text-sm font-medium mb-4">Site Selection Decisions</h3>

      {decisions.length > 0 && (
        <div className="space-y-2 mb-4">
          {decisions.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded border p-2">
              <span className="text-sm font-medium">
                {(d.organization as { name: string } | null)?.name || d.organization_id}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={decisionColors[d.decision]}>
                  {SELECTION_DECISION_LABELS[d.decision]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(d.decided_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {undecidedEvals.length > 0 && (
        <div className="space-y-3 border-t pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Site</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  {undecidedEvals.map((ev) => (
                    <SelectItem key={ev.id} value={ev.organization_id}>
                      {(ev.organization as { name: string } | null)?.name || ev.organization_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Decision</Label>
              <Select value={decision} onValueChange={(v) => setDecision(v as SelectionDecision)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SELECTION_DECISION_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Rationale</Label>
            <Textarea value={rationale} onChange={(e) => setRationale(e.target.value)} rows={2} placeholder="Decision rationale..." />
          </div>
          <Button size="sm" onClick={handleDecide} disabled={saving || !selectedOrgId}>
            {saving ? 'Recording...' : 'Record Decision'}
          </Button>
        </div>
      )}

      {undecidedEvals.length === 0 && decisions.length > 0 && (
        <p className="text-xs text-muted-foreground text-center pt-2">All sites have been decided</p>
      )}
    </div>
  );
}
