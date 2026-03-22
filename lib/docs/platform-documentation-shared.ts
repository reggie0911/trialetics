import type { DocCategory, DocIconKey } from '@/lib/docs/registry';

/** For platform docs admin UI — keep in sync with validation in `platform-documentation` actions. */
export const PLATFORM_DOC_CATEGORIES: DocCategory[] = [
  'getting-started',
  'ctms',
  'trackers',
  'payments',
  'admin',
];

export const PLATFORM_DOC_ICON_KEYS: DocIconKey[] = [
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
];

export type PlatformDocAdminListItem = {
  slug: string;
  source: 'registry' | 'database';
  title: string;
  hasDbRow: boolean;
  /** Effective module route: DB overlay, else registry default. */
  moduleRoute: string;
};

export type PlatformDocDraft = {
  slug: string;
  bodyMarkdown: string;
  title: string;
  description: string;
  category: DocCategory | '';
  iconKey: DocIconKey;
  roles: ('admin' | 'user')[];
  moduleRoute: string;
  sortOrder: string;
  isRegistry: boolean;
  hasDbRow: boolean;
};
