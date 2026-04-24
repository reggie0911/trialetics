import type { RegulatoryStatus, SubmissionStatus } from '@/lib/types/ctms';

export interface SubmissionStatusCounts {
  pending: number;
  submitted: number;
  approved: number;
  rejected: number;
}

export function countSubmissionStatuses(
  statuses: readonly SubmissionStatus[]
): SubmissionStatusCounts {
  const counts: SubmissionStatusCounts = {
    pending: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
  };

  for (const status of statuses) {
    counts[status] += 1;
  }

  return counts;
}

export function computeRegulatoryStatusFromSubmissionStatuses(
  statuses: readonly SubmissionStatus[]
): RegulatoryStatus {
  if (statuses.length === 0) return 'not_started';

  const counts = countSubmissionStatuses(statuses);
  if (counts.rejected > 0) return 'rejected';
  if (counts.pending > 0 || counts.submitted > 0) return 'in_progress';
  if (counts.approved === statuses.length) return 'approved';
  return 'in_progress';
}

export function buildRegulatoryRollupReason(
  statuses: readonly SubmissionStatus[]
): string {
  const regulatory = computeRegulatoryStatusFromSubmissionStatuses(statuses);
  if (statuses.length === 0) return 'Roll-up: no submissions -> Not Started';

  const counts = countSubmissionStatuses(statuses);
  const parts: string[] = [];
  if (counts.approved > 0) parts.push(`${counts.approved} approved`);
  if (counts.submitted > 0) parts.push(`${counts.submitted} submitted`);
  if (counts.pending > 0) parts.push(`${counts.pending} pending`);
  if (counts.rejected > 0) parts.push(`${counts.rejected} rejected`);

  const labelMap: Record<RegulatoryStatus, string> = {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    approved: 'Approved',
    rejected: 'Rejected',
  };

  return `Roll-up: ${parts.join(' + ')} -> ${labelMap[regulatory]}`;
}
