import 'server-only';

/**
 * Natural-language report builder.
 *
 * Takes a plain-English prompt ("show enrollment by country, exclude paused
 * studies") and returns a structured spec the UI renders into a preview. The
 * spec is intentionally narrow in Phase 4 — we cover the dimensions clinical
 * ops teams actually use (entity, filters, group-by, chart type) — so the
 * preview stays trustworthy. Future phases can extend the grammar.
 *
 * The parser is deterministic regex-based so the preview never drifts. The
 * `nl-report-builder` agent handles the chat surface and falls back to this
 * spec when the user hits "Save" or "Open in Reports".
 */

export type ReportEntity =
  | 'studies'
  | 'sites'
  | 'subjects'
  | 'visits'
  | 'tasks'
  | 'documents'
  | 'financials'
  | 'deviations';

export type ReportChartType = 'table' | 'bar' | 'line' | 'pie' | 'gauge' | 'kpi';

export interface ReportFilter {
  field: string;
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: string | number | string[] | number[];
  display: string;
}

export interface ReportSpec {
  entity: ReportEntity;
  filters: ReportFilter[];
  groupBy: string[];
  metrics: { id: string; label: string; aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max' }[];
  chart: ReportChartType;
  headline: string;
  caveats: string[];
}

// Order matters: more specific signals (financials, deviations) should be
// checked before broad ones (sites, studies) so e.g. "payments by site" picks
// financials with site as a group-by, not sites as the entity.
const ENTITY_KEYWORDS: { entity: ReportEntity; words: string[] }[] = [
  { entity: 'financials', words: ['financ', 'budget', 'spend', 'invoice', 'payment', 'cost'] },
  { entity: 'deviations', words: ['deviation', 'protocol violation', 'non-compliance'] },
  { entity: 'documents', words: ['document', 'tmf', 'artifact', 'file'] },
  { entity: 'tasks', words: ['task', 'capa', 'action item', 'to-do', 'todo'] },
  { entity: 'visits', words: ['visit', 'appointment'] },
  { entity: 'subjects', words: ['subject', 'patient', 'participant', 'enrol'] },
  { entity: 'sites', words: ['site', 'investigator', 'institution'] },
  { entity: 'studies', words: ['stud', 'protocol', 'trial'] },
];

const STATUS_VALUES = ['active', 'paused', 'closed', 'completed', 'pending', 'draft'];
const COUNTRY_HINTS = ['country', 'region', 'geography'];
const PHASE_VALUES = ['phase 1', 'phase 2', 'phase 3', 'phase 4'];

function detectEntity(prompt: string): ReportEntity {
  const lower = prompt.toLowerCase();
  for (const { entity, words } of ENTITY_KEYWORDS) {
    if (words.some(w => lower.includes(w))) return entity;
  }
  return 'studies';
}

function detectChart(prompt: string): ReportChartType {
  const lower = prompt.toLowerCase();
  if (/\b(line|over time|trend)\b/.test(lower)) return 'line';
  if (/\b(pie|share|distribution)\b/.test(lower)) return 'pie';
  if (/\b(bar|by country|by site|by phase|by status|grouped by|count)\b/.test(lower)) return 'bar';
  if (/\b(gauge|score|readiness)\b/.test(lower)) return 'gauge';
  if (/\b(kpi|total|sum|average|avg|count of)\b/.test(lower)) return 'kpi';
  return 'table';
}

function detectFilters(prompt: string): ReportFilter[] {
  const filters: ReportFilter[] = [];
  const lower = prompt.toLowerCase();

  // exclude/include status
  for (const status of STATUS_VALUES) {
    if (lower.includes(`exclude ${status}`) || lower.includes(`without ${status}`) || lower.includes(`not ${status}`)) {
      filters.push({ field: 'status', op: 'neq', value: status, display: `Status ≠ ${status}` });
    } else if (
      lower.includes(`only ${status}`) ||
      lower.includes(`${status} only`) ||
      lower.includes(`with status ${status}`)
    ) {
      filters.push({ field: 'status', op: 'eq', value: status, display: `Status = ${status}` });
    }
  }

  // active by default if user said "active"
  if (lower.includes('active') && !filters.some(f => f.field === 'status')) {
    filters.push({ field: 'status', op: 'eq', value: 'active', display: 'Status = active' });
  }

  // phase
  for (const phase of PHASE_VALUES) {
    if (lower.includes(phase)) {
      filters.push({ field: 'phase', op: 'eq', value: phase, display: `Phase = ${phase}` });
    }
  }

  // therapeutic area
  const taMatch = lower.match(/\b(oncology|cardiology|neurology|immunology|infectious disease|rare disease)\b/);
  if (taMatch) {
    filters.push({
      field: 'therapeutic_area',
      op: 'eq',
      value: taMatch[1],
      display: `Therapeutic area = ${taMatch[1]}`,
    });
  }

  // numeric thresholds (e.g. "enrollment < 50%")
  const pctMatch = lower.match(/(enrollment|completion|sdv|recruitment)\s*[<>]=?\s*(\d{1,3})\s*%/);
  if (pctMatch) {
    const op = lower.includes('<=') ? 'lte' : lower.includes('>=') ? 'gte' : lower.includes('<') ? 'lt' : 'gt';
    filters.push({
      field: pctMatch[1],
      op,
      value: Number(pctMatch[2]),
      display: `${pctMatch[1]} ${op === 'gte' ? '≥' : op === 'lte' ? '≤' : op === 'gt' ? '>' : '<'} ${pctMatch[2]}%`,
    });
  }

  return filters;
}

function detectGroupBy(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  const groups: string[] = [];
  if (COUNTRY_HINTS.some(w => lower.includes(`by ${w}`))) groups.push('country');
  if (lower.includes('by status')) groups.push('status');
  if (lower.includes('by site')) groups.push('site');
  if (lower.includes('by study')) groups.push('study');
  if (lower.includes('by phase')) groups.push('phase');
  if (lower.includes('by month')) groups.push('month');
  if (lower.includes('by quarter')) groups.push('quarter');
  return groups;
}

function detectMetrics(prompt: string, entity: ReportEntity): ReportSpec['metrics'] {
  const lower = prompt.toLowerCase();
  if (entity === 'financials') {
    if (lower.includes('avg') || lower.includes('average')) {
      return [{ id: 'avg_amount', label: 'Average amount', aggregation: 'avg' }];
    }
    return [{ id: 'sum_amount', label: 'Total amount', aggregation: 'sum' }];
  }
  return [{ id: 'count', label: `Count of ${entity}`, aggregation: 'count' }];
}

function buildHeadline(spec: Omit<ReportSpec, 'headline' | 'caveats'>): string {
  const metric = spec.metrics[0]?.label ?? `Count of ${spec.entity}`;
  const grouping = spec.groupBy.length ? ` by ${spec.groupBy.join(' and ')}` : '';
  const filterPart = spec.filters.length ? ` (${spec.filters.map(f => f.display).join(', ')})` : '';
  return `${metric}${grouping}${filterPart}`;
}

export function buildReportSpec(prompt: string): ReportSpec {
  const trimmed = prompt.trim();
  const entity = detectEntity(trimmed);
  const filters = detectFilters(trimmed);
  const groupBy = detectGroupBy(trimmed);
  const metrics = detectMetrics(trimmed, entity);
  const chart = detectChart(trimmed);

  const partial: Omit<ReportSpec, 'headline' | 'caveats'> = {
    entity,
    filters,
    groupBy,
    metrics,
    chart,
  };

  const caveats: string[] = [];
  if (!filters.length) {
    caveats.push('No filters detected — the report will return all records of this entity.');
  }
  if (chart !== 'table' && !groupBy.length) {
    caveats.push(`A ${chart} chart usually needs a grouping; defaulting to a flat axis.`);
  }
  if (entity === 'financials' && !filters.some(f => f.field === 'status')) {
    caveats.push('Financial reports usually exclude voided invoices — add an explicit filter if needed.');
  }

  return {
    ...partial,
    headline: buildHeadline(partial),
    caveats,
  };
}
