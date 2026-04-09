export type DocCategory = 'getting-started' | 'ctms' | 'trackers' | 'payments' | 'admin';

/** Serializable icon id — map to Lucide in client code via `getDocIcon` from `@/lib/docs/doc-icons`. */
export type DocIconKey =
  | 'rocket'
  | 'barChart3'
  | 'users'
  | 'fileQuestion'
  | 'clipboardCheck'
  | 'calendar'
  | 'pill'
  | 'creditCard'
  | 'shield'
  | 'bookOpen';

export interface DocEntry {
  slug: string;
  title: string;
  description: string;
  category: DocCategory;
  iconKey: DocIconKey;
  /** Omitted for DB-only docs (no file fallback). */
  filePath?: string;
  order: number;
  roles: ('admin' | 'user')[];
  /**
   * Calendar date `YYYY-MM-DD` shown on Documentation index cards and doc pages as “Updated …”.
   * Bump when the linked markdown is meaningfully revised (Platform docs can override via DB `updated_at`).
   */
  lastUpdated: string;
  moduleRoute?: string;
}

export const DOC_CATEGORY_LABELS: Record<DocCategory, string> = {
  'getting-started': 'Getting Started',
  ctms: 'Clinical Trial Management',
  trackers: 'Study Trackers',
  payments: 'Payments & Financials',
  admin: 'Administration',
};

export const DOC_CATEGORY_ORDER: DocCategory[] = [
  'getting-started',
  'ctms',
  'trackers',
  'payments',
  'admin',
];

export const docsRegistry: DocEntry[] = [
  {
    slug: 'onboarding',
    title: 'Guided setup',
    description:
      'In-app tour for admins and users: welcome dialog, coach marks on Studies and related areas, and Profile settings controls.',
    category: 'getting-started',
    iconKey: 'rocket',
    filePath: 'docs/user-manuals/onboarding.md',
    order: 1,
    roles: ['admin', 'user'],
    lastUpdated: '2026-03-26',
    moduleRoute: '/protected',
  },
  {
    slug: 'dashboard-home',
    title: 'Dashboard (Home)',
    description:
      'Overview of the CTMS landing page: summary counts, recent studies, and quick actions after sign-in.',
    category: 'ctms',
    iconKey: 'barChart3',
    filePath: 'docs/DASHBOARD_HOME_USER_MANUAL.md',
    order: 1,
    roles: ['admin', 'user'],
    lastUpdated: '2026-03-21',
    moduleRoute: '/protected',
  },
  {
    slug: 'inventory-management',
    title: 'Inventory Management',
    description:
      'Central and site inventory for drugs, devices, equipment, and supplies—ship, receive, dispense, verify, soft-archive orders, and audit with a ledger-backed trail and transaction-style logs.',
    category: 'ctms',
    iconKey: 'pill',
    filePath: 'docs/user-manuals/inventory-management.md',
    order: 2,
    roles: ['admin', 'user'],
    lastUpdated: '2026-04-09',
    moduleRoute: '/protected/inventory-management',
  },
  {
    slug: 'ae-metrics',
    title: 'AE Metrics',
    description: 'Upload, view, and analyze adverse event data from clinical trials.',
    category: 'trackers',
    iconKey: 'barChart3',
    filePath: 'docs/user-manuals/ae-metrics.md',
    order: 1,
    roles: ['admin', 'user'],
    lastUpdated: '2026-03-21',
    moduleRoute: '/protected/ae',
  },
  {
    slug: 'mrace-tracker',
    title: 'MRace Performance Tracker',
    description: 'Track patient and participant performance data with CSV uploads.',
    category: 'trackers',
    iconKey: 'users',
    filePath: 'docs/user-manuals/mrace-tracker.md',
    order: 2,
    roles: ['admin', 'user'],
    lastUpdated: '2026-03-21',
    moduleRoute: '/protected/patients',
  },
  {
    slug: 'ecrf-query-tracker',
    title: 'eCRF Query Tracker',
    description: 'Upload and manage eCRF query data with filtering and charts.',
    category: 'trackers',
    iconKey: 'fileQuestion',
    filePath: 'docs/user-manuals/ecrf-query-tracker.md',
    order: 3,
    roles: ['admin', 'user'],
    lastUpdated: '2026-03-21',
    moduleRoute: '/protected/ecrf-query-tracker',
  },
  {
    slug: 'sdv-tracker',
    title: 'SDV Tracker',
    description: 'Track source data verification progress with hierarchical reports.',
    category: 'trackers',
    iconKey: 'clipboardCheck',
    filePath: 'docs/user-manuals/sdv-tracker.md',
    order: 4,
    roles: ['admin', 'user'],
    lastUpdated: '2026-03-21',
    moduleRoute: '/protected/sdv-tracker',
  },
  {
    slug: 'visit-window',
    title: 'Visit Window',
    description: 'Monitor visit window compliance and scheduling.',
    category: 'trackers',
    iconKey: 'calendar',
    filePath: 'docs/user-manuals/visit-window.md',
    order: 5,
    roles: ['admin', 'user'],
    lastUpdated: '2026-03-21',
    moduleRoute: '/protected/vw',
  },
  {
    slug: 'med-compliance',
    title: 'Med Compliance',
    description: 'Track medication compliance data across study sites.',
    category: 'trackers',
    iconKey: 'pill',
    filePath: 'docs/user-manuals/med-compliance.md',
    order: 6,
    roles: ['admin', 'user'],
    lastUpdated: '2026-03-21',
    moduleRoute: '/protected/mc',
  },
  {
    slug: 'clinical-payments',
    title: 'Clinical Payments',
    description: 'Manage payment activities, contracts, and accruals for clinical sites.',
    category: 'payments',
    iconKey: 'creditCard',
    filePath: 'docs/user-manuals/clinical-payments.md',
    order: 1,
    roles: ['admin', 'user'],
    lastUpdated: '2026-03-21',
    moduleRoute: '/protected/clinical-payments',
  },
  {
    slug: 'financials-invoices',
    title: 'Financials & Invoice Approvals',
    description:
      'Submitting invoices with AI extraction, configurable multi-step approval workflows, study defaults, amount escalation, approval queue, site budgets, and payment recording.',
    category: 'payments',
    iconKey: 'bookOpen',
    filePath: 'docs/user-manuals/financials-invoices.md',
    order: 2,
    roles: ['admin', 'user'],
    lastUpdated: '2026-03-31',
    moduleRoute: '/protected/financials/approvals',
  },
  {
    slug: 'platform-admin',
    title: 'Platform Administration',
    description: 'Manage company access, modules, and platform-level configuration.',
    category: 'admin',
    iconKey: 'shield',
    filePath: 'docs/user-manuals/platform-admin.md',
    order: 1,
    roles: ['admin'],
    lastUpdated: '2026-03-21',
    moduleRoute: '/protected/platform/companies',
  },
];

export function getDocBySlug(slug: string): DocEntry | undefined {
  return docsRegistry.find((d) => d.slug === slug);
}

export function getDocByModuleRoute(route: string): DocEntry | undefined {
  return docsRegistry.find((d) => d.moduleRoute === route);
}

export function getDocsForRole(role: string): DocEntry[] {
  if (role === 'admin') return docsRegistry;
  return docsRegistry.filter((d) => d.roles.includes('user'));
}

export function getDocsByCategory(entries: DocEntry[]): Record<DocCategory, DocEntry[]> {
  const grouped: Record<DocCategory, DocEntry[]> = {
    'getting-started': [],
    ctms: [],
    trackers: [],
    payments: [],
    admin: [],
  };
  for (const entry of entries) {
    grouped[entry.category].push(entry);
  }
  for (const cat of Object.keys(grouped) as DocCategory[]) {
    grouped[cat].sort((a, b) => a.order - b.order);
  }
  return grouped;
}
