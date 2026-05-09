'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  buildActorOptions,
  buildEntityTypeOptions,
  FinanceActivityFeedToolbar,
  filterAuditLogs,
  type FinanceActivityFeedFiltersState,
} from '@/components/ctms/finance-module/_shared/finance-activity-feed-toolbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buildFinanceAuditEntityHref } from '@/lib/finance-module/audit-entity-links';
import type { FmAuditLog } from '@/lib/finance-module/types';

interface ApprovalsRecentActivityProps {
  studyId: string;
  logs: FmAuditLog[];
}

const ACTION_LABELS: Record<string, string> = {
  approval_approve: 'Approved',
  approval_reject: 'Rejected',
  approval_escalate: 'Escalated',
};

const DEFAULT_FILTERS: FinanceActivityFeedFiltersState = {
  q: '',
  entityType: '',
  actorUserId: '',
  dateFrom: '',
  dateTo: '',
};

export function ApprovalsRecentActivity({ studyId, logs }: ApprovalsRecentActivityProps) {
  const [filters, setFilters] = useState<FinanceActivityFeedFiltersState>(DEFAULT_FILTERS);

  const entityTypeOptions = useMemo(() => buildEntityTypeOptions(logs), [logs]);
  const actorOptions = useMemo(() => buildActorOptions(logs), [logs]);
  const filtered = useMemo(
    () => filterAuditLogs(logs, filters, { actionPrefix: 'approval_' }),
    [logs, filters],
  );

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
        <FinanceActivityFeedToolbar
          value={filters}
          onChange={setFilters}
          entityTypeOptions={entityTypeOptions}
          actorOptions={actorOptions}
        />
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No approval activity yet. Activity will appear after approvals are recorded.
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">No rows match the current filters.</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((log) => {
              const href = buildFinanceAuditEntityHref(studyId, log.entity_type, log.entity_id);
              return (
                <li
                  key={`${log.entity_type}-${log.entity_id}-${log.created_at}-${log.action}-${log.actor_user_id ?? ''}`}
                  className="border-b border-border last:border-0 pb-1.5 last:pb-0 space-y-0.5"
                >
                  <div className="text-xs font-medium">
                    {ACTION_LABELS[log.action] ?? log.action.replace(/_/g, ' ')}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">{log.entity_type}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                  {href ? (
                    <Link
                      href={href}
                      className="inline-block text-[11px] text-primary underline-offset-2 hover:underline"
                      scroll={false}
                    >
                      Open entity
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
