'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Overview', href: '/protected/eisf', exact: true },
  { label: 'Site folders', href: '/protected/eisf/folders' },
  { label: 'Document requests', href: '/protected/eisf/requests' },
  { label: 'Required documents', href: '/protected/eisf/rules' },
];

export function EisfSubNav() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="border-b bg-background">
      <div className="container px-4 py-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Electronic Investigator Site Folder</span>
          </div>
          <nav className="flex items-center gap-1 flex-wrap">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap',
                  isActive(item.href, item.exact)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-transparent hover:border-border hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
