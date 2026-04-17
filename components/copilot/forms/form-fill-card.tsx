'use client';

import { AlertTriangle, Check, Pencil, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConfidenceIndicator } from '@/components/copilot/cards/confidence-indicator';
import { SourceCitations } from '@/components/copilot/cards/source-citations';
import { WhyThis } from '@/components/copilot/cards/why-this';
import { cn } from '@/lib/utils';
import type { FormFillPayload, FormFieldProposal } from '@/lib/ai/types';

/**
 * `<FormFillCard />` — the per-field review surface for a form_fill payload.
 *
 * Renders a list mirroring the target form's fields with proposal values,
 * per-field provenance, and per-field accept toggles. The host form passes
 * the AI proposal in via `payload` and receives back the user-confirmed
 * subset on Apply.
 *
 * The host owns RHF and the actual write — this card never touches the form
 * directly. That keeps the form's existing validation, RBAC, and
 * lib/actions/* paths in charge of the commit.
 */
export interface FormFillCardProps {
  payload: FormFillPayload;
  /** Current form values — used to render before/after and warn on overwrites. */
  currentValues: Record<string, unknown>;
  onApply: (acceptedFields: FormFieldProposal[], reasonsByPath: Record<string, string>) => void;
  onDiscard?: () => void;
  /** When true, every accept requires confirming a reason-for-change. */
  requireReason?: boolean;
  busy?: boolean;
}

export function FormFillCard({
  payload,
  currentValues,
  onApply,
  onDiscard,
  requireReason,
  busy,
}: FormFillCardProps) {
  const [acceptedPaths, setAcceptedPaths] = useState<Set<string>>(() => new Set(payload.fields.map(f => f.path)));
  const [editedValues, setEditedValues] = useState<Record<string, unknown>>({});
  const [reasonsByPath, setReasonsByPath] = useState<Record<string, string>>({});

  const acceptedCount = acceptedPaths.size;
  const lowConfidenceCount = useMemo(
    () => payload.fields.filter(f => f.confidence === 'low' && acceptedPaths.has(f.path)).length,
    [payload.fields, acceptedPaths]
  );

  const togglePath = (path: string) => {
    setAcceptedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleApply = () => {
    const acceptedFields: FormFieldProposal[] = payload.fields
      .filter(f => acceptedPaths.has(f.path))
      .map(f => ({ ...f, value: editedValues[f.path] !== undefined ? editedValues[f.path] : f.value }));
    onApply(acceptedFields, reasonsByPath);
  };

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <header className="flex flex-col gap-2 border-b border-border bg-background px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--copilot-accent)' }} />
              <h2 className="text-sm font-semibold">Fill {payload.schemaLabel ?? payload.schemaId}</h2>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {payload.fields.length} fields proposed by{' '}
              <span className="font-mono">{payload.agentId}</span>
              {payload.agentVersion ? ` (v${payload.agentVersion})` : ''}.
            </p>
          </div>
          {payload.requiresESignature ? (
            <Badge variant="secondary" className="text-[10px]">
              E-signature required
            </Badge>
          ) : null}
        </div>

        {payload.missingRequired.length > 0 ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              {payload.missingRequired.length} required field
              {payload.missingRequired.length === 1 ? '' : 's'} still empty: {payload.missingRequired.join(', ')}
            </span>
          </div>
        ) : null}
      </header>

      <ScrollArea className="flex-1">
        <ul className="divide-y divide-border">
          {payload.fields.length === 0 ? (
            <li className="px-4 py-8 text-center text-xs text-muted-foreground">
              No proposals from the source. Try a different document or fill the form manually.
            </li>
          ) : null}
          {payload.fields.map(field => {
            const accepted = acceptedPaths.has(field.path);
            const previous = (currentValues as Record<string, unknown>)[field.path];
            const isEdited = editedValues[field.path] !== undefined;
            const effectiveValue = isEdited ? editedValues[field.path] : field.value;
            return (
              <li
                key={field.path}
                className={cn(
                  'flex flex-col gap-2 px-4 py-3',
                  accepted && 'border-l-2',
                  accepted && '[border-left-color:var(--copilot-accent)]'
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={accepted}
                    onCheckedChange={() => togglePath(field.path)}
                    aria-label={`Accept proposed value for ${field.label ?? field.path}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-medium leading-tight">{field.label ?? field.path}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{field.path}</span>
                      <ConfidenceIndicator level={field.confidence} size="xs" />
                      {field.requiresConfirmation ? (
                        <Badge variant="outline" className="border-amber-500/50 text-[10px] text-amber-600 dark:text-amber-400">
                          Confirm
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Current</span>
                        <div className="mt-0.5 font-mono break-words text-muted-foreground">
                          {formatValue(previous) || <em>empty</em>}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Proposed</span>
                        <Input
                          value={formatValue(effectiveValue)}
                          onChange={e => setEditedValues(prev => ({ ...prev, [field.path]: e.target.value }))}
                          className="mt-0.5 h-7 text-[11px]"
                        />
                      </div>
                    </div>
                    {field.rationale ? (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <WhyThis rationale={field.rationale} agentId={payload.agentId} agentVersion={payload.agentVersion} />
                        {isEdited ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Pencil className="h-2.5 w-2.5" /> edited
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {field.sources?.length ? (
                      <SourceCitations sources={field.sources} className="mt-1.5" />
                    ) : null}
                    {requireReason && accepted ? (
                      <Input
                        value={reasonsByPath[field.path] ?? ''}
                        onChange={e =>
                          setReasonsByPath(prev => ({ ...prev, [field.path]: e.target.value }))
                        }
                        placeholder="Reason for change (required for regulated forms)"
                        className="mt-1.5 h-7 text-[11px]"
                      />
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </ScrollArea>

      <footer className="flex items-center justify-between gap-3 border-t border-border bg-background px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{acceptedCount} of {payload.fields.length} accepted</span>
          {lowConfidenceCount > 0 ? (
            <Badge variant="outline" className="border-amber-500/50 text-[10px] text-amber-600 dark:text-amber-400">
              {lowConfidenceCount} low confidence
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {onDiscard ? (
            <Button type="button" variant="ghost" size="sm" onClick={onDiscard} disabled={busy}>
              <X className="mr-1 h-3 w-3" /> Discard
            </Button>
          ) : null}
          <Button type="button" size="sm" onClick={handleApply} disabled={busy || acceptedCount === 0}>
            <Check className="mr-1 h-3 w-3" /> Apply {acceptedCount} field{acceptedCount === 1 ? '' : 's'}
          </Button>
        </div>
      </footer>
    </section>
  );
}

function formatValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
