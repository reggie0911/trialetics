'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { TocItem } from '@/lib/docs/loader';

interface DocsTocProps {
  items: TocItem[];
}

export function DocsToc({ items }: DocsTocProps) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter(Boolean) as HTMLElement[];

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    for (const el of headings) observer.observe(el);
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav className="w-52 shrink-0 hidden xl:block overflow-y-auto py-4 pl-4">
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        On this page
      </h4>
      <ul className="space-y-1 border-l border-border">
        {items
          .filter((item) => item.level <= 2)
          .map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={cn(
                  'block py-1 text-[11px] transition-colors border-l-2 -ml-px',
                  item.level === 1 ? 'pl-3' : 'pl-5',
                  activeId === item.id
                    ? 'border-primary text-foreground font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                )}
              >
                {item.text}
              </a>
            </li>
          ))}
      </ul>
    </nav>
  );
}
