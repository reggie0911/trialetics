'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  DOC_CATEGORY_LABELS,
  DOC_CATEGORY_ORDER,
  type DocEntry,
  type DocCategory,
} from '@/lib/docs/registry';
import { getDocIcon } from '@/lib/docs/doc-icons';

interface DocsSidebarProps {
  entries: DocEntry[];
  grouped: Record<DocCategory, DocEntry[]>;
}

export function DocsSidebar({ entries, grouped }: DocsSidebarProps) {
  const pathname = usePathname();

  return (
    <nav className="w-60 shrink-0 border-r border-border overflow-y-auto py-4 pr-4 hidden lg:block">
      {DOC_CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat];
        if (items.length === 0) return null;
        return (
          <div key={cat} className="mb-5">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-3">
              {DOC_CATEGORY_LABELS[cat]}
            </h3>
            <ul className="space-y-0.5">
              {items.map((entry) => {
                const href = `/protected/docs/${entry.slug}`;
                const isActive = pathname === href;
                const Icon = getDocIcon(entry.iconKey);
                return (
                  <li key={entry.slug}>
                    <Link
                      href={href}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {entry.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
