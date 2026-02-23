'use client';

import { useEffect, useState } from 'react';
import { getFeasibilityRankings } from '@/lib/actions/feasibility';
import type { FeasibilityRanking } from '@/lib/types/feasibility';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface FeasibilityComparisonViewProps {
  studyId: string;
}

export function FeasibilityComparisonView({ studyId }: FeasibilityComparisonViewProps) {
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
    return <p className="text-sm text-muted-foreground py-4">Loading comparison...</p>;
  }

  if (rankings.length === 0) {
    return null;
  }

  const criteriaNames = rankings[0]?.criteria_scores.map((cs) => cs.criterion_name) || [];

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="text-sm font-medium mb-4">Side-by-Side Comparison</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-white">Criterion</TableHead>
              {rankings.map((r) => (
                <TableHead key={r.organization_id} className="text-center min-w-[120px]">
                  {r.organization_name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {criteriaNames.map((name, idx) => (
              <TableRow key={name}>
                <TableCell className="sticky left-0 bg-white font-medium text-sm">{name}</TableCell>
                {rankings.map((r) => {
                  const cs = r.criteria_scores[idx];
                  if (!cs) return <TableCell key={r.organization_id} className="text-center">—</TableCell>;
                  const pct = cs.max > 0 ? (cs.score / cs.max) * 100 : 0;
                  const colorClass =
                    pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-yellow-700' : 'text-red-700';
                  return (
                    <TableCell key={r.organization_id} className={`text-center font-medium ${colorClass}`}>
                      {cs.score}/{cs.max}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            <TableRow className="font-bold border-t-2">
              <TableCell className="sticky left-0 bg-white">Weighted Score</TableCell>
              {rankings.map((r) => (
                <TableCell key={r.organization_id} className="text-center">
                  {r.weighted_score.toFixed(1)}%
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
