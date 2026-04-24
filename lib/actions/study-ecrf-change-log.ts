'use server';

import { createClient } from '@/lib/server';
import { assertEcrfAdminForStudy } from '@/lib/server/require-ecrf-admin';
import type {
  EcrfTemplateChangeEvent,
  EcrfTemplateDiff,
  EcrfTemplateDiffCrf,
  EcrfTemplateDiffFieldChange,
  EcrfTemplateDiffQuestion,
  EcrfTemplateDiffSummary,
  EcrfTemplateDiffVisit,
  EcrfTemplateEventAction,
  EcrfTemplateEventEntityKind,
  EcrfTemplateVersion,
  StudyCrf,
  StudyCrfQuestion,
  StudyVisitDefinition,
} from '@/lib/types/ctms';

// ─── Profile helper ──────────────────────────────────────────────────────────

interface ProfileRow {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

function actorDisplay(p: ProfileRow | undefined): string | null {
  if (!p) return null;
  const name = [p.first_name, p.last_name]
    .filter((s): s is string => Boolean(s && s.trim().length > 0))
    .join(' ')
    .trim();
  if (name.length > 0) return name;
  if (p.email && p.email.trim().length > 0) return p.email;
  return null;
}

async function loadProfiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[]
): Promise<Map<string, ProfileRow>> {
  const map = new Map<string, ProfileRow>();
  if (userIds.length === 0) return map;
  const { data } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name, email, avatar_url')
    .in('user_id', userIds);
  for (const p of (data ?? []) as ProfileRow[]) {
    map.set(p.user_id, p);
  }
  return map;
}

// ─── listTemplateChangeEvents ────────────────────────────────────────────────

export interface ListTemplateChangeEventsInput {
  studyId: string;
  versionId: string;
  /** Optional kind filter for the dialog. */
  entityKind?: EcrfTemplateEventEntityKind;
  /** Optional action filter for the dialog. */
  action?: EcrfTemplateEventAction;
  /** Defaults to 50; capped at 200. */
  limit?: number;
  offset?: number;
}

export interface ListTemplateChangeEventsResult {
  events: EcrfTemplateChangeEvent[];
  total: number;
}

interface RawEventRow {
  id: string;
  study_id: string;
  template_version_id: string;
  entity_kind: EcrfTemplateEventEntityKind;
  entity_id: string;
  entity_label: string | null;
  action: EcrfTemplateEventAction;
  field: string | null;
  old_value: unknown;
  new_value: unknown;
  actor_id: string | null;
  created_at: string;
}

/**
 * Read the audit log for one template version. Returns events newest-first.
 * Resolves `actor_id` to display names via a single batched profile lookup.
 */
export async function listTemplateChangeEvents(
  input: ListTemplateChangeEventsInput
): Promise<ListTemplateChangeEventsResult> {
  const supabase = await createClient();
  const { error: adminError } = await assertEcrfAdminForStudy(supabase, input.studyId);
  if (adminError) return { events: [], total: 0 };

  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);

  let query = supabase
    .from('study_ecrf_template_events')
    .select(
      'id, study_id, template_version_id, entity_kind, entity_id, entity_label, action, field, old_value, new_value, actor_id, created_at',
      { count: 'exact' }
    )
    .eq('study_id', input.studyId)
    .eq('template_version_id', input.versionId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (input.entityKind) query = query.eq('entity_kind', input.entityKind);
  if (input.action) query = query.eq('action', input.action);

  const { data, error, count } = await query;
  if (error || !data) return { events: [], total: 0 };

  const rows = data as unknown as RawEventRow[];
  const actorIds = Array.from(
    new Set(rows.map((r) => r.actor_id).filter((id): id is string => Boolean(id)))
  );
  const profilesByUser = await loadProfiles(supabase, actorIds);

  const events: EcrfTemplateChangeEvent[] = rows.map((r) => ({
    id: r.id,
    study_id: r.study_id,
    template_version_id: r.template_version_id,
    entity_kind: r.entity_kind,
    entity_id: r.entity_id,
    entity_label: r.entity_label,
    action: r.action,
    field: r.field,
    old_value: r.old_value,
    new_value: r.new_value,
    actor_id: r.actor_id,
    created_at: r.created_at,
    actor_name: r.actor_id ? actorDisplay(profilesByUser.get(r.actor_id)) : null,
    actor_avatar_url: r.actor_id
      ? profilesByUser.get(r.actor_id)?.avatar_url ?? null
      : null,
  }));

  return { events, total: count ?? 0 };
}

// ─── listTemplateRowActors ───────────────────────────────────────────────────

/**
 * Resolve actor display names for a batch of user ids. Used by the eCRF
 * Builder table to render "Updated by <person>" stamps without making N
 * profile lookups from the client.
 */
export async function listTemplateRowActors(
  studyId: string,
  userIds: string[]
): Promise<{
  actors: Record<string, { name: string; avatarUrl: string | null }>;
  error: string | null;
}> {
  const unique = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))));
  if (unique.length === 0) return { actors: {}, error: null };
  const supabase = await createClient();
  const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
  if (adminError) return { actors: {}, error: adminError };
  const profiles = await loadProfiles(supabase, unique);
  const actors: Record<string, { name: string; avatarUrl: string | null }> = {};
  for (const id of unique) {
    const p = profiles.get(id);
    const name = actorDisplay(p) ?? 'Someone';
    actors[id] = { name, avatarUrl: p?.avatar_url ?? null };
  }
  return { actors, error: null };
}

// ─── compareTemplateVersions ─────────────────────────────────────────────────

const VISIT_FIELDS: ReadonlyArray<keyof StudyVisitDefinition> = [
  'visit_name',
  'timepoint_label',
  'timepoint_days',
  'window_before_days',
  'window_after_days',
  'sort_order',
];

const CRF_FIELDS: ReadonlyArray<keyof StudyCrf> = [
  'name',
  'description',
  'sort_order',
];

const QUESTION_FIELDS: ReadonlyArray<keyof StudyCrfQuestion> = [
  'label',
  'help_text',
  'question_type',
  'required',
  'options',
  'sort_order',
];

function diffFields<T>(
  left: T,
  right: T,
  fields: ReadonlyArray<keyof T>
): EcrfTemplateDiffFieldChange[] {
  const out: EcrfTemplateDiffFieldChange[] = [];
  for (const f of fields) {
    const l = (left as unknown as Record<string, unknown>)[f as string];
    const r = (right as unknown as Record<string, unknown>)[f as string];
    if (JSON.stringify(l) !== JSON.stringify(r)) {
      out.push({ field: f as string, left: l, right: r });
    }
  }
  return out;
}

function emptySummary(): EcrfTemplateDiffSummary {
  return { added: 0, removed: 0, changed: 0 };
}

function bumpSummary(
  summary: EcrfTemplateDiffSummary,
  flags: { added?: boolean; removed?: boolean; changed?: boolean }
) {
  if (flags.added) summary.added += 1;
  if (flags.removed) summary.removed += 1;
  if (flags.changed) summary.changed += 1;
}

interface CompareInput {
  studyId: string;
  leftVersionId: string;
  rightVersionId: string;
}

/**
 * Compute a structural diff of two template versions of the same study.
 * Matches visits/CRFs/questions across versions by `(name|label, sort_order)`
 * fingerprint to handle clones (where the original ids do not exist on the
 * right side). Falls back to id when fingerprints are ambiguous.
 */
export async function compareTemplateVersions(
  input: CompareInput
): Promise<{ data: EcrfTemplateDiff | null; error: string | null }> {
  const supabase = await createClient();
  const { error: adminError } = await assertEcrfAdminForStudy(supabase, input.studyId);
  if (adminError) return { data: null, error: adminError };

  const [leftVerRes, rightVerRes] = await Promise.all([
    supabase
      .from('study_ecrf_template_versions')
      .select('*')
      .eq('id', input.leftVersionId)
      .maybeSingle(),
    supabase
      .from('study_ecrf_template_versions')
      .select('*')
      .eq('id', input.rightVersionId)
      .maybeSingle(),
  ]);
  if (leftVerRes.error) return { data: null, error: leftVerRes.error.message };
  if (rightVerRes.error) return { data: null, error: rightVerRes.error.message };

  const leftVersion = leftVerRes.data as unknown as EcrfTemplateVersion | null;
  const rightVersion = rightVerRes.data as unknown as EcrfTemplateVersion | null;
  if (!leftVersion || leftVersion.study_id !== input.studyId) {
    return { data: null, error: 'Left version not found in this study.' };
  }
  if (!rightVersion || rightVersion.study_id !== input.studyId) {
    return { data: null, error: 'Right version not found in this study.' };
  }

  const versionIds = [input.leftVersionId, input.rightVersionId];

  const [visitsRes, crfsRes, questionsRes] = await Promise.all([
    supabase
      .from('study_visit_definitions')
      .select('*')
      .in('template_version_id', versionIds)
      .order('sort_order', { ascending: true }),
    supabase
      .from('study_crfs')
      .select('*')
      .in('template_version_id', versionIds)
      .order('sort_order', { ascending: true }),
    supabase
      .from('study_crf_questions')
      .select('*')
      .in('template_version_id', versionIds)
      .order('sort_order', { ascending: true }),
  ]);

  if (visitsRes.error) return { data: null, error: visitsRes.error.message };
  if (crfsRes.error) return { data: null, error: crfsRes.error.message };
  if (questionsRes.error) return { data: null, error: questionsRes.error.message };

  const allVisits = (visitsRes.data ?? []) as unknown as StudyVisitDefinition[];
  const allCrfs = (crfsRes.data ?? []) as unknown as StudyCrf[];
  const allQuestions = (questionsRes.data ?? []) as unknown as StudyCrfQuestion[];

  const splitByVersion = <T extends { template_version_id: string }>(
    rows: T[]
  ): { left: T[]; right: T[] } => ({
    left: rows.filter((r) => r.template_version_id === input.leftVersionId),
    right: rows.filter((r) => r.template_version_id === input.rightVersionId),
  });

  const visits = splitByVersion(allVisits);
  const crfs = splitByVersion(allCrfs);
  const questions = splitByVersion(allQuestions);

  const visitTotals = emptySummary();
  const crfTotals = emptySummary();
  const questionTotals = emptySummary();

  // Index right-side rows by visit fingerprint (visit_name|timepoint_days).
  const rightVisitsByKey = new Map<string, StudyVisitDefinition>();
  for (const v of visits.right) {
    rightVisitsByKey.set(`${v.visit_name}|${v.timepoint_days ?? ''}`, v);
  }
  const usedRightVisits = new Set<string>();

  const diffVisits: EcrfTemplateDiffVisit[] = [];

  for (const lv of visits.left) {
    const key = `${lv.visit_name}|${lv.timepoint_days ?? ''}`;
    const rv = rightVisitsByKey.get(key);
    if (!rv) {
      diffVisits.push({
        id: lv.id,
        visit_name: lv.visit_name,
        removed: true,
        crfs: collectChildren(lv, null, crfs, questions, crfTotals, questionTotals),
      });
      bumpSummary(visitTotals, { removed: true });
      continue;
    }
    usedRightVisits.add(rv.id);
    const visitChanges = diffFields(lv, rv, VISIT_FIELDS);
    const visitCrfs = collectChildren(lv, rv, crfs, questions, crfTotals, questionTotals);
    const hasChange =
      visitChanges.length > 0 || visitCrfs.some((c) => c.added || c.removed || (c.changes && c.changes.length > 0) || c.questions.some((q) => q.added || q.removed || (q.changes && q.changes.length > 0)));
    if (hasChange) bumpSummary(visitTotals, { changed: true });
    diffVisits.push({
      id: rv.id,
      visit_name: rv.visit_name,
      changes: visitChanges.length > 0 ? visitChanges : undefined,
      crfs: visitCrfs,
    });
  }

  for (const rv of visits.right) {
    if (usedRightVisits.has(rv.id)) continue;
    diffVisits.push({
      id: rv.id,
      visit_name: rv.visit_name,
      added: true,
      crfs: collectChildren(null, rv, crfs, questions, crfTotals, questionTotals),
    });
    bumpSummary(visitTotals, { added: true });
  }

  return {
    data: {
      left: leftVersion,
      right: rightVersion,
      visits: diffVisits,
      totals: { visits: visitTotals, crfs: crfTotals, questions: questionTotals },
    },
    error: null,
  };
}

/**
 * Diff CRFs (and their questions) for a pair of matched visits. Either side
 * may be null when the visit was added or removed wholesale.
 */
function collectChildren(
  leftVisit: StudyVisitDefinition | null,
  rightVisit: StudyVisitDefinition | null,
  crfs: { left: StudyCrf[]; right: StudyCrf[] },
  questions: { left: StudyCrfQuestion[]; right: StudyCrfQuestion[] },
  crfTotals: EcrfTemplateDiffSummary,
  questionTotals: EcrfTemplateDiffSummary
): EcrfTemplateDiffCrf[] {
  const leftCrfs = leftVisit
    ? crfs.left.filter((c) => c.visit_definition_id === leftVisit.id)
    : [];
  const rightCrfs = rightVisit
    ? crfs.right.filter((c) => c.visit_definition_id === rightVisit.id)
    : [];

  const rightByKey = new Map<string, StudyCrf>();
  for (const c of rightCrfs) rightByKey.set(c.name, c);
  const usedRightCrfs = new Set<string>();

  const out: EcrfTemplateDiffCrf[] = [];

  for (const lc of leftCrfs) {
    const rc = rightByKey.get(lc.name);
    if (!rc) {
      out.push({
        id: lc.id,
        name: lc.name,
        removed: true,
        questions: collectQuestionDiff(lc, null, questions, questionTotals),
      });
      bumpSummary(crfTotals, { removed: true });
      continue;
    }
    usedRightCrfs.add(rc.id);
    const changes = diffFields(lc, rc, CRF_FIELDS);
    const qDiff = collectQuestionDiff(lc, rc, questions, questionTotals);
    const hasChange =
      changes.length > 0 ||
      qDiff.some((q) => q.added || q.removed || (q.changes && q.changes.length > 0));
    if (hasChange) bumpSummary(crfTotals, { changed: true });
    out.push({
      id: rc.id,
      name: rc.name,
      changes: changes.length > 0 ? changes : undefined,
      questions: qDiff,
    });
  }

  for (const rc of rightCrfs) {
    if (usedRightCrfs.has(rc.id)) continue;
    out.push({
      id: rc.id,
      name: rc.name,
      added: true,
      questions: collectQuestionDiff(null, rc, questions, questionTotals),
    });
    bumpSummary(crfTotals, { added: true });
  }

  return out;
}

function collectQuestionDiff(
  leftCrf: StudyCrf | null,
  rightCrf: StudyCrf | null,
  questions: { left: StudyCrfQuestion[]; right: StudyCrfQuestion[] },
  questionTotals: EcrfTemplateDiffSummary
): EcrfTemplateDiffQuestion[] {
  const leftQs = leftCrf ? questions.left.filter((q) => q.crf_id === leftCrf.id) : [];
  const rightQs = rightCrf ? questions.right.filter((q) => q.crf_id === rightCrf.id) : [];

  const rightByKey = new Map<string, StudyCrfQuestion>();
  for (const q of rightQs) rightByKey.set(`${q.label}|${q.question_type}`, q);
  const usedRight = new Set<string>();

  const out: EcrfTemplateDiffQuestion[] = [];

  for (const lq of leftQs) {
    const key = `${lq.label}|${lq.question_type}`;
    const rq = rightByKey.get(key);
    if (!rq) {
      out.push({
        id: lq.id,
        label: lq.label,
        question_type: lq.question_type,
        removed: true,
      });
      bumpSummary(questionTotals, { removed: true });
      continue;
    }
    usedRight.add(rq.id);
    const changes = diffFields(lq, rq, QUESTION_FIELDS);
    if (changes.length > 0) bumpSummary(questionTotals, { changed: true });
    out.push({
      id: rq.id,
      label: rq.label,
      question_type: rq.question_type,
      changes: changes.length > 0 ? changes : undefined,
    });
  }

  for (const rq of rightQs) {
    if (usedRight.has(rq.id)) continue;
    out.push({
      id: rq.id,
      label: rq.label,
      question_type: rq.question_type,
      added: true,
    });
    bumpSummary(questionTotals, { added: true });
  }

  return out;
}
