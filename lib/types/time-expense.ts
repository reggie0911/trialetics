export type TimeExpenseSubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'changes_requested'
  | 'approved'
  | 'rejected';

export const TIME_EXPENSE_STATUS_LABEL: Record<TimeExpenseSubmissionStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  rejected: 'Rejected',
};

export type TimeExpenseDashboardFilters = {
  dateFrom: string;
  dateTo: string;
  studyId?: string | null;
  siteId?: string | null;
  profileId?: string | null;
  status?: string | null;
};
