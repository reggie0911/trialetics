'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, FileText, Settings, Shield, Users } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface QuickAction {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: { bg: string; text: string };
  cta: string;
  href?: string;
}

const ACTIONS: QuickAction[] = [
  {
    key: 'templates',
    title: 'Manage Templates',
    description: 'Create, edit and manage study templates.',
    icon: FileText,
    tone: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400' },
    cta: 'View Templates',
    href: '/protected/financials/approval-templates',
  },
  {
    key: 'users',
    title: 'User Management',
    description: 'Invite users and manage roles & permissions.',
    icon: Users,
    tone: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
    cta: 'Manage Users',
    href: '/protected/team',
  },
  {
    key: 'roles',
    title: 'Roles & Permissions',
    description: 'Configure roles and system-level permissions.',
    icon: Shield,
    tone: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
    cta: 'Manage Roles',
    href: '/protected/roles-permissions',
  },
  {
    key: 'settings',
    title: 'Billing Settings',
    description: 'Configure billing and subscription preferences.',
    icon: Settings,
    tone: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
    cta: 'Open Settings',
    href: '/protected/settings/billing',
  },
];

export function AdminQuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Admin Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider delay={200}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ACTIONS.map((action) => (
              <QuickActionCard key={action.key} action={action} />
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

function QuickActionCard({ action }: { action: QuickAction }) {
  const Icon = action.icon;
  const body = (
    <div
      className={cn(
        'flex h-full flex-col gap-3 rounded-md border border-border bg-card p-4 text-left transition-colors',
        'hover:border-foreground/20 hover:bg-muted/40',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            action.tone.bg,
            action.tone.text,
          )}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">{action.title}</div>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            {action.description}
          </p>
        </div>
      </div>
      <span
        className={cn(
          'mt-auto inline-flex items-center gap-1 text-xs font-medium',
          'text-sky-600 dark:text-sky-400',
        )}
      >
        {action.cta}
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={action.href ?? '#'}
            aria-label={action.title}
            className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        }
      >
        {body}
      </TooltipTrigger>
      <TooltipContent side="bottom">{action.cta}</TooltipContent>
    </Tooltip>
  );
}
