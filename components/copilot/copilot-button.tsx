'use client';

import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCopilotContext } from '@/lib/copilot/context-provider';

const HIDE_ON_ROUTES = [
  '/protected/patients',
  '/protected/ae',
  '/protected/ecrf-query-tracker',
  '/protected/sdv-tracker',
  '/protected/vw',
  '/protected/mc',
];

/**
 * Header trigger for the Trialetics Copilot. Replaces the legacy
 * `AIAssistantInlineButton` in the top navbar. The Copilot shell is mounted
 * once at the protected layout level, so this button only flips the
 * shared open/close flag through `useCopilotContext`.
 *
 * Hidden on the same legacy tracker routes the old assistant skipped.
 */
export function CopilotInlineButton() {
  const pathname = usePathname();
  const { isOpen, open, module } = useCopilotContext();

  if (HIDE_ON_ROUTES.some(r => pathname.startsWith(r))) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            onClick={() => open()}
            variant="ghost"
            size="icon"
            className="relative h-9 w-9"
            aria-label="Open Trialetics Copilot"
            aria-pressed={isOpen}
          >
            <Sparkles className="h-4 w-4" style={{ color: 'var(--copilot-accent)' }} />
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full"
              style={{ background: 'var(--copilot-accent)' }}
              title={`Context: ${module}`}
            />
          </Button>
        }
      />
      <TooltipContent side="bottom" className="max-w-xs text-xs">
        <span>Open Trialetics Copilot</span>
        <Kbd className="ml-2 text-[10px]">{typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? '⌘K' : 'Ctrl K'}</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Optional floating-action variant. Phase 1 keeps this around for parity
 * with the legacy `AIAssistantButton` so any caller that imported the
 * floating version still has an option, even though the new design uses the
 * inline header trigger by default.
 */
export function CopilotButton() {
  const pathname = usePathname();
  const { open } = useCopilotContext();

  if (HIDE_ON_ROUTES.some(r => pathname.startsWith(r))) {
    return null;
  }

  return (
    <Button
      onClick={() => open()}
      className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg transition-transform duration-200 hover:scale-105"
      style={{ background: 'var(--copilot-accent)', color: 'var(--copilot-accent-foreground)' }}
      size="icon"
      aria-label="Open Trialetics Copilot"
    >
      <Sparkles className="h-6 w-6" />
    </Button>
  );
}
