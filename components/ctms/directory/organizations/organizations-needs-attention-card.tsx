'use client';

import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  Clock,
  TrendingDown,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { OrgAttentionKey, OrgAttentionRow } from '@/lib/directory/live-directory-types';
import { DirectoryEmptyState } from '@/components/ctms/directory/directory-empty-state';

const ICON_BY_KEY: Record<OrgAttentionKey, { icon: LucideIcon; color: string }> = {
  sites_below_50: { icon: TrendingDown, color: 'text-red-500' },
  no_visit_60: { icon: Clock, color: 'text-amber-500' },
  orgs_unassigned: { icon: Building2, color: 'text-orange-500' },
};

interface OrganizationsNeedsAttentionCardProps {
  rows: OrgAttentionRow[];
  onSelect?: (key: OrgAttentionKey) => void;
}

export function OrganizationsNeedsAttentionCard({
  rows,
  onSelect,
}: OrganizationsNeedsAttentionCardProps) {
  const total = rows.reduce((acc, r) => acc + r.count, 0);

  return (
    <Card>
      <CardHeader className="space-y-1 py-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center justify-between gap-2">
          <span className="text-foreground inline-flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Needs Attention
          </span>
          {total > 0 ? (
            <Badge variant="destructive" className="text-[10px] px-1.5">
              {total}
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-3 pt-0 space-y-0.5">
        {rows.length === 0 ? (
          <DirectoryEmptyState
            title="No organization issues"
            description="Live organization checks have nothing to flag right now."
            className="border-0 bg-transparent py-4"
          />
        ) : rows.map((row) => {
          const meta = ICON_BY_KEY[row.key] ?? { icon: AlertTriangle, color: 'text-muted-foreground' };
          const Icon = meta.icon;
          const Wrapper = onSelect ? 'button' : 'div';
          return (
            <Wrapper
              key={row.key}
              type={onSelect ? 'button' : undefined}
              onClick={onSelect ? () => onSelect(row.key) : undefined}
              className={cn(
                'w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left',
                onSelect && 'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                !onSelect && 'cursor-default'
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <Icon className={cn('h-3.5 w-3.5 shrink-0', meta.color)} />
                <span className="text-xs text-foreground line-clamp-2">{row.label}</span>
              </span>
              <span className="text-xs font-semibold tabular-nums text-foreground shrink-0">
                {row.count}
              </span>
            </Wrapper>
          );
        })}
        <div className="px-2 pt-1.5">
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-xs text-sky-600 dark:text-sky-400"
            onClick={() => {
              const first = rows.find((r) => r.count > 0) ?? rows[0];
              if (first) onSelect?.(first.key);
            }}
            disabled={rows.length === 0}
          >
            View all issues
            <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
