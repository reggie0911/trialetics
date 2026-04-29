'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { ComponentType } from 'react';
import {
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  Mail,
  UserCog,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  groupEventsByDay,
  type ActivityEvent,
  type ActivityIcon,
} from '@/lib/directory/activity-events';
import { DirectoryEmptyState } from '@/components/ctms/directory/directory-empty-state';

const ICON_MAP: Record<ActivityIcon, { icon: ComponentType<{ className?: string }>; bg: string }> = {
  building: { icon: Building2, bg: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300' },
  study: { icon: GraduationCap, bg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' },
  role: { icon: UserCog, bg: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300' },
  mail: { icon: Mail, bg: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300' },
  calendar: { icon: CalendarClock, bg: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300' },
  visit: { icon: ClipboardCheck, bg: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
};

const TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

const FULL_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: undefined,
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

interface TimelineRowProps {
  event: ActivityEvent;
  /** When true, render `MMM D` date instead of `h:mm a` time (used for older buckets). */
  useDateLabel?: boolean;
}

function TimelineRow({ event, useDateLabel }: TimelineRowProps) {
  const meta = ICON_MAP[event.icon];
  const Icon = meta.icon;
  const stamp = useDateLabel
    ? SHORT_DATE_FORMATTER.format(event.at)
    : TIME_FORMATTER.format(event.at);

  const body = (
    <div className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
      <div className="w-[60px] shrink-0 pt-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
        {stamp}
      </div>
      <span
        className={cn(
          'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
          meta.bg
        )}
        aria-hidden
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground leading-tight">{event.title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
          {event.description}
          {event.badge ? (
            <span className="ml-1.5 text-sky-600 dark:text-sky-400 font-medium">{event.badge}</span>
          ) : null}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Avatar className="h-6 w-6 rounded-md">
          {event.actor.avatarUrl ? <AvatarImage src={event.actor.avatarUrl} alt="" /> : null}
          <AvatarFallback className="rounded-md text-[9px]">{event.actor.initials}</AvatarFallback>
        </Avatar>
        <span className="hidden sm:inline text-[11px] text-foreground/80 max-w-[110px] truncate">
          {event.actor.name}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      </div>
    </div>
  );

  if (event.entity?.href) {
    return (
      <li>
        <Link
          href={event.entity.href}
          aria-label={`${event.title} — ${event.actor.name}`}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {body}
        </Link>
      </li>
    );
  }
  return <li>{body}</li>;
}

function GroupHeader({ label, tone }: { label: string; tone: 'today' | 'yesterday' | 'week' | 'earlier' }) {
  const toneClass =
    tone === 'today'
      ? 'bg-sky-50 text-sky-700 ring-sky-200/70 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30'
      : tone === 'yesterday'
        ? 'bg-violet-50 text-violet-700 ring-violet-200/70 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30'
        : tone === 'week'
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30'
          : 'bg-muted text-muted-foreground ring-border';
  return (
    <div className="flex items-center gap-2 px-4 pt-3 pb-1">
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2 h-5 text-[10px] font-medium ring-1 ring-inset',
          toneClass
        )}
      >
        {label}
      </span>
      <span className="h-px flex-1 bg-border/70" aria-hidden />
    </div>
  );
}

interface DirectoryActivityTimelineProps {
  events: ActivityEvent[];
  emptyMessage?: string;
  canLoadMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

export function DirectoryActivityTimeline({
  events,
  emptyMessage = 'No activity in this range yet.',
  canLoadMore,
  onLoadMore,
  loadingMore,
}: DirectoryActivityTimelineProps) {
  const grouped = useMemo(() => groupEventsByDay(events), [events]);
  const todayLabel = `Today — ${FULL_DATE_FORMATTER.format(new Date())}`;
  const yesterdayDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }, []);
  const yesterdayLabel = `Yesterday — ${FULL_DATE_FORMATTER.format(yesterdayDate)}`;

  const isEmpty =
    grouped.today.length === 0 &&
    grouped.yesterday.length === 0 &&
    grouped.thisWeek.length === 0 &&
    grouped.earlier.length === 0;

  return (
    <Card className="py-0">
      <CardHeader className="px-4 pt-4 pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">Activity Timeline</CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Chronological record of meaningful directory activities.
        </p>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {isEmpty ? (
          <div className="px-4 pb-4">
            <DirectoryEmptyState
              title={emptyMessage}
              description="Create or update Directory records to populate the live activity trail."
              className="py-10"
            />
          </div>
        ) : (
          <ol className="divide-y divide-border/60">
            {grouped.today.length > 0 ? (
              <>
                <GroupHeader label={todayLabel} tone="today" />
                {grouped.today.map((e) => (
                  <TimelineRow key={e.id} event={e} />
                ))}
              </>
            ) : null}
            {grouped.yesterday.length > 0 ? (
              <>
                <GroupHeader label={yesterdayLabel} tone="yesterday" />
                {grouped.yesterday.map((e) => (
                  <TimelineRow key={e.id} event={e} />
                ))}
              </>
            ) : null}
            {grouped.thisWeek.length > 0 ? (
              <>
                <GroupHeader label="This Week" tone="week" />
                {grouped.thisWeek.map((e) => (
                  <TimelineRow key={e.id} event={e} useDateLabel />
                ))}
              </>
            ) : null}
            {grouped.earlier.length > 0 ? (
              <>
                <GroupHeader label="Earlier" tone="earlier" />
                {grouped.earlier.map((e) => (
                  <TimelineRow key={e.id} event={e} useDateLabel />
                ))}
              </>
            ) : null}
          </ol>
        )}
        <div className="flex justify-center border-t border-border/60 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs h-8"
            disabled={!canLoadMore || loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore ? 'Loading…' : 'Load older activity'}
            <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
