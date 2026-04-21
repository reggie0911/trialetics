'use server';

import {
  getSubjectCrfMetricEvents,
  type SubjectCrfMetricEventsInput,
} from '@/lib/actions/subject-crf-metric-events';
import {
  getSubjectVisitEvents,
  type SubjectVisitEventsInput,
} from '@/lib/actions/subject-visit-events';
import type {
  SubjectActivityEvent,
  SubjectActivityKind,
  SubjectCrfMetricEventField,
  SubjectVisitEventField,
} from '@/lib/types/ctms';

export interface SubjectActivityEventsInput {
  subjectId: string;
  /** Restrict to one stream. Defaults to 'all'. */
  kind?: SubjectActivityKind;
  /** Field filter — interpreted against whichever stream owns the field. */
  crfField?: SubjectCrfMetricEventField;
  visitField?: SubjectVisitEventField;
  /** Defaults to 25; capped at 200. */
  limit?: number;
  offset?: number;
}

export interface SubjectActivityEventsResult {
  events: SubjectActivityEvent[];
  total: number;
}

/**
 * Merge audit events from `subject_crf_metric_events` and
 * `subject_visit_events` into a single chronological feed.
 *
 * Pagination strategy: when `kind === 'all'`, both streams are fetched up to
 * `offset + limit` and merge-sorted by `created_at DESC`, then sliced. This
 * is the standard merge-paginate-two-streams trick — exact totals come from
 * the sum of both `count: 'exact'` queries. It is O(offset+limit) per call,
 * which is fine for audit-log sized data and avoids needing a SQL view.
 */
export async function getSubjectActivityEvents(
  input: SubjectActivityEventsInput,
): Promise<SubjectActivityEventsResult> {
  const kind: SubjectActivityKind = input.kind ?? 'all';
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);

  if (kind === 'crf') {
    const args: SubjectCrfMetricEventsInput = {
      subjectId: input.subjectId,
      field: input.crfField,
      limit,
      offset,
    };
    const res = await getSubjectCrfMetricEvents(args);
    return {
      events: res.events.map((e) => ({ kind: 'crf', ...e })),
      total: res.total,
    };
  }

  if (kind === 'visit') {
    const args: SubjectVisitEventsInput = {
      subjectId: input.subjectId,
      field: input.visitField,
      limit,
      offset,
    };
    const res = await getSubjectVisitEvents(args);
    return {
      events: res.events.map((e) => ({ kind: 'visit', ...e })),
      total: res.total,
    };
  }

  // kind === 'all' — fetch enough rows from each stream to satisfy the
  // (offset, offset+limit] window after merge-sorting.
  const window = offset + limit;
  const [crfRes, visitRes] = await Promise.all([
    getSubjectCrfMetricEvents({
      subjectId: input.subjectId,
      field: input.crfField,
      limit: window,
      offset: 0,
    }),
    getSubjectVisitEvents({
      subjectId: input.subjectId,
      field: input.visitField,
      limit: window,
      offset: 0,
    }),
  ]);

  const merged: SubjectActivityEvent[] = [
    ...crfRes.events.map<SubjectActivityEvent>((e) => ({ kind: 'crf', ...e })),
    ...visitRes.events.map<SubjectActivityEvent>((e) => ({ kind: 'visit', ...e })),
  ];
  merged.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return {
    events: merged.slice(offset, offset + limit),
    total: crfRes.total + visitRes.total,
  };
}
