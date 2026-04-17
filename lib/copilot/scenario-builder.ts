import 'server-only';

/**
 * Scenario projections.
 *
 * Lightweight, deterministic what-if math used by `/api/ai/scenarios` and the
 * `scenario-modeler` agent. The output is intentionally simple (baseline,
 * scenario, delta, confidence) so the UI can render a side-by-side preview.
 *
 * Real engagements will swap these heuristics for richer simulation (Monte
 * Carlo, queueing models). The contract is the surface, not the math.
 */

export type ScenarioKind =
  | 'add_sites'
  | 'remove_site'
  | 'timeline_shift'
  | 'enrollment_rate'
  | 'budget_change'
  | 'dropout_rate';

export interface ScenarioInputs {
  kind: ScenarioKind;
  /** Free-form natural language the user typed. */
  prompt: string;
  /** Numeric magnitude of the change (sites added, weeks slipped, % change). */
  magnitude?: number;
  /** Optional study scope. */
  studyId?: string | null;
  /** Optional baseline overrides for unit tests / canned demos. */
  baseline?: Partial<ScenarioBaseline>;
}

export interface ScenarioBaseline {
  enrolledSubjects: number;
  targetEnrollment: number;
  activeSites: number;
  meanEnrollmentPerSitePerWeek: number;
  meanCostPerSubject: number;
  expectedLastSubjectInWeeks: number;
  dropoutRate: number;
}

export interface ScenarioRow {
  label: string;
  baseline: number | string;
  scenario: number | string;
  delta: string;
  /** True when `scenario` is meaningfully different from `baseline`. */
  changed: boolean;
}

export interface ScenarioProjection {
  inputs: ScenarioInputs;
  baseline: ScenarioBaseline;
  rows: ScenarioRow[];
  confidence: 'high' | 'medium' | 'low';
  caveats: string[];
  /** What the user should do next, in priority order. */
  nextActions: { label: string; agentId: string }[];
}

const DEFAULT_BASELINE: ScenarioBaseline = {
  enrolledSubjects: 184,
  targetEnrollment: 240,
  activeSites: 18,
  meanEnrollmentPerSitePerWeek: 0.45,
  meanCostPerSubject: 22500,
  expectedLastSubjectInWeeks: 18,
  dropoutRate: 0.08,
};

function fmtPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${(n * 100).toFixed(1)}%`;
}

function fmtNum(n: number, fractionDigits = 0): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
}

function fmtMoney(n: number): string {
  return `$${fmtNum(Math.round(n))}`;
}

function project(inputs: ScenarioInputs): ScenarioProjection {
  const baseline: ScenarioBaseline = { ...DEFAULT_BASELINE, ...inputs.baseline };
  const rows: ScenarioRow[] = [];
  const caveats: string[] = [];
  const nextActions: ScenarioProjection['nextActions'] = [];
  let confidence: ScenarioProjection['confidence'] = 'medium';

  switch (inputs.kind) {
    case 'add_sites': {
      const delta = inputs.magnitude ?? 1;
      const newSites = baseline.activeSites + delta;
      const weeklyEnrollmentBaseline = baseline.activeSites * baseline.meanEnrollmentPerSitePerWeek;
      const weeklyEnrollmentScenario = newSites * baseline.meanEnrollmentPerSitePerWeek;
      const weeksToTarget = (baseline.targetEnrollment - baseline.enrolledSubjects) / weeklyEnrollmentScenario;
      const weeksSaved = baseline.expectedLastSubjectInWeeks - weeksToTarget;
      const additionalCost = delta * 80000; // mean site startup
      rows.push({
        label: 'Active sites',
        baseline: baseline.activeSites,
        scenario: newSites,
        delta: `+${delta}`,
        changed: true,
      });
      rows.push({
        label: 'Weekly enrollment',
        baseline: fmtNum(weeklyEnrollmentBaseline, 1),
        scenario: fmtNum(weeklyEnrollmentScenario, 1),
        delta: fmtPct((weeklyEnrollmentScenario - weeklyEnrollmentBaseline) / weeklyEnrollmentBaseline),
        changed: true,
      });
      rows.push({
        label: 'Weeks to LSI',
        baseline: fmtNum(baseline.expectedLastSubjectInWeeks, 1),
        scenario: fmtNum(Math.max(weeksToTarget, 0), 1),
        delta: weeksSaved >= 0 ? `-${fmtNum(weeksSaved, 1)}w` : `+${fmtNum(-weeksSaved, 1)}w`,
        changed: Math.abs(weeksSaved) > 0.1,
      });
      rows.push({
        label: 'Site startup spend',
        baseline: fmtMoney(0),
        scenario: fmtMoney(additionalCost),
        delta: `+${fmtMoney(additionalCost)}`,
        changed: true,
      });
      caveats.push(
        'Assumes new sites match the historical mean enrollment/site/week. Activation latency (typically 8-12 weeks) is not modeled.',
      );
      nextActions.push({ label: 'Open Enrollment Forecaster for full timeline', agentId: 'enrollment-forecaster' });
      confidence = baseline.meanEnrollmentPerSitePerWeek > 0.2 ? 'medium' : 'low';
      break;
    }
    case 'remove_site': {
      const removed = inputs.magnitude ?? 1;
      const newSites = Math.max(baseline.activeSites - removed, 1);
      const weeklyEnrollmentBaseline = baseline.activeSites * baseline.meanEnrollmentPerSitePerWeek;
      const weeklyEnrollmentScenario = newSites * baseline.meanEnrollmentPerSitePerWeek;
      const weeksToTarget = (baseline.targetEnrollment - baseline.enrolledSubjects) / Math.max(weeklyEnrollmentScenario, 0.01);
      rows.push({
        label: 'Active sites',
        baseline: baseline.activeSites,
        scenario: newSites,
        delta: `-${removed}`,
        changed: true,
      });
      rows.push({
        label: 'Weekly enrollment',
        baseline: fmtNum(weeklyEnrollmentBaseline, 1),
        scenario: fmtNum(weeklyEnrollmentScenario, 1),
        delta: fmtPct((weeklyEnrollmentScenario - weeklyEnrollmentBaseline) / weeklyEnrollmentBaseline),
        changed: true,
      });
      rows.push({
        label: 'Weeks to LSI',
        baseline: fmtNum(baseline.expectedLastSubjectInWeeks, 1),
        scenario: fmtNum(weeksToTarget, 1),
        delta: `+${fmtNum(weeksToTarget - baseline.expectedLastSubjectInWeeks, 1)}w`,
        changed: true,
      });
      caveats.push('Site closeout cost (~$45k typical) and subject re-consent burden are not in this projection.');
      nextActions.push({ label: 'Generate site closeout checklist', agentId: 'monitoring-planner' });
      confidence = 'medium';
      break;
    }
    case 'timeline_shift': {
      const weeks = inputs.magnitude ?? 4;
      rows.push({
        label: 'Last Subject In',
        baseline: `${fmtNum(baseline.expectedLastSubjectInWeeks, 1)}w`,
        scenario: `${fmtNum(baseline.expectedLastSubjectInWeeks + weeks, 1)}w`,
        delta: `+${weeks}w`,
        changed: true,
      });
      const carryCost = weeks * 18000;
      rows.push({
        label: 'Estimated carry cost',
        baseline: fmtMoney(0),
        scenario: fmtMoney(carryCost),
        delta: `+${fmtMoney(carryCost)}`,
        changed: true,
      });
      caveats.push('Carry cost uses an industry mean of $18k/week per active study; actual spend depends on contract.');
      nextActions.push({ label: 'Notify finance — update milestone forecast', agentId: 'finance-narrator' });
      break;
    }
    case 'enrollment_rate': {
      const pctChange = (inputs.magnitude ?? 10) / 100;
      const newRate = baseline.meanEnrollmentPerSitePerWeek * (1 + pctChange);
      const weeklyEnrollmentScenario = baseline.activeSites * newRate;
      const weeksToTarget = (baseline.targetEnrollment - baseline.enrolledSubjects) / Math.max(weeklyEnrollmentScenario, 0.01);
      rows.push({
        label: 'Mean enrollment / site / wk',
        baseline: fmtNum(baseline.meanEnrollmentPerSitePerWeek, 2),
        scenario: fmtNum(newRate, 2),
        delta: fmtPct(pctChange),
        changed: true,
      });
      rows.push({
        label: 'Weeks to LSI',
        baseline: fmtNum(baseline.expectedLastSubjectInWeeks, 1),
        scenario: fmtNum(weeksToTarget, 1),
        delta: `${(weeksToTarget - baseline.expectedLastSubjectInWeeks).toFixed(1)}w`,
        changed: true,
      });
      break;
    }
    case 'budget_change': {
      const pctChange = (inputs.magnitude ?? -10) / 100;
      const baselineBudget = baseline.targetEnrollment * baseline.meanCostPerSubject;
      const scenarioBudget = baselineBudget * (1 + pctChange);
      rows.push({
        label: 'Trial budget',
        baseline: fmtMoney(baselineBudget),
        scenario: fmtMoney(scenarioBudget),
        delta: fmtPct(pctChange),
        changed: true,
      });
      caveats.push('A budget cut without scope cut typically slips LSI by 8-12%; surface that trade-off explicitly.');
      nextActions.push({ label: 'Run portfolio financial review', agentId: 'finance-narrator' });
      break;
    }
    case 'dropout_rate': {
      const pctPoints = (inputs.magnitude ?? 2) / 100;
      const newDropout = Math.max(baseline.dropoutRate + pctPoints, 0);
      const subjectsToReplace = Math.max(0, baseline.enrolledSubjects * pctPoints);
      rows.push({
        label: 'Dropout rate',
        baseline: fmtPct(baseline.dropoutRate),
        scenario: fmtPct(newDropout),
        delta: fmtPct(pctPoints),
        changed: true,
      });
      rows.push({
        label: 'Additional subjects to enroll',
        baseline: 0,
        scenario: Math.ceil(subjectsToReplace),
        delta: `+${Math.ceil(subjectsToReplace)}`,
        changed: subjectsToReplace > 0,
      });
      break;
    }
  }

  return {
    inputs,
    baseline,
    rows,
    confidence,
    caveats,
    nextActions,
  };
}

/**
 * Heuristic NL parser. Looks for verb cues + numbers to pick a scenario kind.
 * The agent path can also call `runScenario` directly with structured inputs.
 */
export function parseScenarioPrompt(prompt: string): ScenarioInputs {
  const lower = prompt.toLowerCase();

  const numMatch = prompt.match(/(-?\d+(?:\.\d+)?)/);
  const magnitude = numMatch ? Number(numMatch[1]) : undefined;

  if (/\b(add|open|activate|launch).{0,15}site/.test(lower)) {
    return { kind: 'add_sites', prompt, magnitude: magnitude ?? 1 };
  }
  if (/\b(close|drop|remove|deactivate).{0,15}site/.test(lower)) {
    return { kind: 'remove_site', prompt, magnitude: magnitude ?? 1 };
  }
  if (/\bslip|delay|push.{0,5}back|extend.{0,5}timeline/.test(lower)) {
    return { kind: 'timeline_shift', prompt, magnitude: magnitude ?? 4 };
  }
  if (/(enroll|recruitment|accrual)/.test(lower) && /(rate|pace|speed)/.test(lower)) {
    return { kind: 'enrollment_rate', prompt, magnitude: magnitude ?? 10 };
  }
  if (/(budget|spend|cost)/.test(lower) && /(cut|reduce|increase|raise|change)/.test(lower)) {
    return { kind: 'budget_change', prompt, magnitude: magnitude ?? -10 };
  }
  if (/(dropout|attrition|withdraw)/.test(lower)) {
    return { kind: 'dropout_rate', prompt, magnitude: magnitude ?? 2 };
  }

  return { kind: 'add_sites', prompt, magnitude: magnitude ?? 1 };
}

export function runScenario(inputsOrPrompt: ScenarioInputs | string): ScenarioProjection {
  const inputs = typeof inputsOrPrompt === 'string' ? parseScenarioPrompt(inputsOrPrompt) : inputsOrPrompt;
  return project(inputs);
}
