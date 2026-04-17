'use client';

import { useEffect } from 'react';

/**
 * Keyboard-first shortcuts for the Copilot.
 *
 * Phase 1 ships:
 *   - Cmd+K / Ctrl+K -> open the Copilot from anywhere
 *   - Esc            -> close
 *   - j / k          -> navigate cards (handled by the active surface; we just
 *                       fan the keystroke out via a custom event)
 *   - enter          -> accept (when a card is focused)
 *   - e              -> edit
 *   - d              -> discard
 *
 * The shell consumes only the open/close shortcuts; the j/k/enter/e/d events
 * are dispatched as `copilot:keynav` CustomEvents so per-card components
 * (Phase 2 onward) can opt in without wiring their own listeners.
 *
 * We never fire shortcuts while the user is typing in an input, textarea, or
 * contenteditable region — Copilot is a global utility, not a hijacker.
 */

export type CopilotKeyAction =
  | 'open'
  | 'close'
  | 'next'
  | 'prev'
  | 'accept'
  | 'edit'
  | 'discard';

export interface UseCopilotShortcutsOptions {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  /**
   * Optional handler invoked for j/k/enter/e/d keystrokes. If omitted, the
   * shortcuts dispatch a `copilot:keynav` CustomEvent on `window` instead so
   * per-card consumers can subscribe.
   */
  onKeyAction?: (action: CopilotKeyAction) => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useCopilotShortcuts(opts: UseCopilotShortcutsOptions): void {
  const { open, onOpen, onClose, onKeyAction } = opts;

  useEffect(() => {
    function handler(event: KeyboardEvent) {
      const isMod = event.metaKey || event.ctrlKey;

      if (isMod && (event.key === 'k' || event.key === 'K')) {
        event.preventDefault();
        if (open) onClose();
        else onOpen();
        return;
      }

      if (event.key === 'Escape' && open) {
        onClose();
        return;
      }

      if (!open) return;
      if (isTypingTarget(event.target)) return;

      let action: CopilotKeyAction | null = null;
      switch (event.key) {
        case 'j':
          action = 'next';
          break;
        case 'k':
          action = 'prev';
          break;
        case 'Enter':
          action = 'accept';
          break;
        case 'e':
          action = 'edit';
          break;
        case 'd':
          action = 'discard';
          break;
        default:
          break;
      }

      if (!action) return;
      event.preventDefault();
      if (onKeyAction) {
        onKeyAction(action);
      } else if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('copilot:keynav', { detail: { action } }));
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpen, onClose, onKeyAction]);
}
