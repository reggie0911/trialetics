'use client';

import type { ComponentType } from 'react';
import {
  Building2,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  Mail,
  MoreHorizontal,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkline } from '@/components/ctms/shared/stat-card';
import { cn } from '@/lib/utils';
import type {
  ActivityAttentionItem,
  ActivitySummary,
} from '@/lib/directory/live-directory-types';

interface DirectoryActivityRightRailProps {
  summary: ActivitySummary;
  attention: ActivityAttentionItem[];
  insightsTrend: number[];
  insightsTicks: string[];
  insightsTotalLabel: string;
  onAttentionAction?: (item: ActivityAttentionItem) => void;
}

function SummaryRow({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'risk' | 'link';
}) {
  const valueClass =
    tone === 'risk'
      ? 'text-orange-600 dark:text-orange-400 font-medium'
      : tone === 'link'
        ? 'text-sky-600 dark:text-sky-400 font-medium'
        : 'text-foreground font-medium';
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('truncate text-right tabular-nums', valueClass)}>{value}</span>
    </div>
  );
}

function QuickActionRow({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <span className="flex items-center gap-2 min-w-0">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-xs text-foreground">{label}</span>
      </span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}

export function DirectoryActivityRightRail({
  summary,
  attention,
  insightsTrend,
  insightsTicks,
  insightsTotalLabel,
  onAttentionAction,
}: DirectoryActivityRightRailProps) {
  const handleAttention = (item: ActivityAttentionItem) => {
    if (onAttentionAction) onAttentionAction(item);
    else toast.message('Use the existing Directory filters and detail pages to review this issue.');
  };

  return (
    <div className="space-y-4" aria-label="Activity insights">
      <Card className="py-0">
        <CardHeader className="px-4 pt-3 pb-2">
          <CardTitle className="text-sm font-medium text-foreground">Activity Summary</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-3 pt-0 space-y-0">
          <SummaryRow label="Last Activity" value={summary.lastActivityAt} />
          <SummaryRow label="Last Visit" value={summary.lastVisit} tone="link" />
          <SummaryRow label="Last Study Activity" value={summary.lastStudyActivity} />
          <SummaryRow label="Last Site Activity" value={summary.lastSiteActivity} />
          <SummaryRow
            label="Inactivity Warning"
            value={`${summary.inactivityDays} days`}
            tone={summary.inactivityRisk === 'at_risk' ? 'risk' : 'default'}
          />
          <div className="px-4 pt-2">
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs text-sky-600 dark:text-sky-400"
              onClick={() => toast.message('The engagement trend is based on live audit and assignment history.')}
            >
              View engagement trend
              <TrendingUp className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="py-0 border-l-2 border-l-red-500/70">
        <CardHeader className="px-4 pt-3 pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between gap-2 text-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
              Needs Attention
            </span>
            {attention.length > 0 ? (
              <Badge variant="destructive" className="text-[10px] px-1.5">
                {attention.length}
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3 pt-0 space-y-1">
          {attention.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">Nothing needs attention right now.</p>
          ) : (
            attention.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground leading-tight">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                    {item.subtitle}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-[11px] text-sky-600 dark:text-sky-400 shrink-0"
                  onClick={() => handleAttention(item)}
                >
                  {item.ctaLabel}
                </Button>
              </div>
            ))
          )}
          <div className="px-2 pt-1">
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs text-sky-600 dark:text-sky-400"
              onClick={() => toast.message('All live activity issues are listed in this panel.')}
            >
              View all issues
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader className="px-4 pt-3 pb-2">
          <CardTitle className="text-sm font-medium text-foreground">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3 pt-0 space-y-0.5">
          <QuickActionRow icon={ClipboardList} label="Log visit" onClick={() => toast.message('Log visit — coming soon')} />
          <QuickActionRow icon={Building2} label="Assign to site" onClick={() => toast.message('Assign to site — coming soon')} />
          <QuickActionRow icon={GraduationCap} label="Assign to study" onClick={() => toast.message('Assign to study — coming soon')} />
          <QuickActionRow icon={CheckSquare} label="Create task" onClick={() => toast.message('Create task — coming soon')} />
          <QuickActionRow icon={Mail} label="Send email" onClick={() => toast.message('Send email — coming soon')} />
          <QuickActionRow icon={MoreHorizontal} label="More actions" onClick={() => toast.message('More actions — coming soon')} />
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader className="px-4 pt-3 pb-2">
          <CardTitle className="text-sm font-medium text-foreground">Activity Insights</CardTitle>
          <p className="text-[11px] text-muted-foreground">Activity over time · {insightsTotalLabel}</p>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0">
          <Sparkline
            data={insightsTrend}
            strokeClassName="stroke-sky-500"
            fillClassName="fill-sky-500/15"
            pointClassName="fill-sky-500"
          />
          <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
            {insightsTicks.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
