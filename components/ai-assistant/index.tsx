/**
 * DO NOT DELETE before Phase 5.
 *
 * This file is a temporary re-export shim that preserves the legacy
 * `@/components/ai-assistant` import path while the rest of the codebase
 * migrates to `@/components/copilot`. It will be removed as the final
 * step of Phase 5 of the Copilot rollout.
 *
 * If you are adding a new symbol, add it to `components/copilot/index.tsx`
 * directly — do not extend this shim.
 */
export {
  AIAssistantButton,
  AIAssistantInlineButton,
  AIAssistantPanel,
  AIAssistantChat,
  AIAssistantInput,
  AIAssistantVoice,
  AIVoiceSelector,
  SoundWaveAnimation,
} from '@/components/copilot';
