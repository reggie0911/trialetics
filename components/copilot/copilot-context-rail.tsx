'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Beaker,
  ClipboardList,
  FileText,
  MapPin,
  ShieldOff,
  User,
  Wrench,
} from 'lucide-react';

import { useCopilotContext, type CopilotContextValue } from '@/lib/copilot/context-provider';
import { moduleLabel } from '@/lib/copilot/context-resolver';

interface PendingItem {
  description: string;
  status: string;
}

/**
 * Right inspector for fullscreen Copilot. Replaces the top-of-shell
 * `<CopilotContextBar />` chip strip in fullscreen mode and adds live
 * affordances: pending approvals (driven by `copilot:pending-confirmations`
 * window events emitted by the chat), the latest tool call status (driven by
 * `copilot:tool-status`), and a placeholder for source citations.
 *
 * Hidden below `lg` so it never crowds the chat column on narrow viewports.
 */
export function CopilotContextRail() {
  const ctx = useCopilotContext();
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingItem[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onTool = (e: Event) => {
      const detail = (e as CustomEvent<{ status: string | null }>).detail;
      setToolStatus(detail?.status ?? null);
    };
    const onPending = (e: Event) => {
      const detail = (e as CustomEvent<{ items: PendingItem[] }>).detail;
      setPending(detail?.items ?? []);
    };
    window.addEventListener('copilot:tool-status', onTool as EventListener);
    window.addEventListener('copilot:pending-confirmations', onPending as EventListener);
    return () => {
      window.removeEventListener('copilot:tool-status', onTool as EventListener);
      window.removeEventListener('copilot:pending-confirmations', onPending as EventListener);
    };
  }, []);

  const ctxRows = buildContextRows(ctx);
  const pendingNow = pending.filter(i => i.status === 'pending');

  return (
    <aside className="hidden h-full w-[280px] shrink-0 flex-col border-l bg-muted/20 lg:flex">
      <div className="border-b px-4 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Working context
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section title="Context">
          {ctxRows.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">No active scope.</p>
          ) : (
            <div className="space-y-2">
              {ctxRows.map((row, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px]">
                  <span className="mt-0.5 text-muted-foreground">{row.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {row.label}
                    </p>
                    <p className="truncate text-foreground">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Pending approvals">
          {pendingNow.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">No actions waiting.</p>
          ) : (
            <div className="space-y-1.5">
              {pendingNow.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-[11px]"
                >
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
                  <span className="line-clamp-2">{item.description}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Last tool call">
          {toolStatus ? (
            <div className="flex items-center gap-2 rounded-md bg-muted px-2 py-1.5 text-[11px]">
              <Wrench className="h-3 w-3 animate-pulse text-muted-foreground" />
              <span className="truncate">{toolStatus}</span>
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground">No tool calls yet.</p>
          )}
        </Section>

        <Section title="Citations">
          <p className="text-[12px] text-muted-foreground">
            Source citations from completed answers will appear here.
          </p>
        </Section>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b px-4 py-3 last:border-b-0">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function buildContextRows(ctx: CopilotContextValue) {
  const rows: Array<{ icon: React.ReactNode; label: string; value: string }> = [];

  rows.push({
    icon: <ClipboardList className="h-3 w-3" />,
    label: 'Module',
    value: moduleLabel(ctx.module),
  });

  if (ctx.studyTitle || ctx.studyId) {
    rows.push({
      icon: <Beaker className="h-3 w-3" />,
      label: ctx.studyStatus ? `Study (${ctx.studyStatus})` : 'Study',
      value: ctx.studyTitle ?? ctx.studyId ?? '—',
    });
  }

  if (ctx.isStudyReadOnly) {
    rows.push({
      icon: <ShieldOff className="h-3 w-3 text-amber-600" />,
      label: 'Status',
      value: 'Read-only',
    });
  }

  if (ctx.siteName || ctx.siteId) {
    rows.push({
      icon: <MapPin className="h-3 w-3" />,
      label: 'Site',
      value: ctx.siteName ?? ctx.siteId ?? '—',
    });
  }

  if (ctx.subjectLabel || ctx.subjectId) {
    rows.push({
      icon: <User className="h-3 w-3" />,
      label: 'Subject',
      value: ctx.subjectLabel ?? ctx.subjectId ?? '—',
    });
  }

  if (ctx.visitLabel || ctx.visitId) {
    rows.push({
      icon: <ClipboardList className="h-3 w-3" />,
      label: 'Visit',
      value: ctx.visitLabel ?? ctx.visitId ?? '—',
    });
  }

  if (ctx.documentLabel || ctx.documentId) {
    rows.push({
      icon: <FileText className="h-3 w-3" />,
      label: 'Document',
      value: ctx.documentLabel ?? ctx.documentId ?? '—',
    });
  }

  return rows;
}
