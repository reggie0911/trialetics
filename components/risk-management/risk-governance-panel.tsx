'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { updateProtocolRisk } from '@/lib/actions/protocol-risks';
import type { ProtocolRisk } from '@/lib/types/risk-management';
import { RISK_LEVEL_LABELS, RISK_STATUS_LABELS } from '@/lib/types/risk-management';

interface RiskGovernancePanelProps {
  risks: ProtocolRisk[];
  onRefresh: () => void;
}

const levelColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
};

export function RiskGovernancePanel({ risks, onRefresh }: RiskGovernancePanelProps) {
  const { toast } = useToast();
  const [markingId, setMarkingId] = useState<string | null>(null);

  const dueForReview = risks.filter((r) => {
    if (r.status === 'closed' || r.status === 'resolved') return false;
    if (!r.governance_review_date) return true;
    const reviewDate = new Date(r.governance_review_date);
    const now = new Date();
    return reviewDate <= now;
  });

  const recentlyReviewed = risks.filter((r) => {
    if (!r.last_reviewed_at) return false;
    const reviewedAt = new Date(r.last_reviewed_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return reviewedAt >= thirtyDaysAgo;
  });

  const handleMarkReviewed = async (risk: ProtocolRisk) => {
    setMarkingId(risk.id);
    const now = new Date().toISOString();
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + 30);

    const res = await updateProtocolRisk(risk.id, {
      // @ts-expect-error: Enhanced fields added by migration
      last_reviewed_at: now,
      governance_review_date: nextReview.toISOString().split('T')[0],
    });
    setMarkingId(null);
    if (res.success) {
      toast({ title: 'Marked as reviewed' });
      onRefresh();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-medium mb-3">Due for Governance Review ({dueForReview.length})</h3>
        {dueForReview.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">All risks are up to date</p>
        ) : (
          <div className="space-y-2">
            {dueForReview.map((risk) => (
              <div key={risk.id} className="flex items-center justify-between rounded border p-3">
                <div className="flex items-center gap-3">
                  {risk.risk_level && (
                    <Badge variant="outline" className={levelColors[risk.risk_level]}>
                      {RISK_LEVEL_LABELS[risk.risk_level]}
                    </Badge>
                  )}
                  <div>
                    <p className="text-sm font-medium">{risk.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {risk.governance_review_date
                        ? `Due: ${new Date(risk.governance_review_date).toLocaleDateString()}`
                        : 'Never reviewed'}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={markingId === risk.id}
                  onClick={() => handleMarkReviewed(risk)}
                >
                  {markingId === risk.id ? '...' : 'Mark Reviewed'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-medium mb-3">Recently Reviewed ({recentlyReviewed.length})</h3>
        {recentlyReviewed.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No recent reviews</p>
        ) : (
          <div className="space-y-2">
            {recentlyReviewed.map((risk) => (
              <div key={risk.id} className="flex items-center justify-between rounded border p-3">
                <div className="flex items-center gap-3">
                  {risk.risk_level && (
                    <Badge variant="outline" className={levelColors[risk.risk_level]}>
                      {RISK_LEVEL_LABELS[risk.risk_level]}
                    </Badge>
                  )}
                  <div>
                    <p className="text-sm font-medium">{risk.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Reviewed: {risk.last_reviewed_at ? new Date(risk.last_reviewed_at).toLocaleDateString() : '—'}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700">Reviewed</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
