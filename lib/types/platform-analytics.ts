import type { Json } from '@/lib/types/database.types';

export type PlatformAnalyticsSeatStats = {
  min: number;
  max: number;
  avg: number;
};

export type PlatformAnalyticsSnapshot = {
  company_count: number;
  new_companies_in_range: number;
  new_companies_last_30_days: number;
  profile_total: number;
  paying_subscriptions: number;
  at_risk_subscriptions: number;
  companies_without_subscription: number;
  module_ctms_enabled: number;
  module_etmf_enabled: number;
  module_tracker_enabled: number;
  tracker_definitions_total: number;
  tracker_definitions_active: number;
  tracker_definitions_platform_enabled: number;
  companies_with_custom_definitions: number;
  audit_events_in_range: number;
  seat_stats: PlatformAnalyticsSeatStats;
};

export type PlatformSubscriptionMixRow = {
  plan: string;
  status: string;
  count: number;
};

export type PlatformAuditDailyRow = {
  date: string;
  module_flags: number;
  study_keys: number;
  tracker_def: number;
  other: number;
};

export type PlatformWeeklyCountRow = {
  week_start: string;
  count: number;
};

export type PlatformWeeklyDistinctRow = {
  week_start: string;
  distinct_companies: number;
};

export type PlatformAnalyticsCompanyRow = {
  id: string;
  name: string;
  plan: string;
  subscription_status: string;
  member_count: number;
  has_ctms_access: boolean;
  has_etmf_access: boolean;
  has_tracker_access: boolean;
  enabled_study_tracker_key_count: number;
  custom_definitions_count: number;
  last_audit_at: string | null;
};

export type PlatformAnalyticsAuditFeedRow = {
  id: string;
  company_id: string;
  company_name: string;
  changed_at: string;
  category: string;
  summary: string;
};

export type PlatformBusinessAnalyticsDTO = {
  range_days: number;
  snapshot: PlatformAnalyticsSnapshot;
  subscription_mix: PlatformSubscriptionMixRow[];
  audit_series_daily: PlatformAuditDailyRow[];
  new_companies_weekly: PlatformWeeklyCountRow[];
  audit_distinct_companies_weekly: PlatformWeeklyDistinctRow[];
  companies: PlatformAnalyticsCompanyRow[];
  recent_audit: PlatformAnalyticsAuditFeedRow[];
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function bool(v: unknown): boolean {
  return v === true;
}

function parseSnapshot(raw: unknown): PlatformAnalyticsSnapshot | null {
  const o = asRecord(raw);
  if (!o) return null;
  const seat = asRecord(o.seat_stats);
  if (!seat) return null;
  return {
    company_count: num(o.company_count),
    new_companies_in_range: num(o.new_companies_in_range),
    new_companies_last_30_days: num(o.new_companies_last_30_days),
    profile_total: num(o.profile_total),
    paying_subscriptions: num(o.paying_subscriptions),
    at_risk_subscriptions: num(o.at_risk_subscriptions),
    companies_without_subscription: num(o.companies_without_subscription),
    module_ctms_enabled: num(o.module_ctms_enabled),
    module_etmf_enabled: num(o.module_etmf_enabled),
    module_tracker_enabled: num(o.module_tracker_enabled),
    tracker_definitions_total: num(o.tracker_definitions_total),
    tracker_definitions_active: num(o.tracker_definitions_active),
    tracker_definitions_platform_enabled: num(o.tracker_definitions_platform_enabled),
    companies_with_custom_definitions: num(o.companies_with_custom_definitions),
    audit_events_in_range: num(o.audit_events_in_range),
    seat_stats: {
      min: num(seat.min),
      max: num(seat.max),
      avg: num(seat.avg),
    },
  };
}

export function parsePlatformBusinessAnalytics(json: Json | null): PlatformBusinessAnalyticsDTO | null {
  if (json === null || typeof json !== 'object') return null;
  const o = asRecord(json);
  if (!o) return null;
  const snapshot = parseSnapshot(o.snapshot);
  if (!snapshot) return null;

  const mix: PlatformSubscriptionMixRow[] = [];
  if (Array.isArray(o.subscription_mix)) {
    for (const row of o.subscription_mix) {
      const r = asRecord(row);
      if (r) {
        mix.push({
          plan: str(r.plan),
          status: str(r.status),
          count: num(r.count),
        });
      }
    }
  }

  const auditDaily: PlatformAuditDailyRow[] = [];
  if (Array.isArray(o.audit_series_daily)) {
    for (const row of o.audit_series_daily) {
      const r = asRecord(row);
      if (r) {
        auditDaily.push({
          date: str(r.date),
          module_flags: num(r.module_flags),
          study_keys: num(r.study_keys),
          tracker_def: num(r.tracker_def),
          other: num(r.other),
        });
      }
    }
  }

  const newWeekly: PlatformWeeklyCountRow[] = [];
  if (Array.isArray(o.new_companies_weekly)) {
    for (const row of o.new_companies_weekly) {
      const r = asRecord(row);
      if (r) {
        newWeekly.push({ week_start: str(r.week_start), count: num(r.count) });
      }
    }
  }

  const auditWeekly: PlatformWeeklyDistinctRow[] = [];
  if (Array.isArray(o.audit_distinct_companies_weekly)) {
    for (const row of o.audit_distinct_companies_weekly) {
      const r = asRecord(row);
      if (r) {
        auditWeekly.push({
          week_start: str(r.week_start),
          distinct_companies: num(r.distinct_companies),
        });
      }
    }
  }

  const companies: PlatformAnalyticsCompanyRow[] = [];
  if (Array.isArray(o.companies)) {
    for (const row of o.companies) {
      const r = asRecord(row);
      if (!r) continue;
      const lastRaw = r.last_audit_at;
      let last_audit_at: string | null = null;
      if (typeof lastRaw === 'string') last_audit_at = lastRaw;
      else if (lastRaw !== null && typeof lastRaw === 'object' && !Array.isArray(lastRaw)) {
        /* jsonb timestamptz may arrive as object in edge cases — ignore */
      }
      companies.push({
        id: str(r.id),
        name: str(r.name),
        plan: str(r.plan),
        subscription_status: str(r.subscription_status),
        member_count: num(r.member_count),
        has_ctms_access: bool(r.has_ctms_access),
        has_etmf_access: bool(r.has_etmf_access),
        has_tracker_access: bool(r.has_tracker_access),
        enabled_study_tracker_key_count: num(r.enabled_study_tracker_key_count),
        custom_definitions_count: num(r.custom_definitions_count),
        last_audit_at,
      });
    }
  }

  const recent_audit: PlatformAnalyticsAuditFeedRow[] = [];
  if (Array.isArray(o.recent_audit)) {
    for (const row of o.recent_audit) {
      const r = asRecord(row);
      if (!r) continue;
      recent_audit.push({
        id: str(r.id),
        company_id: str(r.company_id),
        company_name: str(r.company_name),
        changed_at: str(r.changed_at),
        category: str(r.category),
        summary: str(r.summary),
      });
    }
  }

  return {
    range_days: num(o.range_days, 90),
    snapshot,
    subscription_mix: mix,
    audit_series_daily: auditDaily,
    new_companies_weekly: newWeekly,
    audit_distinct_companies_weekly: auditWeekly,
    companies,
    recent_audit,
  };
}
