'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, Info, OctagonAlert } from 'lucide-react';

import { Card } from '@/components/ui/card';
import type { EcrfAlert } from '@/lib/types/ctms';
import { cn } from '@/lib/utils';

const SEVERITY_BORDER: Record<EcrfAlert['severity'], string> = {
  critical: 'border-l-4 border-l-red-500',
  warn: 'border-l-4 border-l-amber-500',
  info: 'border-l-4 border-l-blue-500',
};

const SEVERITY_ICON_TONE: Record<EcrfAlert['severity'], string> = {
  critical: 'text-red-500',
  warn: 'text-amber-500',
  info: 'text-blue-500',
};

function SeverityIcon({ severity, className }: { severity: EcrfAlert['severity']; className?: string }) {
  if (severity === 'critical') return <OctagonAlert className={className} />;
  if (severity === 'warn') return <AlertTriangle className={className} />;
  return <Info className={className} />;
}

interface AlertCalloutRowProps {
  alerts: EcrfAlert[];
}

/**
 * Horizontal strip of (up to 3) alert cards rendered above the toolbar on
 * each tab. Each card is a deep-link into a relevant table filter so the user
 * can act on the alert without re-querying the page.
 *
 * Renders nothing when the alert feed is empty so it doesn't add visual
 * weight to a healthy study.
 */
export function AlertCalloutRow({ alerts }: AlertCalloutRowProps) {
  if (alerts.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {alerts.map((a) => {
        const cardClasses = cn(
          'gap-1 px-3 py-3 transition-colors',
          SEVERITY_BORDER[a.severity],
          a.ctaHref && 'hover:bg-accent/40',
        );
        const inner = (
          <div className="flex items-start gap-2">
            <SeverityIcon
              severity={a.severity}
              className={cn('mt-0.5 h-4 w-4 shrink-0', SEVERITY_ICON_TONE[a.severity])}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <span className="truncate">{a.title}</span>
              </div>
              {a.subtitle && (
                <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                  {a.subtitle}
                </p>
              )}
              {a.ctaHref && (
                <span className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-medium text-primary">
                  {a.ctaLabel ?? 'View'} <ArrowRight className="h-3 w-3" />
                </span>
              )}
            </div>
          </div>
        );
        if (a.ctaHref) {
          return (
            <Link key={a.id} href={a.ctaHref} className="block focus:outline-none">
              <Card className={cardClasses}>{inner}</Card>
            </Link>
          );
        }
        return (
          <Card key={a.id} className={cardClasses}>
            {inner}
          </Card>
        );
      })}
    </div>
  );
}
