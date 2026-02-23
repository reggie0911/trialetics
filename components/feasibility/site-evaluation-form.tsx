'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  getCriteria,
  getScores,
  saveScore,
  updateEvaluation,
} from '@/lib/actions/feasibility';
import type {
  FeasibilitySiteEvaluation,
  FeasibilityCriterion,
  FeasibilityCriterionScore,
} from '@/lib/types/feasibility';
import { CRITERIA_CATEGORY_LABELS } from '@/lib/types/feasibility';

interface SiteEvaluationFormProps {
  evaluation: FeasibilitySiteEvaluation;
  studyId: string;
  onBack: () => void;
}

interface ScoreEntry {
  score: string;
  justification: string;
}

export function SiteEvaluationForm({ evaluation, studyId, onBack }: SiteEvaluationFormProps) {
  const { toast } = useToast();
  const [criteria, setCriteria] = useState<FeasibilityCriterion[]>([]);
  const [scoreEntries, setScoreEntries] = useState<Record<string, ScoreEntry>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(evaluation.notes || '');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [criteriaRes, scoresRes] = await Promise.all([
        getCriteria(studyId),
        getScores(evaluation.id),
      ]);

      const criteriaData = criteriaRes.success ? criteriaRes.data || [] : [];
      const scoresData = scoresRes.success ? scoresRes.data || [] : [];

      setCriteria(criteriaData);

      const entries: Record<string, ScoreEntry> = {};
      const scoreMap = new Map<string, FeasibilityCriterionScore>();
      for (const s of scoresData) scoreMap.set(s.criterion_id, s);

      for (const c of criteriaData) {
        const existing = scoreMap.get(c.id);
        entries[c.id] = {
          score: existing ? existing.score.toString() : '',
          justification: existing?.justification || '',
        };
      }
      setScoreEntries(entries);
      setLoading(false);
    };
    load();
  }, [studyId, evaluation.id]);

  const handleSaveAll = async () => {
    setSaving(true);
    let hasError = false;
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const c of criteria) {
      const entry = scoreEntries[c.id];
      if (!entry?.score) continue;

      const score = parseInt(entry.score);
      if (isNaN(score) || score < 0 || score > c.max_score) continue;

      const res = await saveScore({
        evaluation_id: evaluation.id,
        criterion_id: c.id,
        score,
        justification: entry.justification || undefined,
      });
      if (!res.success) hasError = true;

      totalWeightedScore += score * c.weight;
      totalWeight += c.max_score * c.weight;
    }

    const overallScore = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0;
    await updateEvaluation(evaluation.id, {
      overall_score: Math.round(overallScore * 10) / 10,
      status: 'scored',
      notes: notes || null,
    });

    setSaving(false);
    if (hasError) {
      toast({ title: 'Some scores failed to save', variant: 'destructive' });
    } else {
      toast({ title: 'Scores saved successfully' });
    }
    onBack();
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading criteria...</p>;
  }

  const siteName = (evaluation.organization as { name: string } | null)?.name || evaluation.organization_id;

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-1">&larr; Back</Button>
          <h3 className="text-sm font-medium">Scoring: {siteName}</h3>
        </div>
        <Button size="sm" onClick={handleSaveAll} disabled={saving}>
          {saving ? 'Saving...' : 'Save All Scores'}
        </Button>
      </div>

      <div className="space-y-4">
        {criteria.map((c) => {
          const entry = scoreEntries[c.id] || { score: '', justification: '' };
          return (
            <div key={c.id} className="rounded border p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {CRITERIA_CATEGORY_LABELS[c.category]} | Weight: {c.weight} | Max: {c.max_score}
                  </p>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={c.max_score}
                  className="w-20"
                  value={entry.score}
                  onChange={(e) =>
                    setScoreEntries({
                      ...scoreEntries,
                      [c.id]: { ...entry, score: e.target.value },
                    })
                  }
                  placeholder={`0-${c.max_score}`}
                />
              </div>
              <Input
                className="text-xs"
                value={entry.justification}
                onChange={(e) =>
                  setScoreEntries({
                    ...scoreEntries,
                    [c.id]: { ...entry, justification: e.target.value },
                  })
                }
                placeholder="Justification (optional)"
              />
            </div>
          );
        })}

        <div className="space-y-1">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Overall notes..." />
        </div>
      </div>
    </div>
  );
}
