'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  getRetentionMilestones,
  getSubjectRetentionStatuses,
} from '@/lib/actions/patient-engagement';
import type { RetentionMilestone, SubjectRetentionStatus } from '@/lib/types/patient-engagement';
import { RETENTION_STATUS_LABELS } from '@/lib/types/patient-engagement';

interface SubjectRetentionGridProps {
  companyId: string;
}

const statusColors: Record<string, string> = {
  on_track: 'bg-green-200 text-green-900',
  at_risk: 'bg-yellow-200 text-yellow-900',
  missed: 'bg-red-200 text-red-900',
  completed: 'bg-blue-200 text-blue-900',
  withdrawn: 'bg-gray-300 text-gray-900',
};

export function SubjectRetentionGrid({ companyId }: SubjectRetentionGridProps) {
  const [milestones, setMilestones] = useState<RetentionMilestone[]>([]);
  const [statuses, setStatuses] = useState<SubjectRetentionStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [mRes, sRes] = await Promise.all([
        getRetentionMilestones(companyId),
        getSubjectRetentionStatuses(companyId),
      ]);
      if (mRes.success && mRes.data) setMilestones(mRes.data);
      if (sRes.success && sRes.data) setStatuses(sRes.data);
      setLoading(false);
    };
    load();
  }, [companyId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading retention grid...</p>;
  }

  if (milestones.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-4">
        <p className="text-sm text-muted-foreground text-center py-4">
          Define milestones first to see the retention grid
        </p>
      </div>
    );
  }

  const subjectMap = new Map<string, Map<string, SubjectRetentionStatus>>();
  for (const s of statuses) {
    const subjectLabel = (s.subject as { subject_id: string } | null)?.subject_id || s.subject_id;
    if (!subjectMap.has(subjectLabel)) subjectMap.set(subjectLabel, new Map());
    subjectMap.get(subjectLabel)!.set(s.milestone_id, s);
  }

  const subjects = Array.from(subjectMap.keys());

  if (subjects.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-4">
        <p className="text-sm text-muted-foreground text-center py-4">
          No subject retention data available
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="text-sm font-medium mb-3">Subject x Milestone Grid</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left p-2 border-b font-medium sticky left-0 bg-white">Subject</th>
              {milestones.map((m) => (
                <th key={m.id} className="text-center p-2 border-b font-medium min-w-[100px]">
                  {m.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subjects.map((subjectLabel) => {
              const milestoneMap = subjectMap.get(subjectLabel)!;
              return (
                <tr key={subjectLabel}>
                  <td className="p-2 border-b font-medium sticky left-0 bg-white">{subjectLabel}</td>
                  {milestones.map((m) => {
                    const s = milestoneMap.get(m.id);
                    return (
                      <td key={m.id} className="p-2 border-b text-center">
                        {s ? (
                          <Badge variant="outline" className={`text-[10px] ${statusColors[s.status]}`}>
                            {RETENTION_STATUS_LABELS[s.status]}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
