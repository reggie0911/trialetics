export type StudyPhase = 'Phase I' | 'Phase II' | 'Phase III' | 'Phase IV' | 'Phase I/II' | 'Phase II/III';

export type StudyStatus = 'draft' | 'active' | 'completed' | 'closed' | 'on_hold';

export type CountryStatus = 'planned' | 'regulatory_submitted' | 'approved' | 'enrolling' | 'closed';

export type RegulatoryStatus = 'not_started' | 'in_progress' | 'approved' | 'rejected';

export type SiteStatus = 'identified' | 'selected' | 'initiated' | 'activated' | 'enrolling' | 'closed';

export interface Study {
  id: string;
  company_id: string;
  protocol_number: string;
  title: string;
  phase: StudyPhase;
  therapeutic_area: string | null;
  indication: string | null;
  status: StudyStatus;
  sponsor: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudyCountry {
  id: string;
  study_id: string;
  country_code: string;
  country_name: string;
  status: CountryStatus;
  regulatory_status: RegulatoryStatus;
  created_at: string;
  updated_at: string;
}

export interface StudySite {
  id: string;
  study_id: string;
  study_country_id: string | null;
  site_number: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  pi_name: string | null;
  pi_email: string | null;
  status: SiteStatus;
  activation_date: string | null;
  target_enrollment: number;
  nearest_airport_place_id: string | null;
  nearest_airport_name: string | null;
  nearest_airport_address: string | null;
  nearest_hotel_place_id: string | null;
  nearest_hotel_name: string | null;
  nearest_hotel_address: string | null;
  travel_notes: string | null;
  created_at: string;
  updated_at: string;
}

export const STUDY_PHASE_OPTIONS: { value: StudyPhase; label: string }[] = [
  { value: 'Phase I', label: 'Phase I' },
  { value: 'Phase II', label: 'Phase II' },
  { value: 'Phase III', label: 'Phase III' },
  { value: 'Phase IV', label: 'Phase IV' },
  { value: 'Phase I/II', label: 'Phase I/II' },
  { value: 'Phase II/III', label: 'Phase II/III' },
];

export const STUDY_STATUS_OPTIONS: { value: StudyStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
];

export const SITE_STATUS_OPTIONS: { value: SiteStatus; label: string }[] = [
  { value: 'identified', label: 'Identified' },
  { value: 'selected', label: 'Selected' },
  { value: 'initiated', label: 'Initiated' },
  { value: 'activated', label: 'Activated' },
  { value: 'enrolling', label: 'Enrolling' },
  { value: 'closed', label: 'Closed' },
];

export const COUNTRY_STATUS_OPTIONS: { value: CountryStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'regulatory_submitted', label: 'Regulatory Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'enrolling', label: 'Enrolling' },
  { value: 'closed', label: 'Closed' },
];

export type SubmissionType = 'IRB' | 'EC' | 'import_license' | 'regulatory_approval';

export type SubmissionStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

export interface RegulatorySubmission {
  id: string;
  study_country_id: string;
  submission_type: SubmissionType;
  submission_date: string | null;
  approval_date: string | null;
  expiry_date: string | null;
  status: SubmissionStatus;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const SUBMISSION_TYPE_OPTIONS: { value: SubmissionType; label: string }[] = [
  { value: 'IRB', label: 'IRB' },
  { value: 'EC', label: 'Ethics Committee' },
  { value: 'import_license', label: 'Import License' },
  { value: 'regulatory_approval', label: 'Regulatory Approval' },
];

export const SUBMISSION_STATUS_OPTIONS: { value: SubmissionStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export const REGULATORY_STATUS_OPTIONS: { value: RegulatoryStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export interface SiteContact {
  id: string;
  site_id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface StudySiteWithStudy extends StudySite {
  studies: Pick<Study, 'title' | 'protocol_number'>;
  study_countries: Pick<StudyCountry, 'country_name' | 'country_code'> | null;
}

export interface StudySiteWithDetails extends StudySite {
  study_countries: Pick<StudyCountry, 'country_name' | 'country_code'> | null;
  site_contacts: SiteContact[];
}

export interface StudyCountryWithSubmissions extends StudyCountry {
  regulatory_submissions: RegulatorySubmission[];
}

export type SubjectStatus = 'pre_screening' | 'screening' | 'screen_failed' | 'randomized' | 'active' | 'completed' | 'withdrawn' | 'discontinued';

export type VisitStatus = 'scheduled' | 'completed' | 'missed' | 'skipped';

export interface Subject {
  id: string;
  site_id: string;
  study_id: string;
  subject_number: string;
  screening_number: string | null;
  randomization_number: string | null;
  status: SubjectStatus;
  screening_date: string | null;
  randomization_date: string | null;
  completion_date: string | null;
  withdrawal_date: string | null;
  withdrawal_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubjectWithSite extends Subject {
  study_sites: Pick<StudySite, 'site_number' | 'name'>;
}

export interface SubjectVisit {
  id: string;
  subject_id: string;
  visit_name: string;
  visit_number: number;
  planned_date: string | null;
  actual_date: string | null;
  status: VisitStatus;
  window_start: string | null;
  window_end: string | null;
  notes: string | null;
  created_at: string;
}

export interface SubjectWithDetails extends Subject {
  study_sites: Pick<StudySite, 'site_number' | 'name'>;
  subject_visits: SubjectVisit[];
}

export const SUBJECT_STATUS_OPTIONS: { value: SubjectStatus; label: string }[] = [
  { value: 'pre_screening', label: 'Pre-Screening' },
  { value: 'screening', label: 'Screening' },
  { value: 'screen_failed', label: 'Screen Failed' },
  { value: 'randomized', label: 'Randomized' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'discontinued', label: 'Discontinued' },
];

export const VISIT_STATUS_OPTIONS: { value: VisitStatus; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'missed', label: 'Missed' },
  { value: 'skipped', label: 'Skipped' },
];

export interface EnrollmentFunnelData {
  preScreening: number;
  screening: number;
  screenFailed: number;
  randomized: number;
  active: number;
  completed: number;
  withdrawn: number;
  discontinued: number;
  total: number;
}

export type TeamMemberRole =
  | 'accounts_payable_specialist'
  | 'biostatistician'
  | 'clinical_contracts_specialist'
  | 'clinical_data_manager'
  | 'clinical_project_manager'
  | 'clinical_research_associate'
  | 'clinical_trial_assistant'
  | 'contracts_manager'
  | 'cra_manager'
  | 'executive_director'
  | 'inventory_specialist'
  | 'medical_writer'
  | 'regulatory_specialist'
  | 'safety_specialist'
  | 'site_budget_specialist'
  | 'study_startup_specialist'
  | 'vendor_manager'
  | 'custom';

export interface TeamRole {
  id: string;
  company_id: string;
  role_name: string;
  description: string | null;
  created_at: string;
}

export interface StudyTeamMember {
  id: string;
  study_id: string;
  profile_id: string;
  role: TeamMemberRole;
  custom_role_id: string | null;
  site_id: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface StudyTeamMemberWithProfile extends StudyTeamMember {
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
  team_roles: Pick<TeamRole, 'role_name'> | null;
  study_sites: Pick<StudySite, 'site_number' | 'name'> | null;
}

export interface TeamMemberWithStudies {
  profile_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  app_role: 'admin' | 'user';
  assignments: {
    id: string;
    study_id: string;
    study_title: string;
    role: TeamMemberRole;
    custom_role_name: string | null;
    site_name: string | null;
    is_active: boolean;
  }[];
}

export const TEAM_ROLE_OPTIONS: { value: TeamMemberRole; label: string }[] = [
  { value: 'accounts_payable_specialist', label: 'Accounts Payable Specialist' },
  { value: 'biostatistician', label: 'Biostatistician' },
  { value: 'clinical_contracts_specialist', label: 'Clinical Contracts Specialist' },
  { value: 'clinical_data_manager', label: 'Clinical Data Manager' },
  { value: 'clinical_project_manager', label: 'Clinical Project Manager' },
  { value: 'clinical_research_associate', label: 'Clinical Research Associate' },
  { value: 'clinical_trial_assistant', label: 'Clinical Trial Assistant' },
  { value: 'contracts_manager', label: 'Contracts Manager' },
  { value: 'cra_manager', label: 'CRA Manager' },
  { value: 'executive_director', label: 'Executive Director' },
  { value: 'inventory_specialist', label: 'Inventory Specialist' },
  { value: 'medical_writer', label: 'Medical Writer' },
  { value: 'regulatory_specialist', label: 'Regulatory Specialist' },
  { value: 'safety_specialist', label: 'Safety Specialist' },
  { value: 'site_budget_specialist', label: 'Site Budget Specialist' },
  { value: 'study_startup_specialist', label: 'Study Startup Specialist' },
  { value: 'vendor_manager', label: 'Vendor Manager' },
  { value: 'custom', label: 'Custom Role' },
];

export const TEAM_ROLE_LABEL: Record<TeamMemberRole, string> = {
  accounts_payable_specialist: 'Accounts Payable Specialist',
  biostatistician: 'Biostatistician',
  clinical_contracts_specialist: 'Clinical Contracts Specialist',
  clinical_data_manager: 'Clinical Data Manager',
  clinical_project_manager: 'Clinical Project Manager',
  clinical_research_associate: 'Clinical Research Associate',
  clinical_trial_assistant: 'Clinical Trial Assistant',
  contracts_manager: 'Contracts Manager',
  cra_manager: 'CRA Manager',
  executive_director: 'Executive Director',
  inventory_specialist: 'Inventory Specialist',
  medical_writer: 'Medical Writer',
  regulatory_specialist: 'Regulatory Specialist',
  safety_specialist: 'Safety Specialist',
  site_budget_specialist: 'Site Budget Specialist',
  study_startup_specialist: 'Study Startup Specialist',
  vendor_manager: 'Vendor Manager',
  custom: 'Custom',
};

export type MonitoringVisitType = 'routine' | 'for_cause' | 'close_out' | 'pre_study' | 'interim' | 'sqv' | 'siv' | 'monitoring';

export type MonitoringVisitStatus = 'planned' | 'confirmed' | 'completed' | 'cancelled';

export type TripReportStatus = 'draft' | 'submitted' | 'approved';

export type FindingSeverity = 'minor' | 'major' | 'critical';

export type ResolutionStatus = 'open' | 'in_progress' | 'resolved';

export interface MonitoringVisit {
  id: string;
  study_id: string;
  site_id: string;
  visit_type: MonitoringVisitType;
  monitor_id: string | null;
  planned_date: string | null;
  actual_date: string | null;
  status: MonitoringVisitStatus;
  notes: string | null;
  visit_name: string | null;
  visit_location: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonitoringVisitWithRelations extends MonitoringVisit {
  study_sites: Pick<StudySite, 'site_number' | 'name'>;
  profiles: { first_name: string | null; last_name: string | null } | null;
  studies: Pick<Study, 'title' | 'protocol_number'>;
  trip_reports: TripReport[];
}

export type VisitReportStatusType =
  | 'report_pending'
  | 'authoring'
  | 'submitted'
  | 'under_review'
  | 'returned'
  | 'approved_and_signed';

export interface TripReport {
  id: string;
  visit_id: string;
  summary: string | null;
  findings: string | null;
  created_by: string;
  submitted_date: string | null;
  approved_by: string | null;
  approved_date: string | null;
  status: TripReportStatus;
  template_id: string | null;
  report_status: VisitReportStatusType | null;
  submission_due_date: string | null;
  approval_due_date: string | null;
  reviewer_id: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface TripReportWithAuthor extends TripReport {
  author: { first_name: string | null; last_name: string | null } | null;
  approver: { first_name: string | null; last_name: string | null } | null;
}

export interface TripReportFinding {
  id: string;
  trip_report_id: string;
  category: string;
  description: string;
  severity: FindingSeverity;
  resolution_status: ResolutionStatus;
  resolution_date: string | null;
  resolution_notes: string | null;
  created_at: string;
}

export interface FollowUpItem {
  id: string;
  trip_report_id: string;
  description: string;
  assigned_to: string | null;
  due_date: string | null;
  status: ResolutionStatus;
  resolved_date: string | null;
  created_at: string;
  profiles: { first_name: string | null; last_name: string | null } | null;
}

export const VISIT_TYPE_OPTIONS: { value: MonitoringVisitType; label: string }[] = [
  { value: 'routine', label: 'Routine' },
  { value: 'for_cause', label: 'For Cause' },
  { value: 'close_out', label: 'Close-Out' },
  { value: 'pre_study', label: 'Pre-Study' },
  { value: 'interim', label: 'Interim' },
  { value: 'sqv', label: 'Site Qualification Visit' },
  { value: 'siv', label: 'Site Initiation Visit' },
  { value: 'monitoring', label: 'Interim Monitoring Visit' },
];

export const MONITORING_VISIT_STATUS_OPTIONS: { value: MonitoringVisitStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const TRIP_REPORT_STATUS_OPTIONS: { value: TripReportStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
];

export const FINDING_SEVERITY_OPTIONS: { value: FindingSeverity; label: string }[] = [
  { value: 'minor', label: 'Minor' },
  { value: 'major', label: 'Major' },
  { value: 'critical', label: 'Critical' },
];

export const RESOLUTION_STATUS_OPTIONS: { value: ResolutionStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
];

export const VISIT_TYPE_LABEL: Record<MonitoringVisitType, string> = {
  routine: 'Routine',
  for_cause: 'For Cause',
  close_out: 'Close-Out',
  pre_study: 'Pre-Study',
  interim: 'Interim',
  sqv: 'Site Qualification Visit',
  siv: 'Site Initiation Visit',
  monitoring: 'Interim Monitoring Visit',
};

export const MONITORING_VISIT_STATUS_LABEL: Record<MonitoringVisitStatus, string> = {
  planned: 'Planned',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export type BudgetStatus = 'draft' | 'approved' | 'active';

export type PaymentType = 'startup' | 'milestone' | 'per_subject' | 'pass_through';

export type PaymentStatus = 'pending' | 'approved' | 'paid';

export type ScheduleStatus = 'pending' | 'due' | 'paid';

export interface StudyBudget {
  id: string;
  study_id: string;
  name: string;
  total_amount: number;
  currency: string;
  status: BudgetStatus;
  created_at: string;
  updated_at: string;
}

export interface BudgetLineItem {
  id: string;
  budget_id: string;
  category: string;
  description: string;
  unit_cost: number;
  quantity: number;
  total_cost: number;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

export interface StudyBudgetWithItems extends StudyBudget {
  budget_line_items: BudgetLineItem[];
}

export interface SitePayment {
  id: string;
  site_id: string;
  study_id: string;
  payment_type: PaymentType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  invoice_number: string | null;
  invoice_date: string | null;
  payment_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface SitePaymentWithSite extends SitePayment {
  study_sites: Pick<StudySite, 'site_number' | 'name'>;
}

export interface PaymentSchedule {
  id: string;
  site_id: string;
  study_id: string;
  milestone_name: string;
  amount: number;
  currency: string;
  due_date: string | null;
  status: ScheduleStatus;
  created_at: string;
}

export interface PaymentScheduleWithSite extends PaymentSchedule {
  study_sites: Pick<StudySite, 'site_number' | 'name'>;
}

export const BUDGET_STATUS_OPTIONS: { value: BudgetStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'active', label: 'Active' },
];

export const PAYMENT_TYPE_OPTIONS: { value: PaymentType; label: string }[] = [
  { value: 'startup', label: 'Startup' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'per_subject', label: 'Per Subject' },
  { value: 'pass_through', label: 'Pass-Through' },
];

export const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
];

export const SCHEDULE_STATUS_OPTIONS: { value: ScheduleStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'due', label: 'Due' },
  { value: 'paid', label: 'Paid' },
];

export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = {
  startup: 'Startup',
  milestone: 'Milestone',
  per_subject: 'Per Subject',
  pass_through: 'Pass-Through',
};

export interface FinancialSummary {
  totalBudget: number;
  totalPaid: number;
  totalPending: number;
  totalApproved: number;
  currency: string;
}

export type KriCategory = 'enrollment' | 'data_quality' | 'safety' | 'site_performance' | 'regulatory' | 'financial';

export type KriStatus = 'green' | 'yellow' | 'red';

export type ReportType = 'enrollment' | 'site_performance' | 'kri_summary' | 'financial_summary' | 'subject_status' | 'visit_summary' | 'custom';

export interface KriDefinition {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  category: KriCategory;
  calculation_method: string | null;
  threshold_yellow: number | null;
  threshold_red: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KriValue {
  id: string;
  kri_definition_id: string;
  study_id: string;
  site_id: string | null;
  period: string;
  value: number;
  status: KriStatus;
  calculated_at: string;
}

export interface KriValueWithDefinition extends KriValue {
  kri_definitions: Pick<KriDefinition, 'name' | 'category' | 'threshold_yellow' | 'threshold_red'>;
}

export interface SavedReport {
  id: string;
  company_id: string;
  name: string;
  report_type: ReportType;
  filters: Record<string, unknown>;
  created_by: string;
  created_at: string;
  profiles?: { first_name: string | null; last_name: string | null } | null;
}

export interface StudyPortfolioRow {
  id: string;
  title: string;
  protocol_number: string;
  phase: string;
  status: string;
  totalSites: number;
  activeSites: number;
  totalSubjects: number;
  enrolledSubjects: number;
  kriGreen: number;
  kriYellow: number;
  kriRed: number;
}

export interface EnrollmentDataPoint {
  month: string;
  planned: number;
  actual: number;
}

export const KRI_CATEGORY_OPTIONS: { value: KriCategory; label: string }[] = [
  { value: 'enrollment', label: 'Enrollment' },
  { value: 'data_quality', label: 'Data Quality' },
  { value: 'safety', label: 'Safety' },
  { value: 'site_performance', label: 'Site Performance' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'financial', label: 'Financial' },
];

export const KRI_CATEGORY_LABEL: Record<KriCategory, string> = {
  enrollment: 'Enrollment',
  data_quality: 'Data Quality',
  safety: 'Safety',
  site_performance: 'Site Performance',
  regulatory: 'Regulatory',
  financial: 'Financial',
};

export const REPORT_TYPE_OPTIONS: { value: ReportType; label: string }[] = [
  { value: 'enrollment', label: 'Enrollment Report' },
  { value: 'site_performance', label: 'Site Performance Report' },
  { value: 'kri_summary', label: 'KRI Summary' },
  { value: 'financial_summary', label: 'Financial Summary' },
  { value: 'subject_status', label: 'Subject Status Report' },
  { value: 'visit_summary', label: 'Visit Summary' },
  { value: 'custom', label: 'Custom Report' },
];

// =====================================================
// Subscriptions
// =====================================================

export type SubscriptionPlan = 'basic' | 'pro' | 'enterprise';

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing' | 'incomplete';

export interface Subscription {
  id: string;
  company_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  seats_included: number;
  seats_used: number;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanConfig {
  name: string;
  description: string;
  price: number;
  seats: number;
  features: string[];
  stripePriceId: string;
}

export const PLAN_CONFIGS: Record<SubscriptionPlan, PlanConfig> = {
  basic: {
    name: 'Basic',
    description: 'For small teams getting started with clinical trials.',
    price: 99,
    seats: 3,
    features: [
      'Up to 3 studies',
      '3 team seats',
      'Core study management',
      'Subject tracking',
      'Email support',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC ?? '',
  },
  pro: {
    name: 'Pro',
    description: 'For growing organizations managing multiple trials.',
    price: 299,
    seats: 10,
    features: [
      'Unlimited studies',
      '10 team seats',
      'All Basic features',
      'Financial management',
      'KRI dashboards',
      'Visit monitoring',
      'Priority support',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? '',
  },
  enterprise: {
    name: 'Enterprise',
    description: 'For large CROs and pharmaceutical companies.',
    price: 799,
    seats: 50,
    features: [
      'Unlimited everything',
      '50 team seats',
      'All Pro features',
      'AI-powered analytics',
      'Custom KRI definitions',
      'Advanced reporting',
      'Dedicated support',
      'SSO integration',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE ?? '',
  },
};

export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  active: 'Active',
  past_due: 'Past Due',
  cancelled: 'Cancelled',
  trialing: 'Trial',
  incomplete: 'Incomplete',
};

export interface DashboardStats {
  totalStudies: number;
  activeStudies: number;
  totalSites: number;
  activeSites: number;
  enrollingSites: number;
}
