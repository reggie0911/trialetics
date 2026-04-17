/**
 * Maps logical model purposes to OpenAI model slugs. Agents declare a tier
 * (`'mini' | '4o' | 'realtime'`) on `AgentConfig.model` and the orchestrator
 * resolves it through here. Centralizing this lets us upgrade or downgrade
 * every list/score call without editing 40+ agents.
 *
 * Defaults are conservative: mini for everything cheap (list, score,
 * classify, agent recommendation, field suggest) and 4o only for outputs
 * a clinician will read (drafts, narratives, scenario reasoning).
 *
 * Override at deploy-time via `OPENAI_MODEL_MINI` / `OPENAI_MODEL_4O` /
 * `OPENAI_MODEL_REALTIME` env vars.
 */

export type ModelTier = 'mini' | '4o' | 'realtime';

export type ModelPurpose =
  | 'list'
  | 'score'
  | 'classify'
  | 'recommend_agent'
  | 'field_suggest'
  | 'extract'
  | 'draft'
  | 'narrative'
  | 'scenario'
  | 'voice'
  | 'chat';

const TIER_DEFAULTS: Record<ModelTier, string> = {
  mini: 'gpt-4o-mini',
  '4o': 'gpt-4o',
  realtime: 'gpt-4o-realtime-preview',
};

const PURPOSE_TO_TIER: Record<ModelPurpose, ModelTier> = {
  list: 'mini',
  score: 'mini',
  classify: 'mini',
  recommend_agent: 'mini',
  field_suggest: 'mini',
  extract: 'mini',
  draft: '4o',
  narrative: '4o',
  scenario: '4o',
  voice: 'realtime',
  chat: '4o',
};

const ENV_OVERRIDES: Record<ModelTier, string | undefined> = {
  mini: process.env.OPENAI_MODEL_MINI,
  '4o': process.env.OPENAI_MODEL_4O,
  realtime: process.env.OPENAI_MODEL_REALTIME,
};

/**
 * Resolve a tier (or raw OpenAI slug) to a concrete model id.
 * - If `value` is a known tier, env override wins, else the default for that tier.
 * - If `value` is anything else (raw slug like `'gpt-4o-2024-08-06'`), it passes through.
 * - If `value` is undefined, returns the default chat model (`'4o'`).
 */
export function resolveModel(value?: string | ModelTier | null): string {
  if (!value) return ENV_OVERRIDES['4o'] ?? TIER_DEFAULTS['4o'];
  if (isTier(value)) {
    return ENV_OVERRIDES[value] ?? TIER_DEFAULTS[value];
  }
  return value;
}

export function modelForPurpose(purpose: ModelPurpose): string {
  const tier = PURPOSE_TO_TIER[purpose];
  return ENV_OVERRIDES[tier] ?? TIER_DEFAULTS[tier];
}

export function isTier(value: string): value is ModelTier {
  return value === 'mini' || value === '4o' || value === 'realtime';
}
