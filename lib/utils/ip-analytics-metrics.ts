import type { IpLogRow } from '@/lib/types/ip-management';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnalyticsKpis {
  totalUnits: number;
  availableCount: number;
  usedCount: number;
  verifiedCount: number;
  pendingVerificationCount: number;
  missingSerialCount: number;
  missingLotCount: number;
  utilizationRate: number;
  verificationRate: number;
}

export interface DispositionBucket {
  disposition: string;
  count: number;
}

export interface LifecycleMetrics {
  avgDaysToUse: number | null;
  avgDaysToVerify: number | null;
  avgLifecycleAge: number | null;
  agingBuckets: { over30: number; over60: number; over90: number };
}

export interface ExceptionRow {
  locationId: string;
  itemName: string;
  siteLabel: string;
  serialNumber: string | null;
  lotNumber: string | null;
  disposition: string;
  issues: string[];
}

export interface SiteAnalyticsRow {
  studySiteId: string;
  siteLabel: string;
  total: number;
  available: number;
  used: number;
  pendingVerification: number;
  missingDataCount: number;
  verificationRate: number;
  dataQualityScore: number;
}

export interface UserActivityRow {
  userName: string;
  received: number;
  dispensed: number;
  verified: number;
  total: number;
}

export interface AnalyticsFilters {
  supplyName: string;
  disposition: string;
  dateFrom: string;
  dateTo: string;
  missingDataOnly: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function blank(v: string | null | undefined): boolean {
  return v == null || v.trim() === '';
}

function daysBetween(a: string, b: string): number | null {
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return null;
  return Math.abs(db.getTime() - da.getTime()) / 86_400_000;
}

function siteLabel(row: IpLogRow): string {
  if (row.site_number && row.site_name) return `${row.site_number} — ${row.site_name}`;
  return row.site_name ?? row.site_number ?? 'Unknown site';
}

function rowHasMissingData(r: IpLogRow): boolean {
  if (blank(r.serial_number) || blank(r.lot_number)) return true;
  if (r.disposition === 'used') {
    if (blank(r.dispensed_subject_number) || blank(r.dispensed_by_name) || !r.dispensed_at) return true;
  }
  if (r.verified_at) {
    if (blank(r.verified_by_name)) return true;
  }
  if (!r.received_at || blank(r.received_by_name)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// KPI metrics
// ---------------------------------------------------------------------------

export function computeKpiMetrics(rows: IpLogRow[]): AnalyticsKpis {
  const totalUnits = rows.length;
  let availableCount = 0;
  let usedCount = 0;
  let verifiedCount = 0;
  let pendingVerificationCount = 0;
  let missingSerialCount = 0;
  let missingLotCount = 0;

  for (const r of rows) {
    if (r.disposition === 'available') availableCount++;
    if (r.disposition === 'used') usedCount++;
    if (r.verified_at || r.verified_by_name) verifiedCount++;
    if (r.disposition === 'used' && !r.verified_at && !r.verified_by_name) pendingVerificationCount++;
    if (blank(r.serial_number)) missingSerialCount++;
    if (blank(r.lot_number)) missingLotCount++;
  }

  const utilizationRate = totalUnits > 0 ? (usedCount / totalUnits) * 100 : 0;
  const verificationRate = usedCount > 0 ? (verifiedCount / usedCount) * 100 : 0;

  return {
    totalUnits,
    availableCount,
    usedCount,
    verifiedCount,
    pendingVerificationCount,
    missingSerialCount,
    missingLotCount,
    utilizationRate: Math.round(utilizationRate * 10) / 10,
    verificationRate: Math.min(100, Math.round(verificationRate * 10) / 10),
  };
}

// ---------------------------------------------------------------------------
// Disposition breakdown
// ---------------------------------------------------------------------------

const DISPOSITION_ORDER = ['available', 'used', 'verified', 'returned', 'destroyed', 'transferred', 'archived'];

export function computeDispositionBreakdown(rows: IpLogRow[]): DispositionBucket[] {
  const counts = new Map<string, number>();
  for (const d of DISPOSITION_ORDER) counts.set(d, 0);

  for (const r of rows) {
    if (r.order_deleted_at) {
      counts.set('archived', (counts.get('archived') ?? 0) + 1);
    } else if (r.disposition === 'used' && r.verified_at) {
      counts.set('verified', (counts.get('verified') ?? 0) + 1);
    } else {
      const d = r.disposition || 'available';
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
  }

  return DISPOSITION_ORDER.map((d) => ({ disposition: d, count: counts.get(d) ?? 0 })).filter(
    (b) => b.count > 0
  );
}

// ---------------------------------------------------------------------------
// Lifecycle / timing
// ---------------------------------------------------------------------------

export function computeLifecycleMetrics(rows: IpLogRow[]): LifecycleMetrics {
  const now = new Date();
  const daysToUseList: number[] = [];
  const daysToVerifyList: number[] = [];
  const ageList: number[] = [];
  let over30 = 0;
  let over60 = 0;
  let over90 = 0;

  for (const r of rows) {
    if (r.received_at && r.dispensed_at) {
      const d = daysBetween(r.received_at, r.dispensed_at);
      if (d != null) daysToUseList.push(d);
    }
    if (r.dispensed_at && r.verified_at) {
      const d = daysBetween(r.dispensed_at, r.verified_at);
      if (d != null) daysToVerifyList.push(d);
    }
    if (r.received_at) {
      const d = daysBetween(r.received_at, now.toISOString());
      if (d != null) ageList.push(d);
    }

    if (r.disposition === 'available' && r.received_at) {
      const age = daysBetween(r.received_at, now.toISOString());
      if (age != null) {
        if (age > 90) over90++;
        else if (age > 60) over60++;
        else if (age > 30) over30++;
      }
    }
  }

  const avg = (arr: number[]) => (arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);

  return {
    avgDaysToUse: avg(daysToUseList),
    avgDaysToVerify: avg(daysToVerifyList),
    avgLifecycleAge: avg(ageList),
    agingBuckets: { over30, over60, over90 },
  };
}

// ---------------------------------------------------------------------------
// Exceptions / data quality
// ---------------------------------------------------------------------------

export function computeExceptionRows(rows: IpLogRow[]): ExceptionRow[] {
  const out: ExceptionRow[] = [];

  for (const r of rows) {
    const issues: string[] = [];

    if (blank(r.serial_number)) issues.push('Missing serial number');
    if (blank(r.lot_number)) issues.push('Missing lot number');

    if (r.disposition === 'used') {
      if (!r.dispensed_at) issues.push('Used but no used date');
      if (blank(r.dispensed_subject_number)) issues.push('Used but no subject study number');
      if (blank(r.dispensed_by_name)) issues.push('Used but no dispensed by');
    }

    if (r.verified_at && blank(r.verified_by_name)) issues.push('Verified but missing verified by');
    if (r.verified_at && !r.dispensed_at && r.disposition === 'available')
      issues.push('Verified date exists but disposition is still Available');

    if (r.dispensed_at && r.received_at) {
      const recv = new Date(r.received_at).getTime();
      const used = new Date(r.dispensed_at).getTime();
      if (!Number.isNaN(recv) && !Number.isNaN(used) && recv > used)
        issues.push('Received date is after used date');
    }

    if (!r.received_at || blank(r.received_by_name)) issues.push('Incomplete receipt data');

    if (issues.length > 0) {
      out.push({
        locationId: r.location_id,
        itemName: r.item_name,
        siteLabel: siteLabel(r),
        serialNumber: r.serial_number,
        lotNumber: r.lot_number,
        disposition: r.disposition,
        issues,
      });
    }
  }

  return out;
}

export function computeExceptionSummary(exceptions: ExceptionRow[]): { type: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of exceptions) {
    for (const issue of e.issues) {
      counts.set(issue, (counts.get(issue) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Site analytics
// ---------------------------------------------------------------------------

export function computeSiteAnalytics(rows: IpLogRow[]): SiteAnalyticsRow[] {
  const map = new Map<string, { label: string; rows: IpLogRow[] }>();

  for (const r of rows) {
    const key = r.study_site_id;
    if (!map.has(key)) map.set(key, { label: siteLabel(r), rows: [] });
    map.get(key)!.rows.push(r);
  }

  return Array.from(map.entries()).map(([studySiteId, { label, rows: siteRows }]) => {
    const total = siteRows.length;
    const available = siteRows.filter((r) => r.disposition === 'available').length;
    const used = siteRows.filter((r) => r.disposition === 'used').length;
    const verified = siteRows.filter((r) => r.verified_at || r.verified_by_name).length;
    const pendingVerification = siteRows.filter(
      (r) => r.disposition === 'used' && !r.verified_at && !r.verified_by_name
    ).length;
    const missingDataCount = siteRows.filter(rowHasMissingData).length;
    const verificationRate = used > 0 ? Math.min(100, Math.round((verified / used) * 1000) / 10) : 0;
    const dataQualityScore = total > 0 ? Math.round(((total - missingDataCount) / total) * 1000) / 10 : 100;

    return { studySiteId, siteLabel: label, total, available, used, pendingVerification, missingDataCount, verificationRate, dataQualityScore };
  }).sort((a, b) => b.total - a.total);
}

// ---------------------------------------------------------------------------
// User activity
// ---------------------------------------------------------------------------

export function computeUserActivity(rows: IpLogRow[]): UserActivityRow[] {
  const map = new Map<string, { received: number; dispensed: number; verified: number }>();

  for (const r of rows) {
    for (const [name, field] of [
      [r.received_by_name, 'received'],
      [r.dispensed_by_name, 'dispensed'],
      [r.verified_by_name, 'verified'],
    ] as const) {
      if (!blank(name)) {
        const n = name!.trim();
        if (!map.has(n)) map.set(n, { received: 0, dispensed: 0, verified: 0 });
        const entry = map.get(n)!;
        entry[field]++;
      }
    }
  }

  return Array.from(map.entries())
    .map(([userName, counts]) => ({
      userName,
      ...counts,
      total: counts.received + counts.dispensed + counts.verified,
    }))
    .sort((a, b) => b.total - a.total);
}

// ---------------------------------------------------------------------------
// Data quality score
// ---------------------------------------------------------------------------

export function computeDataQualityScore(rows: IpLogRow[]): number {
  if (rows.length === 0) return 100;
  const withIssues = rows.filter(rowHasMissingData).length;
  return Math.round(((rows.length - withIssues) / rows.length) * 1000) / 10;
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export function emptyFilters(): AnalyticsFilters {
  return { supplyName: '', disposition: '', dateFrom: '', dateTo: '', missingDataOnly: false };
}

export function filterRows(rows: IpLogRow[], f: AnalyticsFilters): IpLogRow[] {
  let out = rows;

  if (f.supplyName) {
    const q = f.supplyName.toLowerCase();
    out = out.filter((r) => r.item_name.toLowerCase().includes(q));
  }

  if (f.disposition) {
    if (f.disposition === 'verified') {
      out = out.filter((r) => !!(r.verified_at || r.verified_by_name));
    } else if (f.disposition === 'archived') {
      out = out.filter((r) => !!r.order_deleted_at);
    } else {
      out = out.filter((r) => r.disposition === f.disposition);
    }
  }

  if (f.dateFrom) {
    const from = new Date(f.dateFrom).getTime();
    if (!Number.isNaN(from)) out = out.filter((r) => r.received_at && new Date(r.received_at).getTime() >= from);
  }

  if (f.dateTo) {
    const to = new Date(f.dateTo).getTime();
    if (!Number.isNaN(to)) out = out.filter((r) => r.received_at && new Date(r.received_at).getTime() <= to);
  }

  if (f.missingDataOnly) {
    out = out.filter(rowHasMissingData);
  }

  return out;
}

// ---------------------------------------------------------------------------
// CSV export builder
// ---------------------------------------------------------------------------

export function buildAnalyticsCsv(rows: IpLogRow[]): string {
  const headers = [
    'Item Name', 'Category', 'Serial Number', 'Lot Number', 'Disposition',
    'Received By', 'Received Date', 'Dispensed By', 'Used Date',
    'Subject Study Number', 'Verified By', 'Verified Date',
    'Site', 'Notes',
  ];

  const esc = (v: string | null | undefined) => {
    const s = (v ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };

  const csvRows = rows.map((r) =>
    [
      esc(r.item_name), esc(r.category), esc(r.serial_number), esc(r.lot_number),
      esc(r.disposition), esc(r.received_by_name), esc(r.received_at),
      esc(r.dispensed_by_name), esc(r.dispensed_at), esc(r.dispensed_subject_number),
      esc(r.verified_by_name), esc(r.verified_at),
      esc(r.site_name), esc(r.notes),
    ].join(',')
  );

  return [headers.join(','), ...csvRows].join('\n');
}
