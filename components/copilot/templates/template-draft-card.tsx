'use client';

import { Check, Sparkles, X } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { ConfidenceIndicator } from '@/components/copilot/cards/confidence-indicator';
import { SourceCitations } from '@/components/copilot/cards/source-citations';
import type { TemplateFillPayload, TemplateSectionProposal } from '@/lib/ai/types';

/**
 * `<TemplateDraftCard />` — side-by-side template review and editor.
 *
 * The left lane shows the AI-drafted section text; the right lane is
 * editable. Placeholder chips render as inline pills the user can resolve.
 */
export interface TemplateDraftCardProps {
  payload: TemplateFillPayload;
  onApply: (sections: TemplateSectionProposal[], reason?: string) => void;
  onDiscard?: () => void;
  busy?: boolean;
}

export function TemplateDraftCard({ payload, onApply, onDiscard, busy }: TemplateDraftCardProps) {
  const [edited, setEdited] = useState<Record<string, string>>(() =>
    Object.fromEntries(payload.sections.map(s => [s.id, s.content]))
  );
  const [reason, setReason] = useState<string>('');

  const placeholderCount = payload.sections.reduce(
    (acc, s) => acc + (s.placeholders?.length ?? 0),
    0
  );

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <header className="flex items-start justify-between gap-3 border-b border-border bg-background px-4 py-3">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--copilot-accent)' }} />
            <h2 className="text-sm font-semibold">{payload.templateLabel ?? payload.templateId}</h2>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {payload.sections.length} sections drafted by{' '}
            <span className="font-mono">{payload.agentId}</span>
            {payload.agentVersion ? ` (v${payload.agentVersion})` : ''}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {placeholderCount > 0 ? (
            <Badge variant="outline" className="text-[10px]">
              {placeholderCount} placeholder{placeholderCount === 1 ? '' : 's'}
            </Badge>
          ) : null}
          {payload.requiresESignature ? (
            <Badge variant="secondary" className="text-[10px]">
              E-signature required
            </Badge>
          ) : null}
        </div>
      </header>

      <ScrollArea className="flex-1">
        <ul className="divide-y divide-border">
          {payload.sections.map(section => (
            <li key={section.id} className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium">{section.label}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {section.kind}
                  </Badge>
                  <ConfidenceIndicator level={section.confidence} size="xs" />
                </div>
                {section.placeholders?.length ? (
                  <span className="text-[10px] text-muted-foreground">
                    {section.placeholders.length} unresolved placeholder
                    {section.placeholders.length === 1 ? '' : 's'}
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    AI draft
                  </div>
                  <pre className="mt-1 whitespace-pre-wrap break-words rounded-md border border-border bg-muted/30 px-2 py-2 font-mono text-[11px] text-muted-foreground">
                    {section.content || '—'}
                  </pre>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Editable
                  </div>
                  <Textarea
                    value={edited[section.id] ?? ''}
                    onChange={e => setEdited(prev => ({ ...prev, [section.id]: e.target.value }))}
                    className="mt-1 min-h-[80px] text-[11px]"
                  />
                  {section.placeholders?.length ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {section.placeholders.map(placeholder => (
                        <Badge key={placeholder} variant="outline" className="text-[10px]">
                          {`{{${placeholder}}}`}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {section.sources?.length ? (
                <SourceCitations sources={section.sources} className="mt-2" />
              ) : null}
            </li>
          ))}
        </ul>
      </ScrollArea>

      <footer className="flex flex-col gap-2 border-t border-border bg-background px-4 py-3">
        <Textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason for change (logged in audit on Apply)"
          className="min-h-[40px] text-[11px]"
        />
        <div className="flex items-center justify-end gap-2">
          {onDiscard ? (
            <Button type="button" size="sm" variant="ghost" onClick={onDiscard} disabled={busy}>
              <X className="mr-1 h-3 w-3" /> Discard
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => {
              const sections = payload.sections.map(section => ({
                ...section,
                content: edited[section.id] ?? section.content,
              }));
              onApply(sections, reason || undefined);
            }}
          >
            <Check className="mr-1 h-3 w-3" /> Apply draft
          </Button>
        </div>
      </footer>
    </section>
  );
}
