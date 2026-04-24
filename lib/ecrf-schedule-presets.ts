/**
 * Shared, server-action-safe definitions for the eCRF Builder's
 * "Auto-generate Schedule" Quick Action.
 *
 * These constants are imported by both client components (the action toolbar
 * dropdown) and the server action that inserts the rows. They live outside
 * `lib/actions/*` because Next.js 'use server' modules may only export async
 * functions — exporting a `const` array from there triggers
 * `invalid-use-server-value` at runtime.
 */

export type EcrfSchedulePresetId =
  | 'screen_baseline_followups'
  | 'phase1_oncology_short'
  | 'long_term_followup';

export interface EcrfSchedulePresetVisit {
  visit_name: string;
  timepoint_label: string | null;
  timepoint_days: number;
  window_before_days: number;
  window_after_days: number;
}

export const ECRF_SCHEDULE_PRESETS: Record<EcrfSchedulePresetId, EcrfSchedulePresetVisit[]> = {
  screen_baseline_followups: [
    { visit_name: 'Screening',  timepoint_label: 'Day -7 to -1', timepoint_days: -7, window_before_days: 0, window_after_days: 6 },
    { visit_name: 'Baseline',   timepoint_label: 'Day 0',        timepoint_days: 0,  window_before_days: 0, window_after_days: 2 },
    { visit_name: 'Day 30',     timepoint_label: 'Day 30',       timepoint_days: 30, window_before_days: 5, window_after_days: 5 },
    { visit_name: 'Day 90',     timepoint_label: 'Day 90',       timepoint_days: 90, window_before_days: 7, window_after_days: 7 },
    { visit_name: 'Day 180',    timepoint_label: 'Day 180',      timepoint_days: 180, window_before_days: 14, window_after_days: 14 },
  ],
  phase1_oncology_short: [
    { visit_name: 'Screening',       timepoint_label: 'Day -14 to -1', timepoint_days: -14, window_before_days: 0, window_after_days: 13 },
    { visit_name: 'Cycle 1 Day 1',   timepoint_label: 'C1D1',          timepoint_days: 0,   window_before_days: 0, window_after_days: 0 },
    { visit_name: 'Cycle 1 Day 8',   timepoint_label: 'C1D8',          timepoint_days: 7,   window_before_days: 1, window_after_days: 1 },
    { visit_name: 'Cycle 1 Day 15',  timepoint_label: 'C1D15',         timepoint_days: 14,  window_before_days: 1, window_after_days: 1 },
    { visit_name: 'End of Treatment',timepoint_label: 'EOT',           timepoint_days: 28,  window_before_days: 3, window_after_days: 3 },
    { visit_name: 'Safety Follow-up',timepoint_label: '+30 days',      timepoint_days: 58,  window_before_days: 5, window_after_days: 5 },
  ],
  long_term_followup: [
    { visit_name: 'Baseline',   timepoint_label: 'Day 0',     timepoint_days: 0,    window_before_days: 0,  window_after_days: 0 },
    { visit_name: '6 Months',   timepoint_label: 'Mo 6',      timepoint_days: 180,  window_before_days: 14, window_after_days: 14 },
    { visit_name: '1 Year',     timepoint_label: 'Yr 1',      timepoint_days: 365,  window_before_days: 30, window_after_days: 30 },
    { visit_name: '2 Year',     timepoint_label: 'Yr 2',      timepoint_days: 730,  window_before_days: 30, window_after_days: 30 },
    { visit_name: '5 Year',     timepoint_label: 'Yr 5',      timepoint_days: 1825, window_before_days: 60, window_after_days: 60 },
  ],
};

export const ECRF_SCHEDULE_PRESET_OPTIONS: ReadonlyArray<{
  id: EcrfSchedulePresetId;
  label: string;
  description: string;
}> = [
  {
    id: 'screen_baseline_followups',
    label: 'Screening + Baseline + Follow-ups',
    description: 'Screening, Baseline, then Day 30 / 90 / 180 follow-ups.',
  },
  {
    id: 'phase1_oncology_short',
    label: 'Phase 1 Oncology (single cycle)',
    description: 'Screening through Cycle 1 with EOT and safety follow-up.',
  },
  {
    id: 'long_term_followup',
    label: 'Long-term Follow-up',
    description: 'Baseline through 5-year follow-up at standard cadence.',
  },
];
