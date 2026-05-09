import type { DirectoryContactListItem } from '@/lib/types/directory';

/** Group key when no study site or primary institution bucket applies. */
export const CONTACT_DIRECTORY_SITE_UNASSIGNED = '__unassigned__';

export interface ContactDirectorySiteGroup {
  key: string;
  label: string;
  rows: DirectoryContactListItem[];
}

/**
 * Groups study-directory contacts for the "By site" layout: primary study site from
 * `study_enrichment`, else primary institution, else unassigned (same order as the grouped table).
 */
export function buildContactDirectorySiteGroups(
  contacts: DirectoryContactListItem[]
): ContactDirectorySiteGroup[] {
  const m = new Map<string, { label: string; rows: DirectoryContactListItem[] }>();
  for (const c of contacts) {
    const e = c.study_enrichment;
    const key = e?.primary_study_site_id ?? c.primary_institution?.id ?? CONTACT_DIRECTORY_SITE_UNASSIGNED;
    const label =
      e?.primary_study_site_label?.trim() ||
      c.primary_institution?.name?.trim() ||
      (key === CONTACT_DIRECTORY_SITE_UNASSIGNED ? 'Unassigned to site' : '—');
    const g = m.get(key) ?? { label, rows: [] as DirectoryContactListItem[] };
    g.label = label;
    g.rows.push(c);
    m.set(key, g);
  }
  const arr: ContactDirectorySiteGroup[] = Array.from(m.entries()).map(([key, v]) => ({
    key,
    label: v.label,
    rows: v.rows,
  }));
  arr.sort((a, b) => {
    if (a.key === CONTACT_DIRECTORY_SITE_UNASSIGNED) return 1;
    if (b.key === CONTACT_DIRECTORY_SITE_UNASSIGNED) return -1;
    return a.label.localeCompare(b.label);
  });
  return arr;
}
