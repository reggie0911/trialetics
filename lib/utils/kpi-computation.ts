import type {
  ClinicalProtocolWithRelations,
  ClinicalSiteWithRelations,
  SubjectWithRelations,
} from '@/lib/types/clinical-trials';

export interface KpiContext {
  protocol: ClinicalProtocolWithRelations;
  sites: ClinicalSiteWithRelations[];
  subjects: SubjectWithRelations[];
  siteId?: string;
}

export interface KpiComputedResult {
  value: number | string | null;
  autoTarget: number | string | null;
  pct: number | null;
  flagStatus: 'on_track' | 'behind' | 'none';
  src: 'computed' | 'target_set' | 'na';
}

function pct(value: number, target: number | null): number | null {
  if (target == null || target === 0) return null;
  return Math.round((value / target) * 100);
}

function flag(percent: number | null, invert = false): 'on_track' | 'behind' | 'none' {
  if (percent == null) return 'none';
  if (invert) return percent > 100 ? 'behind' : 'on_track';
  return percent >= 60 ? 'on_track' : 'behind';
}

function filterForSite(subjects: SubjectWithRelations[], siteId?: string): SubjectWithRelations[] {
  if (!siteId) return subjects;
  return subjects.filter(s => s.site_id === siteId);
}

function filterSitesForSite(sites: ClinicalSiteWithRelations[], siteId?: string): ClinicalSiteWithRelations[] {
  if (!siteId) return sites;
  return sites.filter(s => s.id === siteId);
}

type ComputeFn = (ctx: KpiContext) => KpiComputedResult;

const INITIATED_STATUSES = ['initiated', 'enrolling', 'closed'];
const ENROLLED_STATUSES = ['enrolled', 'completed', 'terminated', 'randomized', 'withdrawn', 'early_terminated'];
const SCREENED_STATUSES = ['screening', 'enrolled', 'completed', 'terminated', 'screen_failure', 'rescreened', 'randomized', 'withdrawn', 'early_terminated'];
const DISCONTINUED_STATUSES = ['terminated', 'withdrawn', 'early_terminated'];

const COMPUTATION_MAP: Record<string, ComputeFn> = {
  'sites.initiated': (ctx) => {
    const sites = filterSitesForSite(ctx.sites, ctx.siteId);
    const count = sites.filter(s => INITIATED_STATUSES.includes(s.status) && s.site_initiated_date).length;
    const target = ctx.siteId ? null : (ctx.protocol.planned_sites_count ?? null);
    const p = pct(count, target);
    return { value: count, autoTarget: target, pct: p, flagStatus: flag(p), src: 'computed' };
  },

  'sites.open': (ctx) => {
    const sites = filterSitesForSite(ctx.sites, ctx.siteId);
    const count = sites.filter(s => ['initiated', 'enrolling'].includes(s.status)).length;
    return { value: count, autoTarget: null, pct: null, flagStatus: 'none', src: 'na' };
  },

  'sites.closed': (ctx) => {
    const sites = filterSitesForSite(ctx.sites, ctx.siteId);
    const initiated = sites.filter(s => INITIATED_STATUSES.includes(s.status) && s.site_initiated_date).length;
    const count = sites.filter(s => s.status === 'closed' && s.close_out_date).length;
    const p = pct(count, initiated || null);
    return { value: count, autoTarget: initiated || null, pct: p, flagStatus: flag(p), src: 'computed' };
  },

  'screens.screened': (ctx) => {
    const subjects = filterForSite(ctx.subjects, ctx.siteId);
    const count = subjects.filter(s => SCREENED_STATUSES.includes(s.status) && s.screening_date).length;
    const targetSubjects = ctx.protocol.planned_subjects_count ?? null;
    const target = targetSubjects != null ? Math.round(targetSubjects * 1.2) : null;
    const p = pct(count, target);
    return { value: count, autoTarget: target, pct: p, flagStatus: flag(p), src: 'computed' };
  },

  'screens.failures': (ctx) => {
    const subjects = filterForSite(ctx.subjects, ctx.siteId);
    const count = subjects.filter(s => s.status === 'screen_failure').length;
    const targetSubjects = ctx.protocol.planned_subjects_count ?? null;
    const targetScreened = targetSubjects != null ? Math.round(targetSubjects * 1.2) : null;
    const target = targetScreened != null && targetSubjects != null ? targetScreened - targetSubjects : null;
    const p = pct(count, target);
    return { value: count, autoTarget: target, pct: p, flagStatus: flag(p), src: 'computed' };
  },

  'screens.failure_rate': (ctx) => {
    const subjects = filterForSite(ctx.subjects, ctx.siteId);
    const screened = subjects.filter(s => SCREENED_STATUSES.includes(s.status) && s.screening_date).length;
    const failures = subjects.filter(s => s.status === 'screen_failure').length;
    const rate = screened > 0 ? Math.round((failures / screened) * 100 * 100) / 100 : 0;
    const targetSubjects = ctx.protocol.planned_subjects_count ?? null;
    const targetScreened = targetSubjects != null ? Math.round(targetSubjects * 1.2) : null;
    const targetFail = targetScreened != null && targetSubjects != null ? targetScreened - targetSubjects : null;
    const targetRate = targetScreened != null && targetFail != null && targetScreened > 0
      ? Math.round((targetFail / targetScreened) * 100 * 100) / 100
      : null;
    const p = pct(rate, targetRate);
    return { value: rate, autoTarget: targetRate, pct: p, flagStatus: flag(p, true), src: 'computed' };
  },

  'subjects.enrolled': (ctx) => {
    const subjects = filterForSite(ctx.subjects, ctx.siteId);
    const count = subjects.filter(s => ENROLLED_STATUSES.includes(s.status)).length;
    const target = ctx.protocol.planned_subjects_count ?? null;
    const p = pct(count, target);
    return { value: count, autoTarget: target, pct: p, flagStatus: flag(p), src: 'computed' };
  },

  'subjects.randomized': (ctx) => {
    const subjects = filterForSite(ctx.subjects, ctx.siteId);
    const count = subjects.filter(s => s.status === 'randomized').length;
    const target = ctx.protocol.planned_subjects_count ?? null;
    const p = pct(count, target);
    return { value: count, autoTarget: target, pct: p, flagStatus: flag(p), src: 'computed' };
  },

  'subjects.randomization_rate_screened': (ctx) => {
    const subjects = filterForSite(ctx.subjects, ctx.siteId);
    const enrolled = subjects.filter(s => ENROLLED_STATUSES.includes(s.status)).length;
    const randomized = subjects.filter(s => s.status === 'randomized').length;
    const rate = enrolled > 0 ? Math.round((randomized / enrolled) * 100 * 100) / 100 : 0;
    return { value: rate.toFixed(2), autoTarget: null, pct: null, flagStatus: 'none', src: 'na' };
  },

  'subjects.randomization_rate_enrolled': (ctx) => {
    const subjects = filterForSite(ctx.subjects, ctx.siteId);
    const enrolled = subjects.filter(s => ENROLLED_STATUSES.includes(s.status)).length;
    const randomized = subjects.filter(s => s.status === 'randomized').length;
    const rate = enrolled > 0 ? Math.round((randomized / enrolled) * 100 * 100) / 100 : 0;
    const p = Math.round(rate);
    return { value: rate.toFixed(2), autoTarget: '100.00', pct: p, flagStatus: flag(p), src: 'computed' };
  },

  'subjects.completed': (ctx) => {
    const subjects = filterForSite(ctx.subjects, ctx.siteId);
    const enrolled = subjects.filter(s => ENROLLED_STATUSES.includes(s.status)).length;
    const count = subjects.filter(s => s.status === 'completed').length;
    const p = pct(count, enrolled || null);
    return { value: count, autoTarget: enrolled || null, pct: p, flagStatus: flag(p), src: 'computed' };
  },

  'subjects.discontinued': (ctx) => {
    const subjects = filterForSite(ctx.subjects, ctx.siteId);
    const enrolled = subjects.filter(s => ENROLLED_STATUSES.includes(s.status)).length;
    const count = subjects.filter(s => DISCONTINUED_STATUSES.includes(s.status)).length;
    const p = enrolled > 0 ? Math.round((count / enrolled) * 100) : null;
    return { value: count, autoTarget: null, pct: p, flagStatus: flag(p), src: 'computed' };
  },

  'subjects.discontinuation_rate': (ctx) => {
    const subjects = filterForSite(ctx.subjects, ctx.siteId);
    const enrolled = subjects.filter(s => ENROLLED_STATUSES.includes(s.status)).length;
    const discontinued = subjects.filter(s => DISCONTINUED_STATUSES.includes(s.status)).length;
    const rate = enrolled > 0 ? Math.round((discontinued / enrolled) * 100 * 100) / 100 : 0;
    return { value: rate.toFixed(2), autoTarget: null, pct: null, flagStatus: rate > 10 ? 'behind' : 'on_track', src: 'computed' };
  },

  'enrollment.rate_per_month': (ctx) => {
    const sites = filterSitesForSite(ctx.sites, ctx.siteId);
    const subjects = filterForSite(ctx.subjects, ctx.siteId);
    const initiatedSites = sites.filter(s => INITIATED_STATUSES.includes(s.status) && s.site_initiated_date);
    const enrolledCount = subjects.filter(s => ENROLLED_STATUSES.includes(s.status)).length;

    let rate: number | null = null;
    if (initiatedSites.length > 0) {
      const now = new Date();
      let totalSiteMonths = 0;
      for (const site of initiatedSites) {
        const start = site.first_subject_enrolled_date
          ? new Date(site.first_subject_enrolled_date)
          : site.site_initiated_date
            ? new Date(site.site_initiated_date)
            : null;
        if (start) {
          const days = Math.max(1, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          totalSiteMonths += days / 30.4375;
        }
      }
      if (totalSiteMonths > 0) {
        rate = Math.round((enrolledCount / totalSiteMonths) * 100) / 100;
      }
    }

    return {
      value: rate != null ? rate.toFixed(2) : 'N/A',
      autoTarget: null,
      pct: null,
      flagStatus: 'none',
      src: 'computed',
    };
  },

  'enrollment.completion_date': (ctx) => {
    return {
      value: ctx.protocol.actual_end_date ?? 'N/A',
      autoTarget: ctx.protocol.planned_end_date ?? 'N/A',
      pct: null,
      flagStatus: ctx.protocol.actual_end_date && ctx.protocol.planned_end_date
        ? new Date(ctx.protocol.actual_end_date) <= new Date(ctx.protocol.planned_end_date) ? 'on_track' : 'behind'
        : 'none',
      src: 'target_set',
    };
  },
};

export function computeKpiValue(
  computationKey: string | null,
  context: KpiContext
): KpiComputedResult | null {
  if (!computationKey) return null;
  const fn = COMPUTATION_MAP[computationKey];
  if (!fn) return null;
  return fn(context);
}

export function getAvailableComputationKeys(): { key: string; label: string }[] {
  return Object.keys(COMPUTATION_MAP).map(key => ({
    key,
    label: key
      .replace(/\./g, ' > ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase()),
  }));
}
