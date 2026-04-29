import type { DashboardStats, Study } from '@/lib/types/ctms';
import type { CtmsDashboardOverview } from '@/lib/dashboard/ctms-dashboard-overview';

import { UserDashboardShell } from '@/components/ctms/user-dashboard/user-dashboard-shell';
import { HelpFooter } from '@/components/ctms/admin-overview/help-footer';

interface DashboardContentProps {
  firstName: string | null;
  stats: DashboardStats;
  studies: Study[];
  isAdmin: boolean;
  overview: CtmsDashboardOverview;
  /** Show banner when user landed from a study-scoped route without a study context. */
  studySelectionHint?: boolean;
}

/**
 * Public entry point for the `/protected` dashboard page. Thin wrapper around
 * `UserDashboardShell` so the page-level loader keeps its existing prop
 * contract. The shell owns greeting, banner, KPI tiles, and the two-column
 * body; `HelpFooter` stays at the page bottom across all dashboard variants.
 */
export function DashboardContent({
  firstName,
  stats,
  studies,
  isAdmin,
  overview,
  studySelectionHint = false,
}: DashboardContentProps) {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <UserDashboardShell
        firstName={firstName}
        isAdmin={isAdmin}
        studies={studies}
        stats={stats}
        overview={overview}
        studySelectionHint={studySelectionHint}
      />
      <HelpFooter />
    </div>
  );
}
