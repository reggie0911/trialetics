'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import {
  DOC_CATEGORY_LABELS,
  DOC_CATEGORY_ORDER,
  type DocEntry,
  type DocCategory,
} from '@/lib/docs/registry';
import { getDocIcon } from '@/lib/docs/doc-icons';
import { DocsSearch } from './docs-search';
import { formatDocLastUpdatedForDisplay } from '@/lib/docs/format-last-updated-display';

interface DocsIndexProps {
  entries: DocEntry[];
  grouped: Record<DocCategory, DocEntry[]>;
}

export function DocsIndex({ entries, grouped }: DocsIndexProps) {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Documentation</h1>
        <p className="text-[13px] text-muted-foreground mb-4">
          Step-by-step guides for every feature in Trialetics. Choose a topic below or search for what you need.
        </p>
        <DocsSearch entries={entries} />
      </div>

      {DOC_CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat];
        if (items.length === 0) return null;
        return (
          <div key={cat} className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {DOC_CATEGORY_LABELS[cat]}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((entry) => {
                const Icon = getDocIcon(entry.iconKey);
                return (
                  <Link
                    key={entry.slug}
                    href={`/protected/docs/${entry.slug}`}
                    className="group"
                  >
                    <Card className="h-full transition-shadow hover:shadow-md group-hover:border-primary/30">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-md bg-primary/10 p-2 shrink-0">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-[13px] font-semibold mb-1 group-hover:text-primary transition-colors">
                              {entry.title}
                            </h3>
                            <p className="text-[11px] text-muted-foreground line-clamp-2">
                              {entry.description}
                            </p>
                            <p className="text-[10px] text-muted-foreground/60 mt-2">
                              Updated{' '}
                              {formatDocLastUpdatedForDisplay(entry.lastUpdated, 'short')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
