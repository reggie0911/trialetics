'use client';

import { useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Activity,
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  CircleDot,
  Clock,
  GitCompare,
  History,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type {
  EcrfTemplateChangeEvent,
  EcrfTemplateEventAction,
  EcrfTemplateVersion,
  StudyCrf,
  StudyCrfQuestion,
  StudyVisitDefinition,
} from '@/lib/types/ctms';

interface EcrfBuilderRailProps {
  activeVersion: EcrfTemplateVersion | null;
  /** Up to ~6 most recent change events for this version. */
  recentEvents: EcrfTemplateChangeEvent[];
  visits: StudyVisitDefinition[];
  crfs: StudyCrf[];
  questionsByCrfId: Record<string, StudyCrfQuestion[]>;
  questionCountByCrfId?: Record<string, number>;
  /** Opens the full Change log dialog. */
  onOpenChangeLog: () => void;
  /** Opens the Compare versions dialog. */
  onOpenCompare: () => void;
  /** Opens the Bulk import dialog (for empty-state CTA). */
  onOpenBulkImport: () => void;
  /** Opens the Add visit dialog (for empty-state CTA). */
  onAddVisit: () => void;
  /** Disabled when no draft (read-only versions). */
  canEdit: boolean;
}

const ACTION_ICON: Record<EcrfTemplateEventAction, typeof Plus> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  reorder: Activity,
  publish: CheckCircle2,
  archive: Clock,
  clone: CircleDot,
  bulk_import: Upload,
};

const ACTION_TONE: Record<EcrfTemplateEventAction, string> = {
  create: 'text-emerald-600 dark:text-emerald-400',
  update: 'text-sky-600 dark:text-sky-400',
  delete: 'text-rose-600 dark:text-rose-400',
  reorder: 'text-amber-600 dark:text-amber-400',
  publish: 'text-emerald-600 dark:text-emerald-400',
  archive: 'text-muted-foreground',
  clone: 'text-violet-600 dark:text-violet-400',
  bulk_import: 'text-violet-600 dark:text-violet-400',
};

/**
 * Right-rail companion to the eCRF Builder. Three stacked cards:
 *   1. Health snapshot — quick pulse-check tiles for the active version.
 *   2. Recent activity — last few entries from the change log.
 *   3. Quick actions   — shortcuts to compare, change log, and import.
 *
 * Renders a slimmer empty-state version when no visits exist yet.
 */
export function EcrfBuilderRail({
  activeVersion,
  recentEvents,
  visits,
  crfs,
  questionsByCrfId,
  questionCountByCrfId,
  onOpenChangeLog,
  onOpenCompare,
  onOpenBulkImport,
  onAddVisit,
  canEdit,
}: EcrfBuilderRailProps) {
  const health = useMemo(() => {
    const totalVisits = visits.length;
    const totalCrfs = crfs.length;

    const countForCrf = (crfId: string): number => {
      const fromCount = questionCountByCrfId?.[crfId];
      if (typeof fromCount === 'number') return fromCount;
      return questionsByCrfId?.[crfId]?.length ?? 0;
    };

    let totalQuestions = 0;
    for (const c of crfs) totalQuestions += countForCrf(c.id);

    const visitsMissingCrfs = visits.filter(
      (v) => crfs.filter((c) => c.visit_definition_id === v.id).length === 0
    ).length;

    const crfsMissingQuestions = crfs.filter((c) => countForCrf(c.id) === 0).length;

    return {
      totalVisits,
      totalCrfs,
      totalQuestions,
      visitsMissingCrfs,
      crfsMissingQuestions,
    };
  }, [visits, crfs, questionsByCrfId, questionCountByCrfId]);

  const isEmptyDraft = visits.length === 0 && canEdit;

  return (
    <div className="space-y-3">
      {isEmptyDraft && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Get started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>This draft is empty. Pick the path that suits you best:</p>
            <div className="flex flex-col gap-1.5">
              <Button size="sm" className="justify-start" onClick={onAddVisit}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add your first visit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="justify-start"
                onClick={onOpenBulkImport}
              >
                <Upload className="mr-1 h-3.5 w-3.5" />
                Bulk import a CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            <span>Health snapshot</span>
            {activeVersion && (
              <Badge variant="outline" className="text-[10px] uppercase">
                {activeVersion.status}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <HealthRow
            icon={CalendarRange}
            label="Visits"
            value={health.totalVisits}
            tone={health.totalVisits === 0 ? 'warn' : 'ok'}
          />
          <HealthRow
            icon={CheckCircle2}
            label="CRFs"
            value={health.totalCrfs}
            tone={health.totalCrfs === 0 ? 'warn' : 'ok'}
            sub={
              health.visitsMissingCrfs > 0
                ? `${health.visitsMissingCrfs} visit${
                    health.visitsMissingCrfs === 1 ? '' : 's'
                  } without a CRF`
                : undefined
            }
            subTone={health.visitsMissingCrfs > 0 ? 'warn' : 'ok'}
          />
          <HealthRow
            icon={Activity}
            label="Questions"
            value={health.totalQuestions}
            tone={health.totalQuestions === 0 ? 'warn' : 'ok'}
            sub={
              health.crfsMissingQuestions > 0
                ? `${health.crfsMissingQuestions} CRF${
                    health.crfsMissingQuestions === 1 ? '' : 's'
                  } empty`
                : undefined
            }
            subTone={health.crfsMissingQuestions > 0 ? 'warn' : 'ok'}
          />
          {(health.visitsMissingCrfs > 0 || health.crfsMissingQuestions > 0) && (
            <div className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                Resolve empty rows before publishing this version so subjects don&apos;t see
                gaps.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">Recent activity</CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px]"
            onClick={onOpenChangeLog}
          >
            View all
          </Button>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No edits yet for this version.
            </p>
          ) : (
            <ul className="space-y-3">
              {recentEvents.slice(0, 6).map((event) => (
                <RecentEventRow key={event.id} event={event} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="justify-start"
            onClick={onOpenCompare}
          >
            <GitCompare className="mr-2 h-3.5 w-3.5" />
            Compare versions
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="justify-start"
            onClick={onOpenChangeLog}
          >
            <History className="mr-2 h-3.5 w-3.5" />
            Open change log
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="justify-start"
            onClick={onOpenBulkImport}
            disabled={!canEdit}
          >
            <Upload className="mr-2 h-3.5 w-3.5" />
            Bulk import CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Health row ──────────────────────────────────────────────────────────────

function HealthRow({
  icon: Icon,
  label,
  value,
  tone = 'ok',
  sub,
  subTone = 'ok',
}: {
  icon: typeof Plus;
  label: string;
  value: number;
  tone?: 'ok' | 'warn';
  sub?: string;
  subTone?: 'ok' | 'warn';
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full',
            tone === 'warn'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
          )}
        >
          <Icon className="h-3 w-3" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium leading-none">{label}</p>
          {sub && (
            <p
              className={cn(
                'mt-1 text-[10px] leading-none',
                subTone === 'warn'
                  ? 'text-amber-600 dark:text-amber-300'
                  : 'text-muted-foreground'
              )}
            >
              {sub}
            </p>
          )}
        </div>
      </div>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

// ─── Recent event row ────────────────────────────────────────────────────────

function RecentEventRow({ event }: { event: EcrfTemplateChangeEvent }) {
  const Icon = ACTION_ICON[event.action];
  const tone = ACTION_TONE[event.action];
  const when = new Date(event.created_at);

  const summary = (() => {
    const what = event.entity_label || `(${event.entity_kind})`;
    switch (event.action) {
      case 'create':
        return `Added ${event.entity_kind} "${what}"`;
      case 'delete':
        return `Removed ${event.entity_kind} "${what}"`;
      case 'reorder':
        return `Reordered ${event.entity_kind} "${what}"`;
      case 'publish':
        return `Published "${what}"`;
      case 'archive':
        return `Archived "${what}"`;
      case 'clone':
        return `Cloned ${event.entity_kind} "${what}"`;
      case 'bulk_import':
        return `Bulk imported ${event.entity_kind} "${what}"`;
      case 'update':
      default:
        return event.field
          ? `Updated ${event.field} on "${what}"`
          : `Updated ${event.entity_kind} "${what}"`;
    }
  })();

  const initials = event.actor_name
    ? event.actor_name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]!.toUpperCase())
        .join('')
    : '··';

  return (
    <li className="flex items-start gap-2">
      <span className={cn('mt-0.5 flex h-5 w-5 items-center justify-center', tone)}>
        <Icon className="h-3 w-3" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs leading-snug text-foreground">{summary}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Avatar className="h-3.5 w-3.5">
            {event.actor_avatar_url ? <AvatarImage src={event.actor_avatar_url} /> : null}
            <AvatarFallback className="text-[7px]">{initials}</AvatarFallback>
          </Avatar>
          <span className="truncate">{event.actor_name ?? 'Someone'}</span>
          <span aria-hidden>·</span>
          <span title={format(when, 'PPpp')}>
            {formatDistanceToNow(when, { addSuffix: true })}
          </span>
        </div>
      </div>
    </li>
  );
}
