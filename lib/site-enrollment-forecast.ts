/**
 * v1 enrollment forecast: monthly cumulative **actual** from subject dates;
 * **expected** = linear ramp to target from activation to plan end (or 18m fallback);
 * **forecast** extends the recent monthly enrollment rate. Delay vs plan is approximate
 * (calendar months). Product may replace with protocol-driven targets.
 */
import { addMonths, endOfMonth, startOfMonth, subMonths, format, differenceInCalendarMonths, max } from 'date-fns';
import type { SubjectWithSite } from '@/lib/types/ctms';

const ENROLLED = new Set<SubjectWithSite['status']>(['randomized', 'active', 'completed']);

function subjectEnrollmentEventDate(s: SubjectWithSite): Date | null {
  if (!ENROLLED.has(s.status)) return null;
  if (s.randomization_date) return new Date(s.randomization_date);
  return new Date(s.created_at);
}

export type EnrollmentPoint = {
  month: string; // "Mar '26"
  monthKey: string;
  actual: number;
  expected: number;
  forecast: number;
};

type BuildSeriesParams = {
  subjects: SubjectWithSite[];
  targetEnrollment: number;
  activationDate: string | null;
  planEnd: string | null;
};

const DISPLAY_FMT = (d: Date) => format(d, "MMM ''yy");

/**
 * Cumulative enrollment by month: actual, linear expected ramp, and trend-based forecast.
 */
export function buildEnrollmentCumulativeSeries(params: BuildSeriesParams): {
  points: EnrollmentPoint[];
  targetEnrollment: number;
  expectedByNow: number;
  planCompletionDate: Date | null;
  projectedCompletionDate: Date | null;
  monthsBehind: number;
  behindPlan: boolean;
} {
  const { subjects, targetEnrollment, activationDate, planEnd } = params;
  const t = targetEnrollment > 0 ? targetEnrollment : 0;
  const act = activationDate ? new Date(activationDate) : null;
  const end = planEnd
    ? new Date(planEnd)
    : act
      ? addMonths(max([act, new Date()]), 18)
      : addMonths(new Date(), 18);

  const start = act ?? subMonths(new Date(), 6);
  const endClamped = endOfMonth(max([start, end, new Date()]));

  const firstMonth = startOfMonth(start);
  const lastMonth = startOfMonth(endClamped);
  const totalMonths = Math.max(1, differenceInCalendarMonths(lastMonth, firstMonth) + 1);

  const monthKeys: string[] = [];
  for (let i = 0; i < totalMonths; i += 1) {
    const m = addMonths(firstMonth, i);
    if (m > lastMonth) break;
    monthKeys.push(startOfMonth(m).toISOString());
  }
  if (monthKeys.length === 0) {
    monthKeys.push(startOfMonth(new Date()).toISOString());
  }

  const enrolledByMonth = new Map<string, number>();
  for (const s of subjects) {
    const d = subjectEnrollmentEventDate(s);
    if (!d) continue;
    if (d < firstMonth) continue;
    if (d > endClamped) continue;
    const key = startOfMonth(d).toISOString();
    enrolledByMonth.set(key, (enrolledByMonth.get(key) ?? 0) + 1);
  }

  const actualCumulative: number[] = [];
  let running = 0;
  for (const k of monthKeys) {
    running += enrolledByMonth.get(k) ?? 0;
    running = t > 0 ? Math.min(running, t) : running;
    actualCumulative.push(running);
  }

  // Expected: linear to target
  const expected: number[] = monthKeys.map((_, i) =>
    t > 0 ? Math.min(t, Math.round((t * (i + 1)) / (monthKeys.length || 1))) : 0,
  );

  const now = new Date();
  const nowM = startOfMonth(now);
  const nowKey = nowM.toISOString();
  const nowIndex = monthKeys.findIndex((k) => k >= nowKey) >= 0
    ? monthKeys.findIndex((k) => k >= nowKey)
    : monthKeys.length - 1;
  const safeIdx = Math.max(0, nowIndex);
  const expectedByNow = expected[safeIdx] ?? 0;
  const lastActual = actualCumulative[safeIdx] ?? 0;
  const behindPlan = t > 0 && lastActual + 0.5 < expectedByNow - 0.5;

  // monthly rate from last 3 month deltas
  const deltas: number[] = actualCumulative.map((v, i) => (i === 0 ? v : v - (actualCumulative[i - 1] ?? 0)));
  const use = Math.min(3, deltas.length);
  const lastD = use > 0 ? deltas.slice(-use) : [0];
  const monthlyRate = lastD.length ? lastD.reduce((a, b) => a + b, 0) / lastD.length : 0;

  const lastAct = actualCumulative[actualCumulative.length - 1] ?? 0;
  const forecast: number[] = monthKeys.map((k, i) => {
    const a = actualCumulative[i] ?? 0;
    if (i <= nowIndex) {
      return a;
    }
    const mAfter = i - nowIndex;
    return t > 0
      ? Math.min(t, Math.max(a, lastAct + monthlyRate * mAfter))
      : a;
  });

  const points: EnrollmentPoint[] = monthKeys.map((k, i) => ({
    month: DISPLAY_FMT(new Date(k)),
    monthKey: k,
    actual: actualCumulative[i] ?? 0,
    expected: expected[i] ?? 0,
    forecast: forecast[i] ?? 0,
  }));

  const planCompletionDate: Date | null = planEnd ? new Date(planEnd) : new Date(endClamped);

  const remaining = t - lastAct;
  const projectedCompletionDate: Date | null =
    t > 0 && monthlyRate > 0.01 && lastAct < t
      ? addMonths(now, Math.max(0, Math.ceil(remaining / monthlyRate)))
      : t > 0 && lastAct >= t
        ? now
        : null;

  const monthsBehind =
    projectedCompletionDate && planEnd
      ? Math.max(0, Math.ceil(
          (projectedCompletionDate.getTime() - new Date(planEnd).getTime()) /
            (30.44 * 24 * 60 * 60 * 1000),
        ))
      : 0;

  return {
    points,
    targetEnrollment: t,
    expectedByNow,
    planCompletionDate,
    projectedCompletionDate: projectedCompletionDate ?? planCompletionDate,
    monthsBehind: Number.isFinite(monthsBehind) ? monthsBehind : 0,
    behindPlan,
  };
}
