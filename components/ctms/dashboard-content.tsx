'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FlaskConical, Building2, Users, TrendingUp, ArrowRight, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import type { DashboardStats } from '@/lib/types/ctms';

interface RecentStudy {
  id: string;
  protocol_number: string;
  title: string;
  phase: string;
  status: string;
  updated_at: string;
}

interface DashboardContentProps {
  firstName: string | null;
  stats: DashboardStats;
  recentStudies: RecentStudy[];
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

const statCards = [
  {
    title: 'Total Studies',
    key: 'totalStudies' as const,
    href: '/protected/studies',
    markerColor: null as string | null,
    tooltipFn: (s: DashboardStats) => `${s.activeStudies} active`,
  },
  {
    title: 'Total Sites',
    key: 'totalSites' as const,
    href: '/protected/sites',
    markerColor: 'bg-emerald-500',
    tooltipFn: (s: DashboardStats) => `${s.activeSites} activated`,
  },
  {
    title: 'Enrolling Sites',
    key: 'enrollingSites' as const,
    href: '/protected/sites',
    markerColor: 'bg-amber-500',
    tooltipFn: () => 'Currently enrolling',
  },
  {
    title: 'Active Studies',
    key: 'activeStudies' as const,
    href: '/protected/studies',
    markerColor: 'bg-violet-500',
    tooltipFn: (s: DashboardStats) => `of ${s.totalStudies} total`,
  },
];

export function DashboardContent({ firstName, stats, recentStudies }: DashboardContentProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="p-6 lg:p-8 space-y-8" suppressHydrationWarning>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" suppressHydrationWarning>
          {mounted ? getGreeting() : 'Hello'}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here&apos;s an overview of your clinical trial operations.
        </p>
      </div>

      <Card className="rounded-lg">
        <CardContent className="flex flex-wrap items-center gap-4 md:gap-6 py-4">
          {statCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
              title={card.tooltipFn(stats)}
            >
              {card.markerColor && (
                <span className={`h-2 w-4 shrink-0 rounded-full ${card.markerColor}`} aria-hidden />
              )}
              <span>
                {card.title} ({stats[card.key]})
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="w-full lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Studies</CardTitle>
            <CardDescription>Latest updated clinical studies</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" render={<Link href="/protected/studies" />} nativeButton={false}>
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {recentStudies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                  <FlaskConical className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No studies yet</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">Create your first study to get started</p>
                <Button size="sm" render={<Link href="/protected/studies/new" />} nativeButton={false}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Study
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentStudies.map((study) => (
                  <Link
                    key={study.id}
                    href={`/protected/studies/${study.id}`}
                    className="flex items-center justify-between rounded-[5px] border p-3 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{study.title}</span>
                        <StatusBadge status={study.status} className="text-[10px] shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{study.protocol_number}</span>
                        <span>&middot;</span>
                        <span>{study.phase}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-4" suppressHydrationWarning>
                      {mounted ? formatRelativeDate(study.updated_at) : '—'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common operations</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link
              href="/protected/studies/new"
              className="flex items-center gap-3 rounded-[5px] border p-3 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Plus className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Create New Study</p>
                <p className="text-xs text-muted-foreground">Set up a new clinical trial</p>
              </div>
            </Link>
            <Link
              href="/protected/sites"
              className="flex items-center gap-3 rounded-[5px] border p-3 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Manage Sites</p>
                <p className="text-xs text-muted-foreground">View and manage clinical sites</p>
              </div>
            </Link>
            <Link
              href="/protected/reports"
              className="flex items-center gap-3 rounded-[5px] border p-3 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">View Reports</p>
                <p className="text-xs text-muted-foreground">Analytics and KRI dashboards</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
