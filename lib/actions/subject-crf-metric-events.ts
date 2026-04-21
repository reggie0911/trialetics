'use server';

import { createClient } from '@/lib/server';
import type {
  SubjectCrfMetricEvent,
  SubjectCrfMetricEventField,
} from '@/lib/types/ctms';

export interface SubjectCrfMetricEventsInput {
  subjectId: string;
  /** When provided, restricts results to one CRF row. */
  subjectCrfId?: string;
  /** When provided, restricts results to a single field (e.g. 'data_entry'). */
  field?: SubjectCrfMetricEventField;
  /** Defaults to 50; capped server-side at 200. */
  limit?: number;
  offset?: number;
}

interface RawEventRow {
  id: string;
  subject_crf_id: string;
  field: SubjectCrfMetricEventField;
  previous_value: string | null;
  new_value: string;
  actor_user_id: string | null;
  created_at: string;
  subject_crfs: {
    crf_name: string | null;
    subject_visit_id: string;
    subject_visits: { visit_name: string | null } | null;
  } | null;
}

interface ProfileRow {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

function actorDisplay(p: ProfileRow | undefined): string | null {
  if (!p) return null;
  if (p.email && p.email.trim().length > 0) return p.email;
  const name = [p.first_name, p.last_name]
    .filter((s): s is string => Boolean(s && s.trim().length > 0))
    .join(' ')
    .trim();
  return name.length > 0 ? name : null;
}

export interface SubjectCrfMetricEventsResult {
  events: SubjectCrfMetricEvent[];
  /** Total rows matching the filter (ignores limit/offset). */
  total: number;
}

/**
 * Read the audit log of metric / query_status changes for a subject.
 *
 * RLS on `subject_crf_metric_events` already restricts callers to their own
 * company's rows; we additionally constrain by subjectId so each call is
 * scoped to a single subject (the table is JOINed via subject_crfs).
 *
 * Returns the page slice plus a server-side total count (`{ count: 'exact' }`)
 * so callers can render page-based pagination without a second round trip.
 */
export async function getSubjectCrfMetricEvents(
  input: SubjectCrfMetricEventsInput,
): Promise<SubjectCrfMetricEventsResult> {
  const supabase = await createClient();
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);

  let query = supabase
    .from('subject_crf_metric_events')
    .select(
      `
        id,
        subject_crf_id,
        field,
        previous_value,
        new_value,
        actor_user_id,
        created_at,
        subject_crfs!inner(
          crf_name,
          subject_visit_id,
          subject_id,
          subject_visits(visit_name)
        )
      `,
      { count: 'exact' },
    )
    .eq('subject_crfs.subject_id', input.subjectId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (input.subjectCrfId) {
    query = query.eq('subject_crf_id', input.subjectCrfId);
  }
  if (input.field) {
    query = query.eq('field', input.field);
  }

  const { data, error, count } = await query;
  if (error || !data) return { events: [], total: 0 };

  const rows = data as unknown as RawEventRow[];

  const actorIds = Array.from(
    new Set(
      rows
        .map((r) => r.actor_user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const profilesByUser = new Map<string, ProfileRow>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, email')
      .in('user_id', actorIds);
    for (const p of (profiles ?? []) as ProfileRow[]) {
      profilesByUser.set(p.user_id, p);
    }
  }

  const events: SubjectCrfMetricEvent[] = rows.map((r) => ({
    id: r.id,
    subject_crf_id: r.subject_crf_id,
    field: r.field,
    previous_value: r.previous_value,
    new_value: r.new_value,
    actor_user_id: r.actor_user_id,
    created_at: r.created_at,
    actor_name: r.actor_user_id
      ? actorDisplay(profilesByUser.get(r.actor_user_id))
      : null,
    crf_name: r.subject_crfs?.crf_name ?? null,
    visit_name: r.subject_crfs?.subject_visits?.visit_name ?? null,
  }));

  return { events, total: count ?? 0 };
}
