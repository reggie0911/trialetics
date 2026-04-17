/**
 * Trialetics Copilot — public component surface.
 *
 * Phase 1 ships the new Copilot shell + 4 tabs (Chat, Actions, Insights, Agents)
 * with the existing assistant chat/voice/history/settings hosted unchanged
 * inside the new shell. Voice / History / Settings are reachable from the
 * shell header overflow menu.
 *
 * Old `components/ai-assistant/` re-exports from here as a thin shim during
 * the migration window (removed at the end of Phase 5).
 */

export { CopilotButton, CopilotInlineButton } from './copilot-button';
export { CopilotShell } from './copilot-shell';
export { CopilotContextBar } from './copilot-context-bar';

export { AIAssistantButton, AIAssistantInlineButton } from './ai-assistant-button';
export { AIAssistantPanel } from './ai-assistant-panel';
export { AIAssistantChat } from './ai-assistant-chat';
export { AIAssistantInput } from './ai-assistant-input';
export { AIAssistantVoice } from './ai-assistant-voice';
export { AIVoiceSelector } from './ai-voice-selector';
export { SoundWaveAnimation } from './sound-wave-animation';
