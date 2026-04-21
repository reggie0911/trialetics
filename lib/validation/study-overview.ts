import { z } from 'zod';
import countries, { getAlpha2Code, getName, getNames } from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';

countries.registerLocale(en);

/** Map a single token (alpha-2 code or English country name) to ISO alpha-2. */
function coerceRegionTokenToAlpha2(token: string): string | undefined {
  const t = token.trim();
  if (!t) return undefined;
  if (/^[a-zA-Z]{2}$/.test(t)) {
    const code = t.toUpperCase();
    return getName(code, 'en') ? code : undefined;
  }
  const fromAlpha2 = getAlpha2Code(t, 'en');
  if (fromAlpha2) return fromAlpha2;
  const lower = t.toLowerCase();
  const catalog = getNames('en') as Record<string, string>;
  for (const [code, name] of Object.entries(catalog)) {
    if (name.toLowerCase() === lower) return code;
  }
  return undefined;
}

/** Normalize legacy string or array to alpha-2 codes for `study_sites.regions`. */
export function normalizeStudyRegionsInput(val: unknown): string[] | undefined {
  let tokens: string[] = [];
  if (val == null || val === '') return undefined;
  if (Array.isArray(val)) {
    tokens = val.map((x) => (x == null ? '' : String(x).trim())).filter(Boolean);
  } else if (typeof val === 'string') {
    tokens = val.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  } else {
    return undefined;
  }
  if (!tokens.length) return undefined;
  const codes = tokens.map(coerceRegionTokenToAlpha2).filter((c): c is string => Boolean(c));
  const deduped = [...new Set(codes)];
  return deduped.length ? deduped : undefined;
}

const tripReportTimingSchema = z.object({
  report_submission_days: z.number().int().positive().optional(),
  report_approval_days: z.number().int().positive().optional(),
  days_basis: z.enum(['calendar', 'business']).optional(),
});

export const studyOverviewSchema = z.object({
  study_type: z.string().optional(),
  design: z.string().optional(),
  estimated_enrollment: z.number().int().nonnegative().nullable().optional(),
  study_duration_months: z.number().int().nonnegative().nullable().optional(),
  population: z.string().optional(),
  primary_objective: z.string().optional(),
  secondary_objectives: z.array(z.string()).optional(),
  study_sites: z
    .object({
      regions: z.preprocess(normalizeStudyRegionsInput, z.array(z.string()).optional()),
      site_count_summary: z.string().optional(),
      site_types: z.string().optional(),
    })
    .optional(),
  monitoring: z
    .object({
      monitoring_type: z.string().optional(),
      sdv: z.string().optional(),
      visit_types: z.array(z.string()).optional(),
    })
    .optional(),
  trip_report_timing: tripReportTimingSchema.optional(),
});

export type StudyOverview = z.infer<typeof studyOverviewSchema>;

/** True if overview JSON has anything meaningful to show on the study detail page. */
export function studyOverviewHasDisplayableContent(o: StudyOverview | null | undefined): boolean {
  if (o == null) return false;
  return overviewHasContent(o);
}

function toIntish(v: unknown): unknown {
  if (v == null || v === '') return undefined;
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === 'string') {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : v;
  }
  return v;
}

/** Normalize JSON from DB/API before Zod (string JSON, numeric strings, etc.). */
function normalizeOverviewBeforeParse(raw: unknown): unknown {
  if (raw == null) return null;
  let v: unknown = raw;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v) as unknown;
    } catch {
      return null;
    }
  }
  if (typeof v !== 'object' || v === null) return null;
  const obj = { ...(v as Record<string, unknown>) };
  obj.estimated_enrollment = toIntish(obj.estimated_enrollment);
  obj.study_duration_months = toIntish(obj.study_duration_months);
  if (Array.isArray(obj.secondary_objectives)) {
    obj.secondary_objectives = obj.secondary_objectives.map((x) => (x == null ? '' : String(x)));
  }
  if (obj.monitoring && typeof obj.monitoring === 'object') {
    const m = { ...(obj.monitoring as Record<string, unknown>) };
    if (Array.isArray(m.visit_types)) {
      m.visit_types = m.visit_types.map((x) => (x == null ? '' : String(x)));
    }
    obj.monitoring = m;
  }
  if (obj.trip_report_timing && typeof obj.trip_report_timing === 'object') {
    const t = { ...(obj.trip_report_timing as Record<string, unknown>) };
    t.report_submission_days = toIntish(t.report_submission_days);
    t.report_approval_days = toIntish(t.report_approval_days);
    obj.trip_report_timing = t;
  }
  if (obj.study_sites && typeof obj.study_sites === 'object') {
    obj.study_sites = { ...(obj.study_sites as Record<string, unknown>) };
  }
  return obj;
}

export function parseStudyOverview(raw: unknown): StudyOverview | null {
  if (raw == null) return null;
  const normalized = normalizeOverviewBeforeParse(raw);
  if (normalized == null) return null;
  const parsed = studyOverviewSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

function isNonEmptyString(v: string | undefined): boolean {
  return v != null && v.trim() !== '';
}

function overviewHasContent(o: StudyOverview): boolean {
  if (isNonEmptyString(o.study_type) || isNonEmptyString(o.design) || isNonEmptyString(o.population)) return true;
  if (isNonEmptyString(o.primary_objective)) return true;
  if (o.estimated_enrollment != null && o.estimated_enrollment > 0) return true;
  if (o.study_duration_months != null && o.study_duration_months > 0) return true;
  if (o.secondary_objectives?.some((s) => isNonEmptyString(s))) return true;
  const ss = o.study_sites;
  if (ss) {
    const regs = ss.regions;
    const hasRegions =
      Array.isArray(regs) && regs.some(isNonEmptyString);
    if (hasRegions || isNonEmptyString(ss.site_count_summary) || isNonEmptyString(ss.site_types)) {
      return true;
    }
  }
  const t = o.trip_report_timing;
  if (t) {
    if ((t.report_submission_days != null && t.report_submission_days > 0) || (t.report_approval_days != null && t.report_approval_days > 0)) {
      return true;
    }
    if (t.days_basis === 'business' || t.days_basis === 'calendar') return true;
  }
  return false;
}

/** Format `study_sites.regions` for read-only display (alpha-2 codes or legacy names). */
export function formatStudyOverviewRegionsForDisplay(
  regions: string | string[] | undefined | null,
): string | null {
  if (regions == null) return null;
  const toLabel = (raw: string): string => {
    const t = raw.trim();
    if (!t) return '';
    if (/^[a-zA-Z]{2}$/.test(t)) {
      const code = t.toUpperCase();
      return getName(code, 'en') ?? code;
    }
    return t;
  };
  if (Array.isArray(regions)) {
    const s = regions.map((x) => toLabel(String(x))).filter(Boolean);
    return s.length ? s.join(', ') : null;
  }
  const t = toLabel(String(regions));
  return t || null;
}

/** Coerce parsed overview to JSON-ready object or null if empty. */
export function studyOverviewToDbValue(raw: unknown): Record<string, unknown> | null {
  const normalized = normalizeOverviewBeforeParse(raw);
  const parsed =
    normalized != null
      ? studyOverviewSchema.safeParse(normalized)
      : raw != null
        ? studyOverviewSchema.safeParse(raw)
        : null;
  if (!parsed?.success) return null;
  const o = parsed.data;
  if (!overviewHasContent(o)) return null;
  return o as Record<string, unknown>;
}
