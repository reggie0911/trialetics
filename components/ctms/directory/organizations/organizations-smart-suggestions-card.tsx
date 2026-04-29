'use client';

import { ChevronRight, Lightbulb } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { OrgAttentionKey, OrgSuggestion } from '@/lib/directory/live-directory-types';
import { DirectoryEmptyState } from '@/components/ctms/directory/directory-empty-state';

interface OrganizationsSmartSuggestionsCardProps {
  suggestions: OrgSuggestion[];
  onSelect?: (suggestion: OrgSuggestion) => void;
  /** Convenience: forward the suggestion's attention key directly. */
  onAttentionKey?: (key: OrgAttentionKey) => void;
}

export function OrganizationsSmartSuggestionsCard({
  suggestions,
  onSelect,
  onAttentionKey,
}: OrganizationsSmartSuggestionsCardProps) {
  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium inline-flex items-center gap-1.5">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Smart Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0 space-y-2">
        {suggestions.length === 0 ? (
          <DirectoryEmptyState
            title="No suggestions"
            description="Live suggestions appear when Directory records need attention."
            className="border-0 bg-transparent py-4"
          />
        ) : suggestions.map((s) => {
          const handleClick = () => {
            onSelect?.(s);
            onAttentionKey?.(s.attentionKey);
          };
          const interactive = !!(onSelect || onAttentionKey);
          return (
            <button
              key={s.id}
              type="button"
              onClick={interactive ? handleClick : undefined}
              disabled={!interactive}
              className={cn(
                'w-full text-left rounded-lg border border-border/70 bg-background px-3 py-2 transition-colors',
                interactive
                  ? 'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  : 'cursor-default'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground leading-tight">{s.label}</p>
                  <Button
                    asChild
                    type="button"
                    variant="link"
                    className="h-auto p-0 mt-1 text-[11px] text-sky-600 dark:text-sky-400"
                  >
                    <span>{s.cta}</span>
                  </Button>
                </div>
                <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" aria-hidden />
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
