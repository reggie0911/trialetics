'use client';

import { useEffect, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Activity,
  CheckCircle2,
  CircleDot,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { listTemplateChangeEvents } from '@/lib/actions/study-ecrf-change-log';
import type {
  EcrfTemplateChangeEvent,
  EcrfTemplateEventAction,
  EcrfTemplateEventEntityKind,
} from '@/lib/types/ctms';
import { cn } from '@/lib/utils';

interface EcrfChangeLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string;
  versionId: string | null;
  versionLabel: string;
}

const ENTITY_LABELS: Record<EcrfTemplateEventEntityKind | 'all', string> = {
  all: 'All entities',
  version: 'Versions',
  visit: 'Visits',
  crf: 'CRFs',
  question: 'Questions',
};

const ACTION_LABELS: Record<EcrfTemplateEventAction | 'all', string> = {
  all: 'All actions',
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  reorder: 'Reordered',
  publish: 'Published',
  archive: 'Archived',
  clone: 'Cloned',
  bulk_import: 'Bulk imported',
};

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
  create: 'text-emerald-600',
  update: 'text-sky-600',
  delete: 'text-rose-600',
  reorder: 'text-amber-600',
  publish: 'text-emerald-600',
  archive: 'text-muted-foreground',
  clone: 'text-violet-600',
  bulk_import: 'text-violet-600',
};

const PAGE_SIZE = 50;

export function EcrfChangeLogDialog({
  open,
  onOpenChange,
  studyId,
  versionId,
  versionLabel,
}: EcrfChangeLogDialogProps) {
  const [entity, setEntity] = useState<EcrfTemplateEventEntityKind | 'all'>('all');
  const [action, setAction] = useState<EcrfTemplateEventAction | 'all'>('all');
  const [events, setEvents] = useState<EcrfTemplateChangeEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset filters when (re)opening or switching versions.
  useEffect(() => {
    if (!open) return;
    setEntity('all');
    setAction('all');
    setOffset(0);
  }, [open, versionId]);

  useEffect(() => {
    if (!open || !versionId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listTemplateChangeEvents({
      studyId,
      versionId,
      entityKind: entity === 'all' ? undefined : entity,
      action: action === 'all' ? undefined : action,
      limit: PAGE_SIZE,
      offset,
    })
      .then((res) => {
        if (cancelled) return;
        setEvents(res.events);
        setTotal(res.total);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load change log.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, studyId, versionId, entity, action, offset]);

  const hasMore = offset + events.length < total;
  const hasPrev = offset > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Change log</DialogTitle>
          <DialogDescription>
            Audit trail of every edit to <span className="font-medium">{versionLabel}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1">
            <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Entity
            </Label>
            <Select
              value={entity}
              onValueChange={(v) => {
                setOffset(0);
                setEntity(v as EcrfTemplateEventEntityKind | 'all');
              }}
            >
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue
                  placeholder="Entity"
                  getDisplayLabel={(v) => {
                    if (!v) return 'Entity';
                    return ENTITY_LABELS[v as keyof typeof ENTITY_LABELS] ?? v;
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ENTITY_LABELS) as Array<keyof typeof ENTITY_LABELS>).map(
                  (k) => (
                    <SelectItem key={k} value={k}>
                      {ENTITY_LABELS[k]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Action
            </Label>
            <Select
              value={action}
              onValueChange={(v) => {
                setOffset(0);
                setAction(v as EcrfTemplateEventAction | 'all');
              }}
            >
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue
                  placeholder="Action"
                  getDisplayLabel={(v) => {
                    if (!v) return 'Action';
                    return ACTION_LABELS[v as keyof typeof ACTION_LABELS] ?? v;
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ACTION_LABELS) as Array<keyof typeof ACTION_LABELS>).map(
                  (k) => (
                    <SelectItem key={k} value={k}>
                      {ACTION_LABELS[k]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end justify-end pb-1 text-[11px] text-muted-foreground">
            {total > 0 && (
              <span>
                {offset + 1}–{Math.min(offset + events.length, total)} of {total}
              </span>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[55vh] rounded border">
          <div className="divide-y">
            {loading && (
              <div className="flex items-center justify-center gap-2 p-8 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading change log…
              </div>
            )}
            {!loading && error && (
              <p className="p-4 text-xs text-destructive">{error}</p>
            )}
            {!loading && !error && events.length === 0 && (
              <p className="p-6 text-center text-xs text-muted-foreground">
                No change log entries match these filters.
              </p>
            )}
            {!loading &&
              !error &&
              events.map((event) => <ChangeLogEntry key={event.id} event={event} />)}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev || loading}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore || loading}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Single entry row ────────────────────────────────────────────────────────

function ChangeLogEntry({ event }: { event: EcrfTemplateChangeEvent }) {
  const Icon = ACTION_ICON[event.action];
  const tone = ACTION_TONE[event.action];
  const when = new Date(event.created_at);

  const initials = event.actor_name
    ? event.actor_name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]!.toUpperCase())
        .join('')
    : '··';

  return (
    <div className="flex items-start gap-3 p-3">
      <span className={cn('mt-0.5 flex h-5 w-5 items-center justify-center', tone)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-1.5">
          <span className="text-xs font-medium">
            {ACTION_LABELS[event.action]} {event.entity_kind}
          </span>
          {event.entity_label && (
            <span className="truncate text-xs text-muted-foreground">
              &ldquo;{event.entity_label}&rdquo;
            </span>
          )}
          {event.field && (
            <Badge variant="outline" className="text-[9px] uppercase">
              {event.field}
            </Badge>
          )}
        </div>
        {event.action === 'update' && event.field && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            <span className="text-rose-600 line-through">{stringify(event.old_value)}</span>{' '}
            → <span className="text-emerald-700">{stringify(event.new_value)}</span>
          </p>
        )}
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Avatar className="h-4 w-4">
            {event.actor_avatar_url ? <AvatarImage src={event.actor_avatar_url} /> : null}
            <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
          </Avatar>
          <span>{event.actor_name ?? 'Someone'}</span>
          <span aria-hidden>·</span>
          <span title={format(when, 'PPpp')}>
            {formatDistanceToNow(when, { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}

function stringify(v: unknown): string {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'string') return v.length === 0 ? '""' : v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
