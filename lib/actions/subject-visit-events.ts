'use server';

import { createClient } from '@/lib/server';
import type {
  SubjectVisitEvent,
  SubjectVisitEventField,
} from '@/lib/types/ctms';

export interface SubjectVisitEventsInput {
  subjectId: string;
  /** When provided, restricts results to a single subject_visits row. */
  subjectVisitId?: string;
  /** When provided, restricts to a single field (e.g. 'planned_date'). */
  field?: SubjectVisitEventField;
  /** Defaults to 50; capped server-side at 200. */
  limit?: number;
  offset?: number;
}

interface RawEventRow {
  id: string;
  subject_visit_id: string;
  field: SubjectVisitEventField;
  previous_value: string | null;
  new_value: string | null;
  actor_user_id: string | null;
  created_at: string;
  subject_visits: {
    visit_name: string | null;
    subject_id: string;
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

export interface SubjectVisitEventsResult {
  events: SubjectVisitEvent[];
  /** Total rows matching the filter (ignores limit/offset). */
  total: number;
}

/**
 * Read the audit log of timing changes for a subject. Mirrors the shape of
 * `getSubjectCrfMetricEvents` so the Activity tab can merge both streams via
 * a common adapter.
 */
export async function getSubjectVisitEvents(
  input: SubjectVisitEventsInput,
): Promise<SubjectVisitEventsResult> {
  const supabase = await createClient();
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);

  let query = supabase
    .from('subject_visit_events')
    .select(
      `
        id,
        subject_visit_id,
        field,
        previous_value,
        new_value,
        actor_user_id,
        created_at,
        subject_visits!inner(
          visit_name,
          subject_id
        )
      `,
      { count: 'exact' },
    )
    .eq('subject_visits.subject_id', input.subjectId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (input.subjectVisitId) {
    query = query.eq('subject_visit_id', input.subjectVisitId);
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

  const events: SubjectVisitEvent[] = rows.map((r) => ({
    id: r.id,
    subject_visit_id: r.subject_visit_id,
    field: r.field,
    previous_value: r.previous_value,
    new_value: r.new_value,
    actor_user_id: r.actor_user_id,
    created_at: r.created_at,
    actor_name: r.actor_user_id
      ? actorDisplay(profilesByUser.get(r.actor_user_id))
      : null,
    visit_name: r.subject_visits?.visit_name ?? null,
  }));

  return { events, total: count ?? 0 };
}
