'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Building2, FileText, Lock, Users } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { AdminOverviewProps } from '@/lib/dashboard/get-admin-overview-props';
import type { DashboardStats } from '@/lib/types/ctms';

interface AdminKpiRowProps {
  stats: DashboardStats;
  overview: AdminOverviewProps;
}

interface KpiTile {
  key: string;
  title: string;
  value: number;
  caption: string;
  icon: LucideIcon;
  /** Tinted icon-square color classes. */
  tone: { bg: string; text: string };
  href?: string;
  onClick?: () => void;
}

export function AdminKpiRow({ stats, overview }: AdminKpiRowProps) {
  const tiles: KpiTile[] = [
    {
      key: 'templates',
      title: 'Study Templates',
      value: overview.templates.length,
      caption: 'Active templates',
      icon: FileText,
      tone: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400' },
      href: '/protected/studies',
    },
    {
      key: 'users',
      title: 'System Users',
      value: overview.userCount,
      caption: 'Across all roles',
      icon: Users,
      tone: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
      href: '/protected/directory',
    },
    {
      key: 'active_studies',
      title: 'Active Studies',
      value: stats.activeStudies,
      caption: 'Across the system',
      icon: Lock,
      tone: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
      href: '/protected/studies/catalog',
    },
    {
      key: 'sites',
      title: 'Sites',
      value: stats.totalSites,
      caption: 'Across all studies',
      icon: Building2,
      tone: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
      href: '/protected/studies/catalog',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <KpiTileCard key={tile.key} tile={tile} />
      ))}
    </div>
  );
}

function KpiTileCard({ tile }: { tile: KpiTile }) {
  const Icon = tile.icon;
  const inner = (
    <div className="flex items-center gap-4 px-5 py-5">
      <span
        aria-hidden
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-xl',
          tile.tone.bg,
          tile.tone.text,
        )}
      >
        <Icon className="size-[20px]" strokeWidth={2.25} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-3xl font-semibold leading-none tabular-nums tracking-tight text-foreground">
          {tile.value}
        </div>
        <div className="mt-1.5 text-sm font-semibold text-foreground">{tile.title}</div>
        <div className="text-xs font-normal text-muted-foreground">{tile.caption}</div>
      </div>
    </div>
  );

  if (tile.href) {
    return (
      <Card className="group/kpi h-full py-0 transition-colors hover:border-foreground/20 hover:bg-muted/40">
        <Link
          href={tile.href}
          aria-label={`${tile.title}: ${tile.value}`}
          className="block rounded-[5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {inner}
        </Link>
      </Card>
    );
  }

  if (tile.onClick) {
    return (
      <Card className="group/kpi h-full py-0 transition-colors hover:border-foreground/20 hover:bg-muted/40">
        <button
          type="button"
          onClick={tile.onClick}
          aria-label={`${tile.title}: ${tile.value}`}
          className="block w-full rounded-[5px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {inner}
        </button>
      </Card>
    );
  }

  return <Card className="h-full py-0">{inner}</Card>;
}
