/**
 * Shared relative-time formatting helpers used by tab-level "Last Activity"
 * columns (Sites, Subjects, ...). Pure functions so callers can pin a clock
 * for testing and the orchestrator can call them inside `useMemo`.
 */

function parseTimestampMs(value: string | null | undefined): number {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Human "Updated 2d ago" / "Updated today" string for the Last Activity column. */
export function formatRelativeUpdated(
  iso: string | null | undefined,
  now: Date = new Date(),
): string {
  const ms = parseTimestampMs(iso);
  if (!ms) return 'Not yet updated';
  const diffMs = now.getTime() - ms;
  if (diffMs < 0) return 'Updated just now';
  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 1) return 'Updated just now';
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    if (isSameLocalDay(new Date(ms), now)) return 'Updated today';
    return `Updated ${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) return `Updated ${days}d ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `Updated ${weeks}w ago`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) return `Updated ${months}mo ago`;
  const years = Math.floor(months / 12);
  return `Updated ${years}y ago`;
}

/** Exposed so derive modules can share the same parsing semantics. */
export { parseTimestampMs };
