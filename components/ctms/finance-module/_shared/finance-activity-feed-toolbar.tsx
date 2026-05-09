'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FinanceAuditLogListFilters } from '@/lib/finance-module/activity-search-params';
import { cn } from '@/lib/utils';

/** Mirrors the compact filter row styling used in `finance-data-table.tsx`. */
export type FinanceActivityFeedFiltersState = FinanceAuditLogListFilters;

interface FinanceActivityFeedToolbarProps {
  value: FinanceActivityFeedFiltersState;
  onChange: (next: FinanceActivityFeedFiltersState) => void;
  entityTypeOptions: { value: string; label: string }[];
  actorOptions: { value: string; label: string }[];
  className?: string;
}

export function FinanceActivityFeedToolbar({
  value,
  onChange,
  entityTypeOptions,
  actorOptions,
  className,
}: FinanceActivityFeedToolbarProps) {
  const patch = (partial: Partial<FinanceActivityFeedFiltersState>) => onChange({ ...value, ...partial });

  return (
    <div className={cn('flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-end', className)}>
      <div className="flex min-w-[12rem] max-w-sm flex-1 flex-col gap-1">
        <Label className="text-[10px] text-muted-foreground">Search</Label>
        <Input
          placeholder="Search…"
          value={value.q}
          onChange={(e) => patch({ q: e.target.value })}
          className="h-8 text-xs"
        />
      </div>
      <div className="flex min-w-[9rem] flex-col gap-1">
        <Label className="text-[10px] text-muted-foreground">Entity type</Label>
        <select
          aria-label="Filter by entity type"
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          value={value.entityType}
          onChange={(e) => patch({ entityType: e.target.value })}
        >
          <option value="">All types</option>
          {entityTypeOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex min-w-[9rem] flex-col gap-1">
        <Label className="text-[10px] text-muted-foreground">Actor</Label>
        <select
          aria-label="Filter by actor"
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          value={value.actorUserId}
          onChange={(e) => patch({ actorUserId: e.target.value })}
        >
          <option value="">All actors</option>
          {actorOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex min-w-[9rem] flex-col gap-1">
        <Label className="text-[10px] text-muted-foreground">From</Label>
        <Input
          type="date"
          value={value.dateFrom}
          onChange={(e) => patch({ dateFrom: e.target.value })}
          className="h-8 text-xs"
        />
      </div>
      <div className="flex min-w-[9rem] flex-col gap-1">
        <Label className="text-[10px] text-muted-foreground">To</Label>
        <Input
          type="date"
          value={value.dateTo}
          onChange={(e) => patch({ dateTo: e.target.value })}
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}

export function filterAuditLogs(
  logs: { entity_type: string; entity_id: string; actor_user_id: string | null; action: string; created_at: string }[],
  filters: FinanceAuditLogListFilters,
  opts?: { actionPrefix?: string },
): typeof logs {
  const q = filters.q.trim().toLowerCase();
  const fromMs = filters.dateFrom ? Date.parse(`${filters.dateFrom}T00:00:00`) : null;
  const toMs = filters.dateTo ? Date.parse(`${filters.dateTo}T23:59:59.999`) : null;
  const prefix = opts?.actionPrefix;

  return logs.filter((log) => {
    if (prefix && !log.action.startsWith(prefix)) return false;
    if (filters.entityType && log.entity_type !== filters.entityType) return false;
    if (filters.actorUserId) {
      if (filters.actorUserId === '__system__') {
        if (log.actor_user_id != null) return false;
      } else if (log.actor_user_id !== filters.actorUserId) {
        return false;
      }
    }
    const t = Date.parse(log.created_at);
    if (fromMs != null && Number.isFinite(fromMs) && (Number.isNaN(t) || t < fromMs)) return false;
    if (toMs != null && Number.isFinite(toMs) && (Number.isNaN(t) || t > toMs)) return false;
    if (q) {
      const hay = `${log.action} ${log.entity_type} ${log.entity_id}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export { buildActorOptions, buildEntityTypeOptions } from '@/lib/finance-module/audit-log-options';
