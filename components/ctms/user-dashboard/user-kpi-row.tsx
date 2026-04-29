'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  FolderOpen,
  Users,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import type { DashboardLiveKpis } from '@/lib/dashboard/ctms-dashboard-overview';
import { cn } from '@/lib/utils';

import type { DashboardStats } from '@/lib/types/ctms';

interface UserKpiRowProps {
  stats: DashboardStats;
  kpis: DashboardLiveKpis;
}

interface KpiTile {
  key: string;
  title: string;
  /** Already-formatted display string so tiles like "512 / 1,280" render correctly. */
  value: string;
  caption: string;
  icon: LucideIcon;
  tone: { bg: string; text: string };
  href?: string;
}

export function UserKpiRow({ stats, kpis }: UserKpiRowProps) {
  const tiles: KpiTile[] = [
    {
      key: 'active_studies',
      title: 'My Active Studies',
      value: String(stats.activeStudies),
      caption: 'Across all phases',
      icon: FolderOpen,
      tone: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400' },
      href: '/protected/studies/catalog',
    },
    {
      key: 'sites_supported',
      title: 'Sites I Support',
      value: String(stats.totalSites),
      caption:
        stats.activeStudies > 0
          ? `Across ${stats.activeStudies} ${stats.activeStudies === 1 ? 'study' : 'studies'}`
          : 'Across all studies',
      icon: Building2,
      tone: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
      href: '/protected/sites',
    },
    {
      key: 'contacts',
      title: 'Contacts',
      value: String(kpis.contacts),
      caption: 'Across all studies',
      icon: Users,
      tone: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
      href: '/protected/directory',
    },
    {
      key: 'upcoming_visits',
      title: 'Upcoming Visits',
      value: String(kpis.upcomingVisits),
      caption: 'Next 30 days',
      icon: CalendarDays,
      tone: { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400' },
      href: '/protected/visits',
    },
    {
      key: 'enrollment',
      title: 'Enrollment (All Studies)',
      value: kpis.enrollmentValue,
      caption: kpis.enrollmentCaption,
      icon: BarChart3,
      tone: { bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400' },
      href: '/protected/studies/catalog',
    },
    {
      key: 'sites_at_risk',
      title: 'Sites At Risk',
      value: String(kpis.sitesAtRisk),
      caption: 'Require attention',
      icon: AlertTriangle,
      tone: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
      href: '/protected/sites',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {tiles.map((tile) => (
        <KpiTileCard key={tile.key} tile={tile} />
      ))}
    </div>
  );
}

function KpiTileCard({ tile }: { tile: KpiTile }) {
  const Icon = tile.icon;
  const inner = (
    <div className="flex items-start gap-3 px-4 py-4">
      <span
        aria-hidden
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl',
          tile.tone.bg,
          tile.tone.text,
        )}
      >
        <Icon className="size-[18px]" strokeWidth={2.25} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start justify-between gap-1.5">
          <div className="min-w-0 grow break-words text-[11px] font-medium uppercase leading-snug tracking-wide text-muted-foreground">
            {tile.title}
          </div>
        </div>
        <div className="mt-1 min-w-0 break-words text-2xl font-semibold leading-tight tabular-nums tracking-tight text-foreground">
          {tile.value}
        </div>
        <div className="mt-0.5 min-w-0 break-words text-xs text-muted-foreground">
          {tile.caption}
        </div>
      </div>
    </div>
  );

  const ariaLabel = `${tile.title}: ${tile.value}. ${tile.caption}`;

  if (tile.href) {
    return (
      <Card className="group/kpi h-full py-0 transition-colors hover:border-foreground/20 hover:bg-muted/40">
        <Link
          href={tile.href}
          aria-label={ariaLabel}
          className="block rounded-[5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {inner}
        </Link>
      </Card>
    );
  }

  return <Card className="h-full py-0">{inner}</Card>;
}
