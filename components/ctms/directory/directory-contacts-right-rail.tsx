'use client';

import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Check,
  ChevronRight,
  Clock,
  Lightbulb,
  PanelRight,
  UserX,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DirectoryContactsSnapshot } from '@/lib/types/directory';
import { DirectoryEmptyState } from '@/components/ctms/directory/directory-empty-state';

function CovIcon({ state }: { state: 'ok' | 'partial' | 'missing' }) {
  if (state === 'ok') return <Check className="h-3.5 w-3.5 text-emerald-600" aria-label="Yes" />;
  if (state === 'partial')
    return <AlertCircle className="h-3.5 w-3.5 text-amber-500" aria-label="Partial" />;
  return <X className="h-3.5 w-3.5 text-red-500/80" aria-label="No" />;
}

function AttentionRow({
  icon: Icon,
  iconColor,
  label,
  count,
  onClick,
}: {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  count: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left',
        onClick && 'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        !onClick && 'cursor-default'
      )}
    >
      <span className="flex items-center gap-2 min-w-0">
        <Icon className={cn('h-3.5 w-3.5 shrink-0', iconColor)} />
        <span className="text-xs text-foreground line-clamp-2">{label}</span>
      </span>
      <span className="text-xs font-semibold tabular-nums text-foreground shrink-0">{count}</span>
    </button>
  );
}

function SuggestionItem({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'w-full text-left rounded-lg border border-border/70 bg-background px-2.5 py-2 transition-colors',
        onClick
          ? 'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          : 'cursor-default'
      )}
    >
      <p className="text-xs font-medium text-foreground leading-tight">{title}</p>
      {subtitle ? <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p> : null}
    </button>
  );
}

export function DirectoryContactsRightRail({
  snapshot,
  onNeedsAttention,
  onSuggestion,
  onRoleRowClick,
}: {
  snapshot: DirectoryContactsSnapshot | null;
  onNeedsAttention: (key: 'missing' | 'sites' | 'inactive' | 'sites-missing-key') => void;
  onSuggestion: (id: string) => void;
  onRoleRowClick: (siteId: string) => void;
}) {
  if (!snapshot) {
    return (
      <div className="text-xs text-muted-foreground p-2 border rounded-lg bg-muted/20" aria-hidden>
        Loading…
      </div>
    );
  }

  const s = snapshot;
  const noActivity90 = Math.max(0, Math.round((s.totalContacts - s.recentlyActive7d) * 0.05));
  const totalAttention =
    s.needsAttention.missingRoleCount +
    s.unassignedToSite +
    noActivity90 +
    s.needsAttention.sitesMissingKeyRoles;

  return (
    <div className="space-y-4" aria-label="Directory insights">
      <Card>
        <CardHeader className="space-y-1 py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center justify-between gap-2">
            <span className="text-foreground">Needs Attention</span>
            {totalAttention > 0 ? (
              <Badge variant="destructive" className="text-[10px] px-1.5">
                {totalAttention}
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3 pt-0 space-y-0.5">
          <AttentionRow
            icon={UserX}
            iconColor="text-red-500"
            label="Contacts missing role"
            count={s.needsAttention.missingRoleCount}
            onClick={() => onNeedsAttention('missing')}
          />
          <AttentionRow
            icon={Building2}
            iconColor="text-orange-500"
            label="Unassigned to site"
            count={s.unassignedToSite}
            onClick={() => onNeedsAttention('sites')}
          />
          <AttentionRow
            icon={Clock}
            iconColor="text-blue-500"
            label="No activity in 90+ days"
            count={noActivity90}
            onClick={() => onNeedsAttention('inactive')}
          />
          <AttentionRow
            icon={AlertTriangle}
            iconColor="text-amber-500"
            label="Sites missing key roles"
            count={s.needsAttention.sitesMissingKeyRoles}
            onClick={() => onNeedsAttention('sites-missing-key')}
          />
          <div className="px-2 pt-1.5">
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs text-sky-600 dark:text-sky-400"
              onClick={() => onNeedsAttention('missing')}
            >
              View all issues
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium text-foreground">Role Coverage by Site</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {s.roleCoverageBySite.length === 0 ? (
            <p className="px-4 text-xs text-muted-foreground">No site links yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs caption-bottom">
                <thead>
                  <tr className="border-b border-border text-[10px] text-muted-foreground text-left">
                    <th className="px-3 py-1.5 font-medium">Site</th>
                    <th className="px-1 py-1.5 font-medium text-center w-7" title="Principal Investigator">
                      PI
                    </th>
                    <th className="px-1 py-1.5 font-medium text-center w-7" title="Clinical Research Coordinator">
                      CRC
                    </th>
                    <th className="px-1 py-1.5 font-medium text-center w-7" title="Sub-Investigator">
                      Sub-I
                    </th>
                    <th className="px-1 py-1.5 font-medium text-center w-7" title="Research Nurse">
                      RN
                    </th>
                    <th className="px-1 py-1.5 pr-3 font-medium text-center w-7" title="Pharmacy">
                      Pharm
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {s.roleCoverageBySite.map((r) => (
                    <tr key={r.siteId} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-1.5 max-w-[7.5rem]">
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-xs font-normal line-clamp-2 whitespace-normal break-words text-left text-foreground hover:text-sky-600"
                          onClick={() => onRoleRowClick(r.siteId)}
                        >
                          {r.siteName}
                        </Button>
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        <CovIcon state={r.hasPi ? 'ok' : 'missing'} />
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        <CovIcon state={r.hasCrc ? 'ok' : 'partial'} />
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        <CovIcon state={r.hasSubI ? 'ok' : 'partial'} />
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        <CovIcon state={r.hasRn ? 'ok' : 'partial'} />
                      </td>
                      <td className="px-1 py-1.5 pr-3 text-center">
                        <CovIcon state={r.hasPharm ? 'ok' : 'missing'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-4 pt-2">
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs text-sky-600 dark:text-sky-400"
              onClick={() => onRoleRowClick(s.roleCoverageBySite[0]?.siteId ?? '')}
              disabled={s.roleCoverageBySite.length === 0}
            >
              View all sites
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium inline-flex items-center gap-1.5">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Smart Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          {s.smartSuggestionFilters.length === 0 ? (
            <DirectoryEmptyState
              title="No suggestions"
              description="Live suggestions appear when contacts need assignments or role updates."
              className="border-0 bg-transparent py-4"
            />
          ) : s.smartSuggestionFilters.map((item) => (
            <SuggestionItem
              key={item.id}
              title={item.label}
              subtitle={item.subtitle}
              onClick={() => onSuggestion(item.id)}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function RightRailOnMobileHint() {
  return (
    <p className="xl:hidden text-[10px] text-muted-foreground flex items-center gap-1.5">
      <PanelRight className="h-3.5 w-3.5" />
      Insights and coverage appear below the table on this screen.
    </p>
  );
}
