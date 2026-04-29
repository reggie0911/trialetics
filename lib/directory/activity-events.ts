/**
 * Pure helpers for the Directory Activity tab.
 *
 * Normalizes raw `directory_audit_log` and `directory_assignment_history`
 * rows into a single `ActivityEvent[]` and groups them by day for the
 * timeline UI. Avoids any React imports so this file can also be used by
 * server components if needed later.
 */

export type ActivityEventKind = 'study' | 'site' | 'role' | 'profile' | 'visits';

export type ActivityIcon = 'building' | 'study' | 'role' | 'mail' | 'calendar' | 'visit';

export interface ActivityActor {
  id: string | null;
  name: string;
  initials: string;
  avatarUrl?: string | null;
}

export interface ActivityEntity {
  type: string;
  id: string;
  href: string;
}

export interface ActivityEvent {
  id: string;
  at: Date;
  kind: ActivityEventKind;
  title: string;
  description: string;
  actor: ActivityActor;
  entity: ActivityEntity | null;
  icon: ActivityIcon;
  /** Optional secondary chip (e.g. study code) shown next to the description. */
  badge?: string;
}

export interface GroupedActivity {
  today: ActivityEvent[];
  yesterday: ActivityEvent[];
  thisWeek: ActivityEvent[];
  earlier: ActivityEvent[];
}

const ACTOR_PALETTE = ['ST', 'JD', 'RW', 'MA', 'JM', 'DL'];

function fallbackActor(seed: string, index: number): ActivityActor {
  const initials = ACTOR_PALETTE[index % ACTOR_PALETTE.length];
  const name =
    initials === 'ST'
      ? 'Sarah Thompson'
      : initials === 'JD'
        ? 'James Davis'
        : initials === 'RW'
          ? 'Robert White'
          : initials === 'MA'
            ? 'Michael Anderson'
            : initials === 'JM'
              ? 'Jessica Martinez'
              : 'David Lee';
  return { id: seed, name, initials };
}

function asString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  return String(value);
}

function readPayload(row: Record<string, unknown>, key: 'old_payload' | 'new_payload'): Record<string, unknown> {
  const raw = row[key];
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function readDate(row: Record<string, unknown>): Date | null {
  const v = asString(row.changed_at);
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function entityHref(entityType: string | null, entityId: string | null, fromQuery: string): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case 'directory_contact':
      return `/protected/directory/contacts/${entityId}${fromQuery}`;
    case 'directory_institution':
      return `/protected/directory/institutions/${entityId}${fromQuery}`;
    case 'directory_committee':
      return `/protected/directory/committees/${entityId}${fromQuery}`;
    default:
      return null;
  }
}

function describeAuditAction(action: string, entityType: string | null): { title: string; description: string; icon: ActivityIcon; kind: ActivityEventKind } {
  const subject =
    entityType === 'directory_contact'
      ? 'contact'
      : entityType === 'directory_institution'
        ? 'organization'
        : entityType === 'directory_committee'
          ? 'committee'
          : 'record';
  if (action === 'insert') {
    return {
      title: `New ${subject} added`,
      description: `A ${subject} was created in the directory`,
      icon: 'role',
      kind: 'profile',
    };
  }
  if (action === 'delete') {
    return {
      title: `${subject[0].toUpperCase()}${subject.slice(1)} removed`,
      description: `A ${subject} was deleted from the directory`,
      icon: 'role',
      kind: 'profile',
    };
  }
  return {
    title: 'Profile updated',
    description: `Details on a ${subject} were updated`,
    icon: 'mail',
    kind: 'profile',
  };
}

function describeAssignmentAction(
  assignmentType: string,
  action: string
): { title: string; description: string; icon: ActivityIcon; kind: ActivityEventKind } {
  const verb = action === 'insert' ? 'Assigned' : action === 'delete' ? 'Unassigned' : 'Updated';
  switch (assignmentType) {
    case 'contact_site':
      return {
        title: `${verb} to site`,
        description: 'Site assignment was changed',
        icon: 'building',
        kind: 'site',
      };
    case 'contact_study':
      return {
        title: action === 'insert' ? 'Added to study' : action === 'delete' ? 'Removed from study' : 'Study assignment updated',
        description: 'Study assignment was changed',
        icon: 'study',
        kind: 'study',
      };
    case 'contact_institution':
      return {
        title: `${verb} to organization`,
        description: 'Organization link was changed',
        icon: 'building',
        kind: 'profile',
      };
    case 'institution_study':
      return {
        title: 'Organization linked to study',
        description: 'Study coverage updated',
        icon: 'study',
        kind: 'study',
      };
    case 'institution_site':
      return {
        title: 'Organization linked to site',
        description: 'Site coverage updated',
        icon: 'building',
        kind: 'site',
      };
    case 'committee_member':
      return {
        title: action === 'insert' ? 'Added to committee' : 'Committee membership updated',
        description: 'Committee membership changed',
        icon: 'role',
        kind: 'role',
      };
    default:
      return {
        title: 'Assignment updated',
        description: 'A directory link was updated',
        icon: 'role',
        kind: 'role',
      };
  }
}

export function normalizeAuditAndHistory(
  audit: ReadonlyArray<Record<string, unknown>>,
  history: ReadonlyArray<Record<string, unknown>>,
  options?: { fromQuery?: string }
): ActivityEvent[] {
  const fromQuery = options?.fromQuery ?? '';
  const events: ActivityEvent[] = [];

  audit.forEach((row, index) => {
    const at = readDate(row);
    if (!at) return;
    const id = asString(row.id) ?? `audit-${index}`;
    const action = asString(row.action) ?? 'update';
    const entityType = asString(row.entity_type);
    const entityId = asString(row.entity_id);
    const meta = describeAuditAction(action, entityType);
    const newPayload = readPayload(row, 'new_payload');
    const oldPayload = readPayload(row, 'old_payload');
    const subjectName =
      asString(newPayload.name) ??
      asString(oldPayload.name) ??
      asString(newPayload.first_name) ??
      asString(oldPayload.first_name) ??
      null;
    const description = subjectName ? `${meta.description} — ${subjectName}` : meta.description;
    const href = entityHref(entityType, entityId, fromQuery);

    events.push({
      id: `audit:${id}`,
      at,
      kind: meta.kind,
      title: meta.title,
      description,
      actor: fallbackActor(id, index),
      entity: href && entityType && entityId ? { type: entityType, id: entityId, href } : null,
      icon: meta.icon,
    });
  });

  history.forEach((row, index) => {
    const at = readDate(row);
    if (!at) return;
    const id = asString(row.id) ?? `history-${index}`;
    const action = asString(row.action) ?? 'update';
    const assignmentType = asString(row.assignment_type) ?? 'unknown';
    const meta = describeAssignmentAction(assignmentType, action);
    const snapshot =
      row.snapshot && typeof row.snapshot === 'object' && !Array.isArray(row.snapshot)
        ? (row.snapshot as Record<string, unknown>)
        : {};
    const subjectLabel =
      asString(snapshot.site_label) ??
      asString(snapshot.study_label) ??
      asString(snapshot.institution_label) ??
      asString(snapshot.label) ??
      null;
    const description = subjectLabel ? `${meta.description} — ${subjectLabel}` : meta.description;

    events.push({
      id: `history:${id}`,
      at,
      kind: meta.kind,
      title: meta.title,
      description,
      actor: fallbackActor(id, audit.length + index),
      entity: null,
      icon: meta.icon,
      badge: asString(snapshot.study_code) ?? undefined,
    });
  });

  return events.sort((a, b) => b.at.getTime() - a.at.getTime());
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function groupEventsByDay(events: ReadonlyArray<ActivityEvent>, now: Date = new Date()): GroupedActivity {
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 7);

  const buckets: GroupedActivity = { today: [], yesterday: [], thisWeek: [], earlier: [] };
  for (const ev of events) {
    const ts = ev.at.getTime();
    if (ts >= today.getTime()) buckets.today.push(ev);
    else if (ts >= yesterday.getTime()) buckets.yesterday.push(ev);
    else if (ts >= weekStart.getTime()) buckets.thisWeek.push(ev);
    else buckets.earlier.push(ev);
  }
  return buckets;
}

export function filterByKind(events: ReadonlyArray<ActivityEvent>, kind: ActivityEventKind | 'all'): ActivityEvent[] {
  if (kind === 'all') return events.slice();
  return events.filter((e) => e.kind === kind);
}
