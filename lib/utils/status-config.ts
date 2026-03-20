export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' | 'outline' | 'ghost' | 'link';

export interface StatusEntry {
  label: string;
  variant: BadgeVariant;
}

export const STATUS_CONFIG: Record<string, StatusEntry> = {
  // Study
  draft: { label: 'Draft', variant: 'secondary' },
  active: { label: 'Active', variant: 'success' },
  on_hold: { label: 'On Hold', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  closed: { label: 'Closed', variant: 'secondary' },

  // Site
  identified: { label: 'Identified', variant: 'secondary' },
  selected: { label: 'Selected', variant: 'info' },
  initiated: { label: 'Initiated', variant: 'info' },
  activated: { label: 'Activated', variant: 'success' },
  enrolling: { label: 'Enrolling', variant: 'success' },

  // Country
  planned: { label: 'Planned', variant: 'secondary' },
  regulatory_submitted: { label: 'Regulatory Submitted', variant: 'info' },
  approved: { label: 'Approved', variant: 'success' },

  // Regulatory / Submission
  not_started: { label: 'Not Started', variant: 'secondary' },
  in_progress: { label: 'In Progress', variant: 'info' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  pending: { label: 'Pending', variant: 'warning' },
  submitted: { label: 'Submitted', variant: 'info' },

  // Subject
  pre_screening: { label: 'Pre-Screening', variant: 'secondary' },
  screening: { label: 'Screening', variant: 'info' },
  screen_failed: { label: 'Screen Failed', variant: 'destructive' },
  randomized: { label: 'Randomized', variant: 'info' },
  withdrawn: { label: 'Withdrawn', variant: 'destructive' },
  discontinued: { label: 'Discontinued', variant: 'destructive' },

  // Subject Visit
  scheduled: { label: 'Scheduled', variant: 'info' },
  missed: { label: 'Missed', variant: 'destructive' },
  skipped: { label: 'Skipped', variant: 'secondary' },

  // Priority (e.g. action items)
  low: { label: 'Low', variant: 'secondary' },
  medium: { label: 'Medium', variant: 'info' },
  high: { label: 'High', variant: 'warning' },
  critical: { label: 'Critical', variant: 'destructive' },

  // Monitoring Visit
  confirmed: { label: 'Confirmed', variant: 'info' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },

  // Finding Severity
  minor: { label: 'Minor', variant: 'warning' },
  major: { label: 'Major', variant: 'warning' },

  // Resolution
  open: { label: 'Open', variant: 'secondary' },
  resolved: { label: 'Resolved', variant: 'success' },

  // Payment / Schedule
  paid: { label: 'Paid', variant: 'success' },
  due: { label: 'Due', variant: 'warning' },

  // Checklist
  complete: { label: 'Complete', variant: 'success' },

  // Team
  inactive: { label: 'Inactive', variant: 'secondary' },

  // Task status
  blocked: { label: 'Blocked', variant: 'destructive' },

  // On-track status
  on_track: { label: 'On Track', variant: 'success' },
  at_risk: { label: 'At Risk', variant: 'warning' },
  off_track: { label: 'Off Track', variant: 'destructive' },

  // Visit Report status
  report_pending: { label: 'Report Pending', variant: 'secondary' },
  authoring: { label: 'Authoring', variant: 'info' },
  under_review: { label: 'Under Review', variant: 'warning' },
  returned: { label: 'Returned', variant: 'destructive' },
  approved_and_signed: { label: 'Approved and Signed', variant: 'success' },
};

export function getStatusConfig(status: string): StatusEntry {
  return STATUS_CONFIG[status] ?? { label: status, variant: 'secondary' };
}
