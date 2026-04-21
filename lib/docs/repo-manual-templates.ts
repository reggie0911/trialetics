import path from 'path';
import fs from 'fs';
import { docsRegistry } from './registry';

/** Optional repo-root manuals not in `docsRegistry` (same allowlist as server action). */
const EXTRA_REPO_MANUAL_PATHS: { filePath: string; label: string }[] = [
  { filePath: 'SDV_TRACKER_USER_MANUAL.md', label: 'SDV Tracker User Manual (repo root)' },
];

export type RepoManualTemplateOption = {
  filePath: string;
  label: string;
  /** When set, this file backs a built-in registry doc — use Edit overlay, not Create with this slug. */
  registrySlug?: string;
};

function toPosix(p: string): string {
  return path.normalize(p).split(path.sep).join('/');
}

/** Normalize client-supplied path to a safe repo-relative posix path, or null. */
export function normalizeRepoManualRelativePath(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const norm = toPosix(trimmed);
  if (norm.startsWith('/') || norm.startsWith('..') || norm.includes('/../')) return null;
  return norm;
}

function buildAllowlistSet(): Set<string> {
  const set = new Set<string>();
  for (const e of docsRegistry) {
    if (e.filePath) set.add(toPosix(e.filePath));
  }
  for (const x of EXTRA_REPO_MANUAL_PATHS) {
    set.add(toPosix(x.filePath));
  }
  return set;
}

/** Allowlisted repo-relative paths (posix) for Markdown manuals. */
export const REPO_MANUAL_ALLOWLIST: ReadonlySet<string> = buildAllowlistSet();

export function isAllowlistedRepoManualPath(filePath: string): boolean {
  const n = normalizeRepoManualRelativePath(filePath);
  if (!n) return false;
  return REPO_MANUAL_ALLOWLIST.has(n);
}

/** Dropdown options for the platform documentation “new page” starter. */
export function listRepoManualTemplates(): RepoManualTemplateOption[] {
  const fromRegistry: RepoManualTemplateOption[] = docsRegistry
    .filter((e): e is (typeof docsRegistry)[number] & { filePath: string } => Boolean(e.filePath))
    .map((e) => ({
      filePath: toPosix(e.filePath),
      label: `${e.title} (${toPosix(e.filePath)})`,
      registrySlug: e.slug,
    }));
  const fromExtra: RepoManualTemplateOption[] = EXTRA_REPO_MANUAL_PATHS.map((x) => ({
    filePath: toPosix(x.filePath),
    label: x.label,
    registrySlug: undefined,
  }));
  return [...fromRegistry, ...fromExtra].sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Read raw UTF-8 file contents when path is allowlisted and under `process.cwd()`.
 */
export function readAllowlistedRepoManualRaw(filePath: string): string | null {
  const n = normalizeRepoManualRelativePath(filePath);
  if (!n || !REPO_MANUAL_ALLOWLIST.has(n)) return null;
  const full = path.resolve(/*turbopackIgnore: true*/ process.cwd(), n);
  const root = path.resolve(/*turbopackIgnore: true*/ process.cwd());
  if (!full.startsWith(root + path.sep) && full !== root) return null;
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf-8');
}
