'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Renders a compact "Last refreshed Xm ago" badge with an optional
 * refresh button. Mandatory on every Insights / Briefing card per the
 * trust micro-affordances spec.
 */
export function LastRefreshed({
  generatedAt,
  cached,
  onRefresh,
  className,
}: {
  generatedAt: string;
  cached?: boolean;
  onRefresh?: () => void;
  className?: string;
}) {
  const label = useRelativeTime(generatedAt);
  return (
    <div className={cn('flex items-center gap-1 text-[10px] text-muted-foreground', className)}>
      <span>
        Updated {label}
        {cached ? ' · cached' : ''}
      </span>
      {onRefresh ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={onRefresh}
                aria-label="Refresh"
                type="button"
              >
                <RefreshCw className="h-2.5 w-2.5" />
              </Button>
            }
          />
          <TooltipContent side="top" className="text-xs">
            Refresh data and re-run agents.
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}

function useRelativeTime(iso: string): string {
  // `now` is captured in state and bumped on an interval so the relative
  // label re-renders periodically. The initial value is computed lazily
  // (allowed in `useState`'s initializer per react-hooks/purity), and
  // updates only happen from inside the async interval callback (also
  // allowed by the set-state-in-effect rule).
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const generatedMs = Date.parse(iso);
  if (!Number.isFinite(generatedMs)) return 'just now';
  const diffSec = Math.max(0, Math.floor((now - generatedMs) / 1000));
  if (diffSec < 30) return 'just now';
  if (diffSec < 90) return '1m ago';
  if (diffSec < 60 * 60) return `${Math.round(diffSec / 60)}m ago`;
  if (diffSec < 60 * 60 * 24) return `${Math.round(diffSec / 3600)}h ago`;
  return `${Math.round(diffSec / 86_400)}d ago`;
}
