import type { Database } from '@/lib/types/database.types';
import {
  docsRegistry,
  getDocsForRole,
  type DocCategory,
  type DocEntry,
  type DocIconKey,
} from './registry';

type PlatformDocRow = Database['public']['Tables']['platform_documentation']['Row'];

const REGISTRY_SLUGS = new Set(docsRegistry.map((d) => d.slug));

const VALID_ICON_KEYS = new Set<string>([
  'rocket',
  'barChart3',
  'users',
  'fileQuestion',
  'clipboardCheck',
  'calendar',
  'pill',
  'creditCard',
  'shield',
  'bookOpen',
]);

function formatDocDate(iso: string): string {
  return iso.slice(0, 10);
}

function normalizeIconKey(key: string | null): DocIconKey {
  if (key && VALID_ICON_KEYS.has(key)) return key as DocIconKey;
  return 'bookOpen';
}

function normalizeRoles(arr: string[] | null | undefined): ('admin' | 'user')[] {
  const r = arr ?? [];
  const out: ('admin' | 'user')[] = [];
  if (r.includes('admin')) out.push('admin');
  if (r.includes('user')) out.push('user');
  return out.length > 0 ? out : ['admin', 'user'];
}

function viewerCanSeeDocRoles(
  viewerCompanyRole: string,
  docRoles: ('admin' | 'user')[]
): boolean {
  if (viewerCompanyRole === 'admin') return true;
  return docRoles.includes('user');
}

function applyDbOverlay(entry: DocEntry, row: PlatformDocRow | undefined): DocEntry {
  if (!row) return entry;
  return {
    ...entry,
    title: row.title?.trim() ? row.title.trim() : entry.title,
    description: row.description?.trim() ? row.description.trim() : entry.description,
    lastUpdated: formatDocDate(row.updated_at),
  };
}

function rowToDbOnlyEntry(row: PlatformDocRow): DocEntry | null {
  if (!row.category) return null;
  const cat = row.category as DocCategory;
  const roles = normalizeRoles(row.roles);
  return {
    slug: row.slug,
    title: row.title?.trim() || row.slug,
    description: row.description?.trim() || '',
    category: cat,
    iconKey: normalizeIconKey(row.icon_key),
    order: row.sort_order ?? 999,
    roles,
    lastUpdated: formatDocDate(row.updated_at),
    moduleRoute: row.module_route?.trim() || undefined,
  };
}

/**
 * Registry docs (filtered by company role) + optional DB overlays + DB-only docs visible to viewer.
 */
export function mergeDocEntriesWithDb(
  viewerCompanyRole: string,
  dbRows: PlatformDocRow[]
): DocEntry[] {
  const bySlug = new Map(dbRows.map((r) => [r.slug, r]));
  const base = getDocsForRole(viewerCompanyRole);
  const merged: DocEntry[] = base.map((reg) => applyDbOverlay(reg, bySlug.get(reg.slug)));

  for (const row of dbRows) {
    if (REGISTRY_SLUGS.has(row.slug)) continue;
    const synthetic = rowToDbOnlyEntry(row);
    if (!synthetic) continue;
    if (!viewerCanSeeDocRoles(viewerCompanyRole, synthetic.roles)) continue;
    merged.push(synthetic);
  }

  return merged;
}

export function resolveDocEntryForSlug(
  slug: string,
  viewerCompanyRole: string,
  dbRows: PlatformDocRow[]
): DocEntry | undefined {
  return mergeDocEntriesWithDb(viewerCompanyRole, dbRows).find((d) => d.slug === slug);
}
