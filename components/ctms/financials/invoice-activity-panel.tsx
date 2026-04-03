'use client';

import { Loader2 } from 'lucide-react';

import type { FinanceInvoiceStatus, InvoiceTimelineEntry } from '@/lib/types/ctms';
import { FINANCE_INVOICE_STATUS_LABEL } from '@/lib/types/ctms';
import { profileDisplayLabel } from '@/lib/utils/profile-display';
import { cn } from '@/lib/utils';

function invoiceStateLabel(state: string | null): string | null {
  if (!state) return null;
  return FINANCE_INVOICE_STATUS_LABEL[state as FinanceInvoiceStatus] ?? state;
}

function auditStateCaption(entry: Extract<InvoiceTimelineEntry, { source: "audit" }>): string | null {
  const from = invoiceStateLabel(entry.from_state);
  const to = invoiceStateLabel(entry.to_state);
  if (from && to) return `${from} → ${to}`;
  if (to) return to;
  if (from) return from;
  return null;
}

function timelineDotClass(
  variant: 'default' | 'destructive' | 'secondary'
): string {
  if (variant === 'default') {
    return 'bg-emerald-600 ring-background dark:bg-emerald-500';
  }
  if (variant === 'destructive') {
    return 'bg-destructive ring-background';
  }
  return 'bg-muted-foreground/60 ring-background';
}

function TimelineEntryBlock({
  title,
  titleVariant,
  actorLine,
  comment,
  at,
  atIso,
  isLast,
}: {
  title: string;
  titleVariant: 'default' | 'destructive' | 'secondary';
  actorLine: string;
  comment: string | null;
  at: string;
  atIso: string;
  isLast: boolean;
}) {
  return (
    <li className="flex gap-3 min-w-0">
      <div className="flex w-4 shrink-0 flex-col items-center self-stretch">
        <span
          className={cn(
            'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4',
            timelineDotClass(titleVariant)
          )}
          aria-hidden
        />
        {!isLast ? (
          <span className="mt-1 w-px flex-1 min-h-[0.75rem] bg-border" aria-hidden />
        ) : null}
      </div>
      <div className={cn('min-w-0 flex-1 space-y-1', !isLast && 'pb-4')}>
        <p
          className={cn(
            'text-xs font-semibold leading-snug',
            titleVariant === 'destructive' ? 'text-destructive' : 'text-foreground'
          )}
        >
          {title}
        </p>
        <p className="text-[11px] leading-snug text-muted-foreground">{actorLine}</p>
        {comment ? (
          <p className="text-[11px] leading-snug text-muted-foreground border-l-2 border-border/80 pl-2.5 italic">
            &ldquo;{comment}&rdquo;
          </p>
        ) : null}
        <time
          className="block text-[10px] tabular-nums text-muted-foreground/90 pt-0.5"
          dateTime={atIso}
        >
          {at}
        </time>
      </div>
    </li>
  );
}

export function InvoiceActivityPanel({
  loading,
  entries,
}: {
  loading: boolean;
  entries: InvoiceTimelineEntry[];
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        <span>Loading activity…</span>
      </div>
    );
  }
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/15 px-3 py-6 text-center text-xs text-muted-foreground">
        No activity recorded yet.
      </div>
    );
  }

  const lastIdx = entries.length - 1;

  return (
    <div className="rounded-lg border border-border/80 bg-muted/10 overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border/60 bg-muted/30">
        <p className="text-xs font-semibold text-foreground tracking-tight">Invoice activity</p>
      </div>
      <ul className="list-none m-0 p-3 space-y-0">
        {entries.map((e, idx) => {
          const at = new Date(e.created_at).toLocaleString();
          const atIso = new Date(e.created_at).toISOString();
          const actor = profileDisplayLabel(e.profiles);

          if (e.source === 'decision') {
            const title = e.decision === 'approved' ? 'Approved' : 'Rejected';
            const actorLine = `${actor} · Step ${e.step_index + 1}`;
            return (
              <TimelineEntryBlock
                key={`decision-${e.id}`}
                title={title}
                titleVariant={e.decision === 'approved' ? 'default' : 'destructive'}
                actorLine={actorLine}
                comment={e.comment?.trim() ? e.comment : null}
                at={at}
                atIso={atIso}
                isLast={idx === lastIdx}
              />
            );
          }

          const transition = auditStateCaption(e);
          const actorLine = transition ? `${actor} · ${transition}` : actor;
          return (
            <TimelineEntryBlock
              key={`audit-${e.id}`}
              title={e.summary}
              titleVariant="secondary"
              actorLine={actorLine}
              comment={null}
              at={at}
              atIso={atIso}
              isLast={idx === lastIdx}
            />
          );
        })}
      </ul>
    </div>
  );
}
