'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Gauge, Info, LayoutList, Plus, X } from 'lucide-react';

import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import type { DashboardStats, Study } from '@/lib/types/ctms';
import type { CtmsDashboardOverview } from '@/lib/dashboard/ctms-dashboard-overview';

import { UserKpiRow } from './user-kpi-row';
import { MyStudiesTableCard } from './my-studies-table-card';
import { UpcomingVisitsCard } from './upcoming-visits-card';
import { EnrollmentOverviewCard } from './enrollment-overview-card';
import { NeedsAttentionCard } from './needs-attention-card';
import { MyTasksCard } from './my-tasks-card';

const BANNER_DISMISSED_KEY = 'trialetics:user-dashboard-banner-dismissed';

interface UserDashboardShellProps {
  firstName: string | null;
  isAdmin: boolean;
  studies: Study[];
  stats: DashboardStats;
  overview: CtmsDashboardOverview;
  /** Show banner-style alert when user landed from a study-scoped route without a study context. */
  studySelectionHint?: boolean;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function UserDashboardShell({
  firstName,
  isAdmin,
  studies,
  stats,
  overview,
  studySelectionHint = false,
}: UserDashboardShellProps) {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
    try {
      if (window.localStorage.getItem(BANNER_DISMISSED_KEY) === '1') {
        queueMicrotask(() => setBannerDismissed(true));
      }
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  const dismissBanner = () => {
    setBannerDismissed(true);
    try {
      window.localStorage.setItem(BANNER_DISMISSED_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const greeting = useMemo(() => getGreeting(), []);
  const namePart = firstName ? `, ${firstName}` : '';

  return (
    <TooltipProvider delay={200}>
      <div id="user-dashboard" className="space-y-6" suppressHydrationWarning>
        {!bannerDismissed && (
          <Alert className="border-sky-500/30 bg-sky-500/5 text-foreground">
            <Info className="text-sky-600 dark:text-sky-400" />
            <AlertTitle>Welcome to Trialetics{namePart}</AlertTitle>
            <AlertDescription>
              You have access to studies and tools based on your role.
            </AlertDescription>
            <AlertAction>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Dismiss welcome banner"
                      onClick={dismissBanner}
                    />
                  }
                >
                  <X className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent side="bottom">Dismiss</TooltipContent>
              </Tooltip>
            </AlertAction>
          </Alert>
        )}

        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {mounted ? greeting : 'Hello'}
              {namePart}
            </h1>
            <p className="text-sm text-muted-foreground">
              Here&apos;s an overview of your clinical trial operations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            {isAdmin ? (
              <Button render={<Link href="/protected/studies/new" aria-label="Create new study" />}>
                <Plus className="h-4 w-4" />
                Create New Study
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button disabled aria-label="Create new study (admin only)">
                      <Plus className="h-4 w-4" />
                      Create New Study
                    </Button>
                  }
                />
                <TooltipContent side="bottom">Admin only</TooltipContent>
              </Tooltip>
            )}
            <Button
              variant="outline"
              render={
                <Link href="/protected/studies/catalog" aria-label="View all studies" />
              }
            >
              <LayoutList className="h-4 w-4" />
              View All Studies
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                render={<Link href="/protected/studies" aria-label="Open system overview" />}
              >
                <Gauge className="h-4 w-4" />
                System overview
              </Button>
            )}
          </div>
        </header>

        <UserKpiRow stats={stats} kpis={overview.kpis} />

        {studySelectionHint && (
          <Alert className="pr-12">
            <Info className="size-4" aria-hidden />
            <AlertTitle>Open a study to continue</AlertTitle>
            <AlertDescription>
              CTMS areas such as visits, sites, and tasks are tied to a study. Choose one in the{' '}
              <strong>My Studies</strong> table below.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <MyStudiesTableCard studies={studies} rows={overview.studyRows} />
            <div className="grid gap-6 md:grid-cols-2">
              <UpcomingVisitsCard visits={overview.upcomingVisits} />
              <EnrollmentOverviewCard enrollment={overview.enrollment} />
            </div>
          </div>
          <aside className="space-y-6 lg:col-span-1">
            <NeedsAttentionCard items={overview.attention} />
            <MyTasksCard tasks={overview.tasks} />
          </aside>
        </div>
      </div>
    </TooltipProvider>
  );
}
