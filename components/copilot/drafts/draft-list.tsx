'use client';

import Link from 'next/link';
import { FileSignature, Mail, FileText, BarChart3, MessageSquare, FileCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { DraftKind, DraftRecord, DraftStatus } from '@/lib/copilot/drafts';

const KIND_ICON: Record<DraftKind, React.ReactNode> = {
  email: <Mail className="h-3.5 w-3.5" />,
  memo: <FileText className="h-3.5 w-3.5" />,
  narrative: <FileText className="h-3.5 w-3.5" />,
  report: <BarChart3 className="h-3.5 w-3.5" />,
  document: <FileCheck className="h-3.5 w-3.5" />,
  message: <MessageSquare className="h-3.5 w-3.5" />,
  other: <FileText className="h-3.5 w-3.5" />,
};

const STATUS_VARIANT: Record<DraftStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  in_review: 'secondary',
  approved: 'secondary',
  signed: 'default',
  rejected: 'destructive',
  discarded: 'outline',
};

const STATUS_LABEL: Record<DraftStatus, string> = {
  draft: 'Draft',
  in_review: 'In review',
  approved: 'Approved',
  signed: 'Signed',
  rejected: 'Rejected',
  discarded: 'Discarded',
};

export function DraftList({ drafts }: { drafts: DraftRecord[] }) {
  if (!drafts.length) {
    return (
      <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
        No drafts yet. Generate one above to get started.
      </p>
    );
  }
  return (
    <ul className="divide-y rounded-md border">
      {drafts.map(d => (
        <li key={d.id}>
          <Link
            href={`/protected/copilot/drafts/${d.id}`}
            className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/40"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
              style={{ color: 'var(--copilot-accent)' }}
            >
              {d.status === 'signed' ? <FileSignature className="h-4 w-4" /> : KIND_ICON[d.kind]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-normal">{d.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {d.kind} &bull; v{d.currentVersion} &bull;{' '}
                {new Date(d.updatedAt).toLocaleString()}
              </p>
            </div>
            <Badge variant={STATUS_VARIANT[d.status]} className="shrink-0 text-[10px]">
              {STATUS_LABEL[d.status]}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
