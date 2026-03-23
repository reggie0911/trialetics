'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const links = [
  { href: '/protected/time-expenses', label: 'Dashboard', exact: true },
  { href: '/protected/time-expenses/timesheets', label: 'Timesheets' },
  { href: '/protected/time-expenses/expenses', label: 'Expense reports' },
  { href: '/protected/time-expenses/approvals', label: 'Approvals' },
];

export function TimeExpenseSubnav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
      {links.map((l) => {
        const active = l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              'text-xs px-3 py-1.5 rounded-md border transition-colors',
              active
                ? 'border-border bg-primary/10 text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
