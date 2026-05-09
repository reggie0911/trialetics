'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  buildFinanceModulePath,
  FINANCE_MODULE_TABS,
} from '@/lib/finance-module/types';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface FinanceModuleShellProps {
  studyId: string;
  title: string;
  subtitle?: string | null;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function FinanceModuleShell({ studyId, title, subtitle, actions, children }: FinanceModuleShellProps) {
  const pathname = usePathname();
  const root = `/protected/studies/${studyId}/finance-module`;

  return (
    <div className="flex flex-col gap-5 p-6 [font-family:var(--font-poppins)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>

      <nav
        aria-label="Finance Module sections"
        className="flex flex-wrap gap-2 border-b border-border pb-3"
      >
        {FINANCE_MODULE_TABS.map((tab) => {
          const href = buildFinanceModulePath(studyId, tab.segment);
          const active =
            tab.segment === null
              ? pathname === root
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Tooltip key={tab.label}>
              <TooltipTrigger
                render={
                  <Link
                    href={href}
                    className={cn(
                      'text-xs px-3 py-1.5 rounded-md border transition-colors',
                      active
                        ? 'border-border bg-primary/10 text-primary font-medium'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted',
                    )}
                    aria-current={active ? 'page' : undefined}
                  />
                }
              >
                {tab.label}
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[260px] text-[11px] leading-snug">
                {tab.description}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
