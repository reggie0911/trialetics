import type { DocCategory, DocIconKey } from '@/lib/docs/registry';

export const ICON_LABELS: Record<DocIconKey, string> = {
  rocket: 'Rocket',
  barChart3: 'Bar chart',
  users: 'Users',
  fileQuestion: 'File question',
  clipboardCheck: 'Clipboard check',
  calendar: 'Calendar',
  pill: 'Pill',
  creditCard: 'Credit card',
  shield: 'Shield',
  bookOpen: 'Book',
};

/** Strip HTML comments for Preview tab only (author notes / screenshot hints). */
export function stripHtmlCommentsForPreview(md: string): string {
  return md.replace(/<!--[\s\S]*?-->/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

/** Avoid `]` / `[` in markdown image alt text. */
export function sanitizeDocImageAlt(raw: string): string {
  const s = raw.replace(/[\[\]]/g, '').trim();
  return s.length ? s : 'Screenshot';
}

export function parseSortOrder(raw: string): number | null {
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) ? n : null;
}

/** Matches server rule in `platform-documentation.ts`: `^[a-z0-9]+(-[a-z0-9]+)*$` */
export function titleToDocSlug(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return s;
}

export function syncSlugFromTitle(
  titleValue: string,
  setSlug: (s: string) => void,
  slugManualRef: { current: boolean },
) {
  if (slugManualRef.current) return;
  setSlug(titleToDocSlug(titleValue));
}
