/** Pure helpers for finance audit log filter dropdowns (server- and client-safe). */

export function humanizeEntityType(raw: string): string {
  if (!raw) return raw;
  return raw
    .replace(/^fm_/, '')
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function buildEntityTypeOptions(logs: { entity_type: string }[]): { value: string; label: string }[] {
  const set = new Set<string>();
  for (const l of logs) set.add(l.entity_type);
  return [...set]
    .sort()
    .map((value) => ({ value, label: humanizeEntityType(value) }));
}

export function buildActorOptions(logs: { actor_user_id: string | null }[]): { value: string; label: string }[] {
  const hasSystem = logs.some((l) => l.actor_user_id == null);
  const ids = [...new Set(logs.map((l) => l.actor_user_id).filter(Boolean))] as string[];
  ids.sort();
  const opts = ids.map((id) => ({ value: id, label: `User ${id.slice(0, 8)}…` }));
  if (hasSystem) opts.unshift({ value: '__system__', label: 'System' });
  return opts;
}
