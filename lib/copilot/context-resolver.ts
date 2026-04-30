/**
 * Route -> Copilot module + scoped IDs resolver.
 *
 * The provider seeds context from the current pathname so the Copilot has
 * something useful even before any layout has explicitly called
 * `useSetCopilotContext`. Layouts can then enrich the context with
 * server-known data (study title, status, read-only state, etc.).
 */

export type CopilotModule =
  | 'dashboard'
  | 'studies'
  | 'study'
  | 'sites'
  | 'site'
  | 'subjects'
  | 'subject'
  | 'visits'
  | 'visit'
  | 'tasks'
  | 'directory'
  | 'reports'
  | 'time-expenses'
  | 'documents'
  | 'etmf'
  | 'eisf'
  | 'brand-forge'
  | 'platform'
  | 'settings'
  | 'trip-reports'
  | 'patients'
  | 'sdv-tracker'
  | 'visit-window'
  | 'ae-metrics'
  | 'ecrf-query-tracker'
  | 'med-compliance'
  | 'clinical-training'
  | 'inventory-management'
  | 'custom-tracker'
  | 'general';

export interface ResolvedCopilotContext {
  module: CopilotModule;
  studyId: string | null;
  siteId: string | null;
  subjectId: string | null;
  visitId: string | null;
  documentId: string | null;
}

const STUDY_RE = /^\/protected\/studies\/([^\/]+)/;
const STUDY_SITE_RE = /^\/protected\/studies\/[^\/]+\/sites\/([^\/]+)/;
const STUDY_SUBJECT_RE = /^\/protected\/studies\/[^\/]+\/(?:patients|subjects)\/([^\/]+)/;
const STUDY_VISIT_RE = /^\/protected\/studies\/[^\/]+\/visits\/([^\/]+)/;
const STUDY_TRIP_REPORT_RE = /^\/protected\/studies\/[^\/]+\/trip-reports\/([^\/]+)/;
const MODULE_PREFIX_RULES: Array<{ prefix: string; module: CopilotModule }> = [
  { prefix: '/protected/studies', module: 'studies' },
  { prefix: '/protected/directory', module: 'directory' },
  { prefix: '/protected/etmf', module: 'etmf' },
  { prefix: '/protected/eisf', module: 'eisf' },
  { prefix: '/protected/brand-forge', module: 'brand-forge' },
  { prefix: '/protected/platform', module: 'platform' },
  { prefix: '/protected/settings', module: 'settings' },
  { prefix: '/protected/time-expenses', module: 'time-expenses' },
  { prefix: '/protected/reports', module: 'reports' },
  { prefix: '/protected/trip-reports', module: 'trip-reports' },
  { prefix: '/protected/patients', module: 'patients' },
  { prefix: '/protected/sdv-tracker', module: 'sdv-tracker' },
  { prefix: '/protected/vw', module: 'visit-window' },
  { prefix: '/protected/ae', module: 'ae-metrics' },
  { prefix: '/protected/ecrf-query-tracker', module: 'ecrf-query-tracker' },
  { prefix: '/protected/mc', module: 'med-compliance' },
  { prefix: '/protected/clinical-training', module: 'clinical-training' },
  { prefix: '/protected/inventory-management', module: 'inventory-management' },
  { prefix: '/protected/custom-trackers', module: 'custom-tracker' },
  { prefix: '/protected/document-management', module: 'documents' },
];

export function resolveCopilotContext(pathname: string): ResolvedCopilotContext {
  const studyMatch = pathname.match(STUDY_RE);
  const studyId = studyMatch ? studyMatch[1] : null;

  const siteMatch = pathname.match(STUDY_SITE_RE);
  const subjectMatch = pathname.match(STUDY_SUBJECT_RE);
  const visitMatch = pathname.match(STUDY_VISIT_RE);
  const tripMatch = pathname.match(STUDY_TRIP_REPORT_RE);
  let mod: CopilotModule = 'general';
  if (pathname === '/protected' || pathname === '/protected/') {
    mod = 'dashboard';
  } else if (studyId) {
    mod = 'study';
  } else {
    for (const rule of MODULE_PREFIX_RULES) {
      if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
        mod = rule.module;
        break;
      }
    }
  }

  return {
    module: mod,
    studyId,
    siteId: siteMatch?.[1] ?? null,
    subjectId: subjectMatch?.[1] ?? null,
    visitId: visitMatch?.[1] ?? tripMatch?.[1] ?? null,
    documentId: null,
  };
}

export function moduleLabel(mod: CopilotModule): string {
  switch (mod) {
    case 'dashboard': return 'Dashboard';
    case 'studies': return 'Studies';
    case 'study': return 'Study';
    case 'sites': return 'Sites';
    case 'site': return 'Site';
    case 'subjects': return 'Subjects';
    case 'subject': return 'Subject';
    case 'visits': return 'Visits';
    case 'visit': return 'Visit';
    case 'tasks': return 'Tasks';
    case 'directory': return 'Contacts & Organizations';
    case 'reports': return 'Reports & Analytics';
    case 'time-expenses': return 'Time & Expenses';
    case 'documents': return 'Documents';
    case 'etmf': return 'eTMF';
    case 'eisf': return 'eISF';
    case 'brand-forge': return 'BrandForge';
    case 'platform': return 'Platform admin';
    case 'settings': return 'Settings';
    case 'trip-reports': return 'Trip Reports';
    case 'patients': return 'Patients';
    case 'sdv-tracker': return 'SDV Tracker';
    case 'visit-window': return 'Visit Window';
    case 'ae-metrics': return 'AE Metrics';
    case 'ecrf-query-tracker': return 'eCRF Queries';
    case 'med-compliance': return 'Medication Compliance';
    case 'clinical-training': return 'Clinical Training';
    case 'inventory-management': return 'Inventory';
    case 'custom-tracker': return 'Custom Tracker';
    case 'general':
    default:
      return 'General';
  }
}
