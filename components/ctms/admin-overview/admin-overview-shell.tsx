'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Info, LayoutList, X } from 'lucide-react';

import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import type { AdminOverviewProps } from '@/lib/dashboard/get-admin-overview-props';
import type { DashboardStats } from '@/lib/types/ctms';

import { AdminKpiRow } from './admin-kpi-row';
import { AdminQuickActions } from './admin-quick-actions';
import { StudyTemplatesRow } from './study-templates-row';
import { PendingInvitationsCard } from './pending-invitations-card';
import { UserAccessOverview } from './user-access-overview';
import { RecentSystemActivityCard } from './recent-activity-stub';
import { HelpFooter } from './help-footer';

const BANNER_DISMISSED_KEY = 'trialetics:admin-overview-banner-dismissed';
const TEMPLATES_HREF = '/protected/financials/approval-templates';
const STUDIES_CATALOG_HREF = '/protected/studies/catalog';

interface AdminOverviewShellProps {
  firstName: string | null;
  stats: DashboardStats;
  overview: AdminOverviewProps;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function AdminOverviewShell({
  firstName,
  stats,
  overview,
}: AdminOverviewShellProps) {
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
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
      <div id="admin-overview" className="space-y-6">
        {!bannerDismissed && (
          <Alert className="bg-sky-500/5 border-sky-500/30 text-foreground">
            <Info className="text-sky-600 dark:text-sky-400" />
            <AlertTitle>Welcome to Trialetics{namePart}</AlertTitle>
            <AlertDescription>
              You have admin-level access. Use this overview to keep templates, users and roles in
              good shape.
            </AlertDescription>
            <AlertAction>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sky-600 hover:bg-sky-500/10 hover:text-sky-700 dark:text-sky-400"
                  render={
                    <a
                      href="https://help.trialetics.io/admin-overview"
                      target="_blank"
                      rel="noreferrer noopener"
                    />
                  }
                >
                  Learn more
                </Button>
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
              </div>
            </AlertAction>
          </Alert>
        )}

        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {greeting}
              {namePart}
            </h1>
            <p className="text-sm text-muted-foreground">
              Here&apos;s an overview of your CTMS environment.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <Button
              variant="outline"
              render={<Link href={STUDIES_CATALOG_HREF} aria-label="View studies catalog" />}
            >
              <LayoutList className="h-4 w-4" />
              View Studies
            </Button>
          </div>
        </header>

        <AdminBody stats={stats} overview={overview} />

        <HelpFooter />
      </div>
    </TooltipProvider>
  );
}

function AdminBody({
  stats,
  overview,
}: {
  stats: DashboardStats;
  overview: AdminOverviewProps;
}) {
  return (
    <div className={cn('grid gap-6', 'lg:grid-cols-3')}>
      <div className="space-y-6 lg:col-span-2">
        <AdminKpiRow stats={stats} overview={overview} />
        <AdminQuickActions />
        <StudyTemplatesRow templates={overview.templates} manageHref={TEMPLATES_HREF} />
      </div>
      <aside className="space-y-6 lg:col-span-1">
        <PendingInvitationsCard pendingInvitations={overview.pendingInvitations} />
        <UserAccessOverview
          roleBreakdown={overview.roleBreakdown}
          userCount={overview.userCount}
        />
        <RecentSystemActivityCard activity={overview.recentActivity} />
      </aside>
    </div>
  );
}
