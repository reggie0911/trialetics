'use client';

import { useCallback, useEffect } from 'react';

import type { ActionChipPayload } from '@/lib/ai/types';

import { AIAssistantChat, type AgentInfo } from '../ai-assistant-chat';

interface CopilotChatTabProps {
  sessionId: string | null;
  onSessionChange: (id: string | null) => void;
  onOpenVoice: () => void;
  variant?: 'narrow' | 'fullscreen';
  selectedAgent?: string | undefined;
  onSelectedAgentChange?: (id: string | undefined) => void;
  onAgentsLoaded?: (agents: AgentInfo[]) => void;
}

/**
 * Phase 2 Chat tab — wraps the existing `AIAssistantChat` and bridges the
 * `copilot:run-action` event from the Actions tab into a chat prompt. This
 * keeps execution on a single audited path (the chat orchestrator) so all
 * Phase 5 audit-log work applies automatically.
 *
 * The prompt syntax (`/run-tool {agentId} {tool} {json args}`) is a stable
 * convention the orchestrator can branch on later if we need direct tool
 * invocation without LLM round-trips. For now the model interprets the chip
 * and invokes the tool through normal tool-calling.
 */
export function CopilotChatTab({
  sessionId,
  onSessionChange,
  onOpenVoice,
  variant,
  selectedAgent,
  onSelectedAgentChange,
  onAgentsLoaded,
}: CopilotChatTabProps) {
  const handleVoiceMode = useCallback(() => {
    onOpenVoice();
  }, [onOpenVoice]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onRunAction = (event: Event) => {
      const detail = (event as CustomEvent<{ chip: ActionChipPayload; reason?: string }>).detail;
      if (!detail?.chip) return;
      const { chip, reason } = detail;
      const argsBlob = chip.args ? `\n\nargs: ${JSON.stringify(chip.args)}` : '';
      const reasonBlob = reason ? `\n\nReason for change: ${reason}` : '';
      const prompt = `Please run the action chip "${chip.label}" by invoking the \`${chip.tool}\` tool from the \`${chip.agentId}\` agent.${argsBlob}${reasonBlob}`;
      window.dispatchEvent(new CustomEvent('copilot:chat-prompt', { detail: { prompt, agentId: chip.agentId } }));
    };

    window.addEventListener('copilot:run-action', onRunAction as EventListener);
    return () => window.removeEventListener('copilot:run-action', onRunAction as EventListener);
  }, []);

  return (
    <AIAssistantChat
      key={sessionId ?? 'new'}
      sessionId={sessionId}
      onSessionChange={onSessionChange}
      onVoiceMode={handleVoiceMode}
      variant={variant}
      selectedAgent={selectedAgent}
      onSelectedAgentChange={onSelectedAgentChange}
      onAgentsLoaded={onAgentsLoaded}
    />
  );
}
