import { addDays, addMonths } from 'date-fns';

export type ScheduledCadence = 'daily' | 'weekly' | 'monthly' | 'once';

export interface ScheduledReportTimingConfig {
  hour?: number;
  minute?: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
  runAt?: string;
}

/**
 * Compute the next UTC run instant for a scheduled finance report.
 * Uses UTC clock fields from `config` (defaults: 08:00, Monday for weekly, 1 for monthly).
 */
export function computeNextScheduledReportRun(params: {
  cadence: ScheduledCadence;
  config: ScheduledReportTimingConfig | Record<string, unknown>;
  from?: Date;
}): Date | null {
  const from = params.from ?? new Date();
  const raw = params.config as ScheduledReportTimingConfig;
  const hour = typeof raw.hour === 'number' ? raw.hour : 8;
  const minute = typeof raw.minute === 'number' ? raw.minute : 0;

  const atUtc = (d: Date) => {
    const x = new Date(d);
    x.setUTCHours(hour, minute, 0, 0);
    return x;
  };

  const bumpDay = (d: Date, days: number) => {
    const x = new Date(d);
    x.setUTCDate(x.getUTCDate() + days);
    return atUtc(x);
  };

  if (params.cadence === 'once') {
    if (!raw.runAt) return null;
    const t = new Date(raw.runAt);
    return Number.isNaN(t.getTime()) ? null : t;
  }

  if (params.cadence === 'daily') {
    let next = atUtc(from);
    if (next.getTime() <= from.getTime()) next = bumpDay(from, 1);
    return next;
  }

  if (params.cadence === 'weekly') {
    const targetDow = typeof raw.dayOfWeek === 'number' ? raw.dayOfWeek : 1;
    let d = atUtc(from);
    for (let i = 0; i < 14; i++) {
      if (d.getUTCDay() === targetDow && d.getTime() > from.getTime()) return d;
      d = bumpDay(d, 1);
    }
    return bumpDay(from, 7);
  }

  if (params.cadence === 'monthly') {
    const dom = typeof raw.dayOfMonth === 'number' ? raw.dayOfMonth : 1;
    let candidate = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), dom, hour, minute, 0, 0));
    if (candidate.getTime() <= from.getTime()) {
      candidate = addMonths(candidate, 1);
      candidate = new Date(
        Date.UTC(candidate.getUTCFullYear(), candidate.getUTCMonth(), dom, hour, minute, 0, 0),
      );
    }
    return candidate;
  }

  return addDays(atUtc(from), 1);
}
