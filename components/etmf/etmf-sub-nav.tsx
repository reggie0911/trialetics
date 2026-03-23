'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const etmfNavItems = [
  { label: 'Overview', href: '/protected/etmf', exact: true },
  { label: 'Document Library', href: '/protected/etmf/library' },
  { label: 'Expected Document List', href: '/protected/etmf/expected-documents' },
  { label: 'Site Staff Expected Document List', href: '/protected/etmf/staff-expected-documents' },
  { label: 'Bulk Document Uploader', href: '/protected/etmf/bulk-upload' },
];

export function EtmfSubNav() {
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
            <span>CDISC TMF Reference Model : Version 3.3.1</span>
          </div>
          <nav className="flex items-center gap-1 flex-wrap">
            {etmfNavItems.map((item) => (
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
