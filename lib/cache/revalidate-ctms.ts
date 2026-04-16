import { revalidatePath } from 'next/cache';

/**
 * Revalidates the study shell layout and all nested CTMS routes under
 * `/protected/studies/[studyId]/…` (tasks, subjects, sites, trip reports, etc.).
 */
export function revalidateStudyCtmsLayout(studyId: string): void {
  revalidatePath(`/protected/studies/${studyId}`, 'layout');
}

/**
 * Legacy top-level CTMS URLs that redirect to study routes — keep their RSC caches fresh.
 */
export function revalidateCtmsLegacyTopLevelPaths(): void {
  revalidatePath('/protected/tasks');
  revalidatePath('/protected/my-tasks');
  revalidatePath('/protected/subjects');
  revalidatePath('/protected/sites');
  revalidatePath('/protected/visits');
  revalidatePath('/protected/trip-reports');
  revalidatePath('/protected/financials');
  revalidatePath('/protected/financials/approvals');
  revalidatePath('/protected/reports');
  revalidatePath('/protected/team');
  revalidatePath('/protected/countries');
  revalidatePath('/protected/inventory-management');
}

/** Narrow legacy paths for task list hubs only. */
export function revalidateTaskHubLegacyPaths(): void {
  revalidatePath('/protected/tasks');
  revalidatePath('/protected/my-tasks');
}
