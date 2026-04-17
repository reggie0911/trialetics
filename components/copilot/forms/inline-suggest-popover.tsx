'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ConfidenceIndicator } from '@/components/copilot/cards/confidence-indicator';
import type { FieldSuggestPayload } from '@/lib/ai/types';

/**
 * Per-field "Suggest with Copilot" popover.
 *
 * Mounted next to a single RHF field. Calls the `/api/ai/field-suggest`
 * endpoint with the field path and current form state — surfaces a single
 * value with rationale and confidence, one-click apply.
 */
export function InlineSuggestPopover({
  schemaId,
  fieldPath,
  currentValues,
  onApply,
  hint,
  disabled,
}: {
  schemaId: string;
  fieldPath: string;
  currentValues?: Record<string, unknown>;
  onApply: (value: unknown) => void;
  hint?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<FieldSuggestPayload | null>(null);
  const [empty, setEmpty] = useState(false);

  const handleOpen = async (next: boolean) => {
    setOpen(next);
    if (!next) return;
    if (suggestion) return;
    setLoading(true);
    setEmpty(false);
    try {
      const res = await fetch('/api/ai/field-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemaId, fieldPath, currentValues, hint }),
      });
      const json = (await res.json().catch(() => ({}))) as { suggestion?: FieldSuggestPayload | null };
      if (json.suggestion) setSuggestion(json.suggestion);
      else setEmpty(true);
    } catch {
      setEmpty(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={disabled}
                  aria-label="Suggest with Copilot"
                >
                  <Sparkles className="h-3 w-3" style={{ color: 'var(--copilot-accent)' }} />
                </Button>
              }
            />
          }
        />
        <TooltipContent side="top" className="text-xs">
          Suggest a value
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-72 text-[11px]">
        {loading ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            Thinking…
          </div>
        ) : empty ? (
          <div className="text-muted-foreground">No grounded suggestion available — fill manually.</div>
        ) : suggestion ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Suggested value
              </span>
              <ConfidenceIndicator level={suggestion.confidence} size="xs" />
            </div>
            <div className="rounded-md border border-border bg-muted/40 px-2 py-1.5 font-mono break-words">
              {String(suggestion.value)}
            </div>
            {suggestion.rationale ? (
              <p className="text-muted-foreground">{suggestion.rationale}</p>
            ) : null}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
                Dismiss
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onApply(suggestion.value);
                  setOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
