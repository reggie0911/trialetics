'use client';

import Link from 'next/link';
import { ExternalLink, FileText, FlaskConical, MapPin, Receipt, User } from 'lucide-react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { CardSource } from '@/lib/ai/types';

/**
 * Inline citation rail rendered at the foot of every structured card.
 * Each chip deep-links into the underlying record (study, site, subject,
 * document, etc.) so reviewers can audit the data behind the AI output.
 * Excerpts (e.g. for documents) surface in a popover on hover.
 */
export function SourceCitations({
  sources,
  className,
}: {
  sources?: CardSource[] | null;
  className?: string;
}) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Sources</span>
      {sources.map(source => (
        <SourceChip key={`${source.kind}-${source.id}`} source={source} />
      ))}
    </div>
  );
}

function SourceChip({ source }: { source: CardSource }) {
  const href = source.href ?? defaultHref(source);
  const Icon = ICONS[source.kind] ?? ExternalLink;
  const body = (
    <span className="inline-flex max-w-[180px] items-center gap-1 truncate rounded-full border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium hover:bg-muted">
      <Icon className="h-2.5 w-2.5 shrink-0" />
      <span className="truncate">{source.label}</span>
    </span>
  );

  if (source.excerpt) {
    return (
      <Popover>
        <PopoverTrigger className="inline-flex" type="button">
          {body}
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-72 gap-1 p-3 text-xs">
          <p className="text-[11px] font-medium">{source.label}</p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            &ldquo;{source.excerpt}&rdquo;
          </p>
          {href ? (
            <Link
              href={href}
              className="text-[11px] text-[var(--copilot-accent)] hover:underline"
            >
              Open source &rarr;
            </Link>
          ) : null}
        </PopoverContent>
      </Popover>
    );
  }

  return href ? (
    <Link href={href} className="inline-flex">
      {body}
    </Link>
  ) : (
    body
  );
}

function defaultHref(source: CardSource): string | undefined {
  switch (source.kind) {
    case 'study':
      return `/protected/studies/${source.id}`;
    case 'site':
      return `/protected/sites/${source.id}`;
    case 'subject':
      return `/protected/subjects/${source.id}`;
    case 'visit':
      return `/protected/visits/${source.id}`;
    case 'document':
      return `/protected/document-management/${source.id}`;
    case 'task':
      return `/protected/tasks/${source.id}`;
    case 'financial_record':
      return `/protected/financials/${source.id}`;
    default:
      return undefined;
  }
}

const ICONS: Partial<Record<CardSource['kind'], React.ComponentType<{ className?: string }>>> = {
  study: FlaskConical,
  site: MapPin,
  subject: User,
  document: FileText,
  document_chunk: FileText,
  financial_record: Receipt,
};
