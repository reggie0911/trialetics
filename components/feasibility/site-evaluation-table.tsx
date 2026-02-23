'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getEvaluations, createEvaluation } from '@/lib/actions/feasibility';
import type { FeasibilitySiteEvaluation } from '@/lib/types/feasibility';
import { EVALUATION_STATUS_LABELS } from '@/lib/types/feasibility';
import { SiteEvaluationForm } from './site-evaluation-form';

interface SiteEvaluationTableProps {
  studyId: string;
  companyId: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  scored: 'bg-purple-100 text-purple-800',
  selected: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export function SiteEvaluationTable({ studyId, companyId }: SiteEvaluationTableProps) {
  const { toast } = useToast();
  const [evaluations, setEvaluations] = useState<FeasibilitySiteEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState('');
  const [adding, setAdding] = useState(false);
  const [scoringEval, setScoringEval] = useState<FeasibilitySiteEvaluation | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await getEvaluations(studyId);
    if (res.success && res.data) setEvaluations(res.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [studyId]);

  const handleAddSite = async () => {
    if (!orgId.trim()) return;
    setAdding(true);
    const res = await createEvaluation({
      feasibility_study_id: studyId,
      organization_id: orgId.trim(),
    });
    setAdding(false);
    if (res.success) {
      setOrgId('');
      toast({ title: 'Site added for evaluation' });
      load();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  if (scoringEval) {
    return (
      <SiteEvaluationForm
        evaluation={scoringEval}
        studyId={studyId}
        onBack={() => {
          setScoringEval(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Site Evaluations ({evaluations.length})</h3>
        <div className="flex gap-2">
          <Input
            className="w-64"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            placeholder="Organization ID to add"
          />
          <Button size="sm" onClick={handleAddSite} disabled={adding || !orgId.trim()}>
            Add Site
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-4">Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Evaluated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evaluations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No sites added for evaluation yet
                </TableCell>
              </TableRow>
            ) : (
              evaluations.map((ev) => (
                <TableRow key={ev.id}>
                  <TableCell className="font-medium">
                    {(ev.organization as { name: string } | null)?.name || ev.organization_id}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[ev.status]}>
                      {EVALUATION_STATUS_LABELS[ev.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ev.overall_score != null ? ev.overall_score.toFixed(1) : '—'}
                  </TableCell>
                  <TableCell>
                    {ev.evaluated_at ? new Date(ev.evaluated_at).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setScoringEval(ev)}>
                      Score
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
