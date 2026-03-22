'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import type { DocEntry } from '@/lib/docs/registry';
import { getDocIcon } from '@/lib/docs/doc-icons';

interface DocsSearchProps {
  entries: DocEntry[];
}

export function DocsSearch({ entries }: DocsSearchProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
    );
  }, [query, entries]);

  return (
    <div className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search documentation..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8 h-8 text-[12px]"
        />
      </div>
      {query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
          {results.length === 0 ? (
            <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            <ul>
              {results.map((entry) => {
                const Icon = getDocIcon(entry.iconKey);
                return (
                <li key={entry.slug}>
                  <Link
                    href={`/protected/docs/${entry.slug}`}
                    className="flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-accent transition-colors"
                    onClick={() => setQuery('')}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{entry.title}</div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1">
                        {entry.description}
                      </div>
                    </div>
                  </Link>
                </li>
              );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
