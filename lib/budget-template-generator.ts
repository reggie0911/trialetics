/**
 * Pure function: generate a structured budget from wizard inputs.
 * No side effects -- returns a plan that the server action materialises in the DB.
 */

import type {
  BudgetSectionType,
  BudgetCostBasis,
  TemplateSectionDefinition,
  TemplateVisitScheduleEntry,
} from '@/lib/types/ctms';

// ─── Wizard input types ───────────────────────────────────────────────────────

export interface WizardStudyInputs {
  plannedEnrollment: number;
  studyDurationMonths: number;
  /** Optional study-level target total in the budget currency; does not alter generated line items (v1). */
  plannedBudgetAmount: number | null;
  /** Optional anticipated participating site count; hidden in site-scoped wizard. */
  plannedSitesCount: number | null;
  visits: Array<{ visitName: string; timepointDays?: number | null }>;
  procedureIntensity: 'low' | 'medium' | 'high';
}

export interface WizardFinancialAssumptions {
  indirectRatePercent: number; // e.g. 26
  monitoringVisitsPerYear: number;
  expectPassThroughCosts: boolean;
  benchmarkCostPerPatient?: number | null;
}

export interface WizardCostDrivers {
  useImaging: boolean;
  labComplexity: 'low' | 'medium' | 'high';
  staffRoles: string[]; // e.g. ['PI', 'Study Coordinator', 'CRA', 'Data Manager']
}

/** Stored in study_budgets.wizard_inputs (JSONB) for post-create edit/regenerate. */
export interface StudyBudgetWizardInputsSnapshot {
  studyInputs: WizardStudyInputs;
  assumptions: WizardFinancialAssumptions;
  drivers: WizardCostDrivers;
  saveAsTemplateIntent?: boolean;
  templateName?: string | null;
}

export const DEFAULT_WIZARD_STUDY_INPUTS: WizardStudyInputs = {
  plannedEnrollment: 20,
  studyDurationMonths: 24,
  plannedBudgetAmount: null,
  plannedSitesCount: null,
  visits: [
    { visitName: 'Baseline', timepointDays: 0 },
    { visitName: '1 Month', timepointDays: 30 },
    { visitName: '3 Month', timepointDays: 90 },
    { visitName: '6 Month', timepointDays: 180 },
    { visitName: 'End of Study', timepointDays: null },
  ],
  procedureIntensity: 'medium',
};

export const DEFAULT_WIZARD_ASSUMPTIONS: WizardFinancialAssumptions = {
  indirectRatePercent: 26,
  monitoringVisitsPerYear: 4,
  expectPassThroughCosts: true,
  benchmarkCostPerPatient: null,
};

export const DEFAULT_WIZARD_DRIVERS: WizardCostDrivers = {
  useImaging: false,
  labComplexity: 'medium',
  staffRoles: ['PI', 'Study Coordinator', 'CRA'],
};

export function buildWizardInputsSnapshot(
  studyInputs: WizardStudyInputs,
  assumptions: WizardFinancialAssumptions,
  drivers: WizardCostDrivers,
  extras?: { saveAsTemplateIntent?: boolean; templateName?: string | null }
): StudyBudgetWizardInputsSnapshot {
  return {
    studyInputs,
    assumptions,
    drivers,
    saveAsTemplateIntent: extras?.saveAsTemplateIntent ?? false,
    templateName: extras?.templateName ?? null,
  };
}

function isWizardSnapshot(value: unknown): value is StudyBudgetWizardInputsSnapshot {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    o.studyInputs != null &&
    typeof o.studyInputs === 'object' &&
    o.assumptions != null &&
    typeof o.assumptions === 'object' &&
    o.drivers != null &&
    typeof o.drivers === 'object'
  );
}

export function parseWizardInputsSnapshot(raw: unknown): StudyBudgetWizardInputsSnapshot | null {
  return isWizardSnapshot(raw) ? raw : null;
}

export interface GeneratedBudget {
  sections: TemplateSectionDefinition[];
  visitSchedule: TemplateVisitScheduleEntry[];
  estimatedTotal: number;
  plannedEnrollment: number;
  studyDurationMonths: number;
  indirectRate: number;
}

// ─── Generator ───────────────────────────────────────────────────────────────

export function generateBudgetFromWizard(
  inputs: WizardStudyInputs,
  assumptions: WizardFinancialAssumptions,
  drivers: WizardCostDrivers
): GeneratedBudget {
  const indirectRate = assumptions.indirectRatePercent / 100;
  const visitSchedule: TemplateVisitScheduleEntry[] = inputs.visits.map((v) => ({
    visit_name: v.visitName,
    timepoint_days: v.timepointDays ?? null,
  }));

  const sections: TemplateSectionDefinition[] = [];

  // ── Section A: Invoiceable Items ──────────────────────────────────────────
  if (assumptions.expectPassThroughCosts) {
    sections.push({
      section_type: 'invoiceable',
      name: 'Invoiceable Items (Startup / Pass-Through)',
      indirect_rate: indirectRate,
      default_lines: [
        { category: 'Startup', description: 'Study Feasibility', unit_cost: 1500, quantity: 1, cost_basis: 'one_time' },
        { category: 'Startup', description: 'Site Initiation Visit', unit_cost: 3000, quantity: 1, cost_basis: 'one_time' },
        { category: 'Regulatory', description: 'IRB Submission', unit_cost: 2500, quantity: 1, cost_basis: 'one_time' },
        { category: 'Regulatory', description: 'Regulatory Document Submission', unit_cost: 1000, quantity: 1, cost_basis: 'one_time' },
        { category: 'Operations', description: 'Drug Storage & Accountability', unit_cost: 500, quantity: inputs.studyDurationMonths, cost_basis: 'per_month' },
      ],
    });
  }

  // ── Section B: Study Procedures Per Patient ───────────────────────────────
  const procedureLines = buildProcedureLines(inputs.procedureIntensity, drivers);
  sections.push({
    section_type: 'per_patient_procedure',
    name: 'Study Procedures Per Patient',
    indirect_rate: null,
    default_lines: procedureLines,
  });

  // ── Section C: Staff / Effort-Based Costs ─────────────────────────────────
  const staffLines = buildStaffLines(drivers.staffRoles, assumptions.monitoringVisitsPerYear, inputs.studyDurationMonths);
  sections.push({
    section_type: 'staff_effort',
    name: 'Staff / Effort-Based Costs',
    indirect_rate: indirectRate,
    default_lines: staffLines,
  });

  // ── Section D: Per Visit Expenses ─────────────────────────────────────────
  const visitCount = inputs.visits.length;
  sections.push({
    section_type: 'per_visit_expense',
    name: 'Per Visit Expenses',
    indirect_rate: null,
    default_lines: [
      { category: 'Supplies', description: 'Lab Supplies', unit_cost: 75, quantity: visitCount * inputs.plannedEnrollment, cost_basis: 'per_visit' },
      { category: 'Supplies', description: 'Medical Supplies', unit_cost: 50, quantity: visitCount * inputs.plannedEnrollment, cost_basis: 'per_visit' },
    ],
  });

  // ── Section E: Subject Travel & Stipends ─────────────────────────────────
  sections.push({
    section_type: 'subject_travel',
    name: 'Subject Travel & Stipends',
    indirect_rate: null,
    default_lines: [
      { category: 'Travel', description: 'Travel Reimbursement', unit_cost: 50, quantity: visitCount * inputs.plannedEnrollment, cost_basis: 'per_visit' },
      { category: 'Stipend', description: 'Visit Stipend', unit_cost: 25, quantity: visitCount * inputs.plannedEnrollment, cost_basis: 'per_visit' },
    ],
  });

  // ── Section F: Enrollment Scaling ─────────────────────────────────────────
  sections.push({
    section_type: 'enrollment_scaling',
    name: 'Enrollment Scaling',
    indirect_rate: null,
    default_lines: [
      { category: 'Enrollment', description: 'Enrollment Target', unit_cost: 0, quantity: inputs.plannedEnrollment, cost_basis: 'per_patient' },
    ],
  });

  // ── Estimate total ────────────────────────────────────────────────────────
  const estimatedTotal = sections.reduce((sectionSum, section) => {
    const directTotal = section.default_lines.reduce(
      (lineSum, line) => lineSum + line.unit_cost * line.quantity,
      0
    );
    const indirect = section.indirect_rate != null ? directTotal * section.indirect_rate : 0;
    return sectionSum + directTotal + indirect;
  }, 0);

  return {
    sections,
    visitSchedule,
    estimatedTotal,
    plannedEnrollment: inputs.plannedEnrollment,
    studyDurationMonths: inputs.studyDurationMonths,
    indirectRate,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildProcedureLines(
  intensity: 'low' | 'medium' | 'high',
  drivers: WizardCostDrivers
): TemplateSectionDefinition['default_lines'] {
  const lines: TemplateSectionDefinition['default_lines'] = [
    { category: 'Consent', description: 'Informed Consent', unit_cost: 50, quantity: 1, cost_basis: 'per_patient' },
    { category: 'Assessment', description: 'Demographics', unit_cost: 25, quantity: 1, cost_basis: 'per_patient' },
    { category: 'Assessment', description: 'Physical Exam', unit_cost: 100, quantity: 1, cost_basis: 'per_patient' },
    { category: 'Assessment', description: 'Vital Signs', unit_cost: 25, quantity: 1, cost_basis: 'per_patient' },
  ];

  if (intensity === 'medium' || intensity === 'high') {
    lines.push({ category: 'Labs', description: 'Complete Blood Count', unit_cost: 75, quantity: 1, cost_basis: 'per_patient' });
    lines.push({ category: 'Labs', description: 'Basic Metabolic Panel', unit_cost: 80, quantity: 1, cost_basis: 'per_patient' });
  }

  if (intensity === 'high') {
    lines.push({ category: 'Assessment', description: 'Adverse Event Review', unit_cost: 75, quantity: 1, cost_basis: 'per_patient' });
    lines.push({ category: 'Assessment', description: 'Quality of Life Questionnaire', unit_cost: 40, quantity: 1, cost_basis: 'per_patient' });
  }

  if (drivers.useImaging) {
    lines.push({ category: 'Imaging', description: 'MRI Scan', unit_cost: 800, quantity: 1, cost_basis: 'per_patient' });
  }

  const labCostMultiplier = drivers.labComplexity === 'high' ? 2 : drivers.labComplexity === 'medium' ? 1.5 : 1;
  if (labCostMultiplier > 1 && lines.some((l) => l.category === 'Labs')) {
    return lines.map((l) =>
      l.category === 'Labs'
        ? { ...l, unit_cost: Math.round(l.unit_cost * labCostMultiplier) }
        : l
    );
  }

  return lines;
}

const STAFF_ROLE_DEFAULTS: Record<string, { description: string; unit_cost: number; cost_basis: BudgetCostBasis }> = {
  'PI': { description: 'Principal Investigator (PI) Time', unit_cost: 2000, cost_basis: 'per_month' },
  'Study Coordinator': { description: 'Study Coordinator Time', unit_cost: 1500, cost_basis: 'per_month' },
  'CRA': { description: 'Clinical Research Associate (CRA)', unit_cost: 1800, cost_basis: 'per_month' },
  'Data Manager': { description: 'Data Manager', unit_cost: 1200, cost_basis: 'per_month' },
  'Lab': { description: 'Lab / Site Fees', unit_cost: 500, cost_basis: 'per_month' },
};

function buildStaffLines(
  roles: string[],
  monitoringVisitsPerYear: number,
  durationMonths: number
): TemplateSectionDefinition['default_lines'] {
  const lines: TemplateSectionDefinition['default_lines'] = [];
  for (const role of roles) {
    const defaults = STAFF_ROLE_DEFAULTS[role];
    if (defaults) {
      lines.push({
        category: 'Staff',
        description: defaults.description,
        unit_cost: defaults.unit_cost,
        quantity: durationMonths,
        cost_basis: defaults.cost_basis,
      });
    } else {
      lines.push({
        category: 'Staff',
        description: role,
        unit_cost: 1000,
        quantity: durationMonths,
        cost_basis: 'per_month',
      });
    }
  }

  // Add monitoring
  const totalMonitoringVisits = Math.ceil((durationMonths / 12) * monitoringVisitsPerYear);
  lines.push({
    category: 'Monitoring',
    description: 'Monitoring Visits',
    unit_cost: 1500,
    quantity: totalMonitoringVisits,
    cost_basis: 'per_visit',
  });

  return lines;
}
