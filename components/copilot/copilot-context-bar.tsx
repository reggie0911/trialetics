'use client';

import { Beaker, FileText, MapPin, ShieldOff, User, ClipboardList, Receipt } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useCopilotContext } from '@/lib/copilot/context-provider';
import { moduleLabel } from '@/lib/copilot/context-resolver';

/**
 * Compact strip of context chips shown above the tabs in the Copilot shell.
 * Each chip surfaces what scope the Copilot is reasoning about so the user
 * always knows whether a question / action will be applied to the whole
 * portfolio, a study, a site, a subject, or a single record.
 */
export function CopilotContextBar() {
  const ctx = useCopilotContext();
  const chips: Array<{ icon: React.ReactNode; label: string; tooltip: string; tone?: 'accent' | 'warn' }> = [];

  chips.push({
    icon: <ClipboardList className="h-3 w-3" />,
    label: moduleLabel(ctx.module),
    tooltip: `Detected module from ${ctx.pathname}`,
    tone: 'accent',
  });

  if (ctx.studyTitle) {
    chips.push({
      icon: <Beaker className="h-3 w-3" />,
      label: truncate(ctx.studyTitle, 32),
      tooltip: `Active study${ctx.studyStatus ? ` — status: ${ctx.studyStatus}` : ''}`,
    });
  } else if (ctx.studyId) {
    chips.push({
      icon: <Beaker className="h-3 w-3" />,
      label: 'Study',
      tooltip: `Study id: ${ctx.studyId}`,
    });
  }

  if (ctx.isStudyReadOnly) {
    chips.push({
      icon: <ShieldOff className="h-3 w-3" />,
      label: 'Read-only',
      tooltip: 'This study is closed. Approve buttons will be disabled.',
      tone: 'warn',
    });
  }

  if (ctx.siteName || ctx.siteId) {
    chips.push({
      icon: <MapPin className="h-3 w-3" />,
      label: ctx.siteName ? truncate(ctx.siteName, 24) : 'Site',
      tooltip: ctx.siteId ? `Site id: ${ctx.siteId}` : 'Site context',
    });
  }

  if (ctx.subjectLabel || ctx.subjectId) {
    chips.push({
      icon: <User className="h-3 w-3" />,
      label: ctx.subjectLabel ?? 'Subject',
      tooltip: ctx.subjectId ? `Subject id: ${ctx.subjectId}` : 'Subject context',
    });
  }

  if (ctx.visitLabel || ctx.visitId) {
    chips.push({
      icon: <ClipboardList className="h-3 w-3" />,
      label: ctx.visitLabel ?? 'Visit',
      tooltip: ctx.visitId ? `Visit/report id: ${ctx.visitId}` : 'Visit context',
    });
  }

  if (ctx.documentLabel || ctx.documentId) {
    chips.push({
      icon: <FileText className="h-3 w-3" />,
      label: ctx.documentLabel ?? 'Document',
      tooltip: ctx.documentId ? `Document id: ${ctx.documentId}` : 'Document context',
    });
  }

  if (ctx.financialRecordLabel || ctx.financialRecordId) {
    chips.push({
      icon: <Receipt className="h-3 w-3" />,
      label: ctx.financialRecordLabel ?? 'Financial record',
      tooltip: ctx.financialRecordId
        ? `Record id: ${ctx.financialRecordId}`
        : 'Financial record context',
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5 border-b bg-muted/20 px-4 py-2">
      {chips.map((chip, idx) => (
        <Tooltip key={`${chip.label}-${idx}`}>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Badge
              variant="outline"
              className={`gap-1 px-1.5 py-0 text-[10px] font-normal ${
                chip.tone === 'accent'
                  ? 'border-[var(--copilot-accent)]/40 text-[var(--copilot-accent)]'
                  : chip.tone === 'warn'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  : ''
              }`}
            >
              {chip.icon}
              {chip.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-xs">
            {chip.tooltip}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
