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
  LayoutDashboard,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
        <Card className="flex flex-col border-dashed border-border/70 py-0 shadow-none">
          <div className="px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300"
              >
                <Sparkles className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <h3
                  data-slot="card-title"
                  className="!text-[12px] font-medium leading-tight text-foreground"
                >
                  Get started
                </h3>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  This draft is empty — add a visit or import your structure to begin.
                </p>
              </div>
            </div>
          </div>
          <div className="px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
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
          </div>
        </Card>
      )}

      <Card className="flex flex-col border-border/70 py-0 shadow-none">
        <div className="px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
            >
              <LayoutDashboard className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3
                  data-slot="card-title"
                  className="!text-[12px] font-medium leading-tight text-foreground"
                >
                  Health snapshot
                </h3>
                {activeVersion ? (
                  <Badge
                    variant="outline"
                    className="h-5 shrink-0 text-[10px] font-medium uppercase"
                  >
                    {activeVersion.status}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                Visits, CRFs, and questions for the version you are editing
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
          <div className="space-y-2.5">
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
                  Resolve empty rows before publishing this version so subjects don&apos;t
                  see gaps.
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="flex flex-col border-border/70 py-0 shadow-none">
        <div className="px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300"
            >
              <History className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3
                  data-slot="card-title"
                  className="!text-[12px] font-medium leading-tight text-foreground"
                >
                  Recent activity
                </h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 text-[11px] font-medium"
                  onClick={onOpenChangeLog}
                >
                  <History className="mr-1.5 h-3.5 w-3.5" />
                  View all
                </Button>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                Edits in this eCRF version, newest first
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
          {recentEvents.length === 0 ? (
            <p className="py-6 text-center text-[11px] leading-relaxed text-muted-foreground sm:py-8">
              No edits yet for this version.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {recentEvents.slice(0, 6).map((event) => (
                <RecentEventRow key={event.id} event={event} />
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="flex flex-col border-border/70 py-0 shadow-none">
        <div className="px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
            >
              <Zap className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1">
              <h3
                data-slot="card-title"
                className="!text-[12px] font-medium leading-tight text-foreground"
              >
                Quick actions
              </h3>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                Compare versions, read the log, or bring in a CSV
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
          <div className="flex flex-col gap-1.5">
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
          </div>
        </div>
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
          <p className="text-[11px] font-medium leading-snug">{label}</p>
          {sub && (
            <p
              className={cn(
                'mt-1 text-[10px] leading-tight',
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
      <span className="text-[12px] font-semibold tabular-nums text-foreground">{value}</span>
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
        <p className="text-[11px] leading-snug text-foreground">{summary}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] leading-tight text-muted-foreground">
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
