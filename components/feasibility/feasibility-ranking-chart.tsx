'use client';

import { useEffect, useState } from 'react';
import { getFeasibilityRankings } from '@/lib/actions/feasibility';
import type { FeasibilityRanking } from '@/lib/types/feasibility';
import { SELECTION_DECISION_LABELS } from '@/lib/types/feasibility';
import { Badge } from '@/components/ui/badge';

interface FeasibilityRankingChartProps {
  studyId: string;
}

const decisionColors: Record<string, string> = {
  selected: 'bg-green-100 text-green-800',
  backup: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  deferred: 'bg-yellow-100 text-yellow-800',
};

export function FeasibilityRankingChart({ studyId }: FeasibilityRankingChartProps) {
  const [rankings, setRankings] = useState<FeasibilityRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await getFeasibilityRankings(studyId);
      if (res.success && res.data) setRankings(res.data);
      setLoading(false);
    };
    load();
  }, [studyId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground py-4">Loading rankings...</p>;
  }

  if (rankings.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-medium mb-2">Site Rankings</h3>
        <p className="text-sm text-muted-foreground text-center py-4">
          No scored evaluations yet
        </p>
      </div>
    );
  }

  const maxScore = Math.max(...rankings.map((r) => r.weighted_score), 1);

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="text-sm font-medium mb-4">Site Rankings (by Weighted Score)</h3>
      <div className="space-y-3">
        {rankings.map((r, idx) => (
          <div key={r.organization_id} className="flex items-center gap-3">
            <span className="w-6 text-sm font-bold text-muted-foreground">#{idx + 1}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.organization_name}</span>
                  {r.decision && (
                    <Badge variant="outline" className={decisionColors[r.decision]}>
                      {SELECTION_DECISION_LABELS[r.decision]}
                    </Badge>
                  )}
                </div>
                <span className="text-sm font-semibold">{r.weighted_score.toFixed(1)}%</span>
              </div>
              <div className="h-4 w-full rounded-full bg-gray-100">
                <div
                  className="h-4 rounded-full bg-primary transition-all"
                  style={{ width: `${(r.weighted_score / maxScore) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
