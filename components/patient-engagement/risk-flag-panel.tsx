'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  getSubjectRiskFlags,
  resolveSubjectRiskFlag,
} from '@/lib/actions/patient-engagement';
import type { SubjectRiskFlag } from '@/lib/types/patient-engagement';
import { SEVERITY_LABELS } from '@/lib/types/patient-engagement';

interface RiskFlagPanelProps {
  companyId: string;
  onRefresh: () => void;
}

const severityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

export function RiskFlagPanel({ companyId, onRefresh }: RiskFlagPanelProps) {
  const { toast } = useToast();
  const [flags, setFlags] = useState<SubjectRiskFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await getSubjectRiskFlags(companyId, {
      unresolvedOnly: !showResolved,
    });
    if (res.success && res.data) setFlags(res.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [companyId, showResolved]);

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    const res = await resolveSubjectRiskFlag(id);
    setResolvingId(null);
    if (res.success) {
      toast({ title: 'Risk flag resolved' });
      load();
      onRefresh();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium">Subject Risk Flags</h3>
          <p className="text-xs text-muted-foreground">
            {showResolved ? 'All flags' : 'Unresolved flags only'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowResolved(!showResolved)}
        >
          {showResolved ? 'Hide Resolved' : 'Show Resolved'}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
      ) : flags.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No {showResolved ? '' : 'unresolved '}risk flags
        </p>
      ) : (
        <div className="space-y-2">
          {flags.map((flag) => {
            const riskFactor = flag.risk_factor;
            const subject = flag.subject as { subject_id: string } | null;
            return (
              <div key={flag.id} className="flex items-center justify-between rounded border p-3">
                <div className="flex items-center gap-3">
                  {riskFactor?.severity && (
                    <Badge variant="outline" className={severityColors[riskFactor.severity]}>
                      {SEVERITY_LABELS[riskFactor.severity]}
                    </Badge>
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {subject?.subject_id || flag.subject_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {riskFactor?.name || 'Unknown risk factor'}
                    </p>
                    {flag.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">{flag.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(flag.flagged_at).toLocaleDateString()}
                  </span>
                  {flag.resolved_at ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700">Resolved</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resolvingId === flag.id}
                      onClick={() => handleResolve(flag.id)}
                    >
                      {resolvingId === flag.id ? '...' : 'Resolve'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
