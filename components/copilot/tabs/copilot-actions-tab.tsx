'use client';

import { useCallback } from 'react';
import { AlertTriangle, Loader2, Wrench } from 'lucide-react';

import { useCopilotContext } from '@/lib/copilot/context-provider';
import { moduleLabel } from '@/lib/copilot/context-resolver';
import { useCopilotActions } from '@/lib/copilot/use-copilot-insights';
import { isToolAllowedForRole } from '@/lib/ai/role-allowlist';
import type { ActionChipPayload } from '@/lib/ai/types';

import { ActionChip } from '../cards/action-chip';

/**
 * Phase 2 Actions tab — fetches `/api/ai/actions` and renders one
 * `<ActionChip />` per recommended action. Run/approve flows route through
 * a `copilot:run-action` event picked up by the chat tab so execution still
 * goes through the orchestrator (where audit + role-allowlist live).
 *
 * Phase 2 reuses the chat orchestrator on purpose: it gives us one audit
 * trail and one place to add e-signature in Phase 5.
 */
export function CopilotActionsTab() {
  const { module, studyTitle, isStudyReadOnly, userRole } = useCopilotContext();
  const { data, loading, error, refresh } = useCopilotActions();

  const handleRun = useCallback((chip: ActionChipPayload, opts: { reason?: string }) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('copilot:run-action', { detail: { chip, reason: opts.reason } })
    );
  }, []);

  if (loading && !data) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Resolving actions for the {moduleLabel(module).toLowerCase()} page&hellip;
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <AlertTriangle className="mb-2 h-5 w-5 text-amber-500" />
        <p className="text-xs font-medium">Couldn&rsquo;t load actions</p>
        <p className="mt-1 max-w-xs text-[11px] text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="mt-3 rounded-md border border-border bg-background px-3 py-1 text-[11px] hover:bg-muted"
        >
          Try again
        </button>
      </div>
    );
  }

  const actions = data?.actions ?? [];

  if (actions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
        <div
          className="mb-3 flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: 'color-mix(in oklch, var(--copilot-accent) 12%, transparent)' }}
        >
          <Wrench className="h-5 w-5" style={{ color: 'var(--copilot-accent)' }} />
        </div>
        <p className="text-xs font-medium">No recommended actions yet</p>
        <p className="mt-1 max-w-xs text-[11px] text-muted-foreground">
          The Copilot doesn&rsquo;t have a high-confidence next-best-action for this page
          {studyTitle ? ` (${studyTitle})` : ''} right now. Open the Chat tab or pin one from the
          Insights tab.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto px-3 py-3">
      {actions.map(chip => (
        <ActionChip
          key={chip.id}
          chip={chip}
          permitted={isToolAllowedForRole(userRole, chip.tool)}
          readOnly={isStudyReadOnly}
          onRun={handleRun}
        />
      ))}
    </div>
  );
}
