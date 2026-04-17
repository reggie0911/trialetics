import { describe, expect, it } from 'vitest';

import { isTier, modelForPurpose, resolveModel } from './model-tier';

describe('isTier', () => {
  it('detects known tiers', () => {
    expect(isTier('mini')).toBe(true);
    expect(isTier('4o')).toBe(true);
    expect(isTier('realtime')).toBe(true);
    expect(isTier('chat')).toBe(false);
    expect(isTier('gpt-4o')).toBe(false);
  });
});

describe('resolveModel', () => {
  it('maps known tiers to default OpenAI slugs', () => {
    expect(resolveModel('mini')).toBe('gpt-4o-mini');
    expect(resolveModel('4o')).toBe('gpt-4o');
  });

  it('passes through raw OpenAI slugs untouched', () => {
    expect(resolveModel('gpt-4o-2024-08-06')).toBe('gpt-4o-2024-08-06');
    expect(resolveModel('o3-mini')).toBe('o3-mini');
  });

  it('falls back to the 4o default when value is missing', () => {
    expect(resolveModel(undefined)).toBe('gpt-4o');
    expect(resolveModel(null)).toBe('gpt-4o');
  });
});

describe('modelForPurpose', () => {
  it('uses mini for cheap purposes', () => {
    expect(modelForPurpose('list')).toBe('gpt-4o-mini');
    expect(modelForPurpose('score')).toBe('gpt-4o-mini');
    expect(modelForPurpose('classify')).toBe('gpt-4o-mini');
    expect(modelForPurpose('recommend_agent')).toBe('gpt-4o-mini');
    expect(modelForPurpose('extract')).toBe('gpt-4o-mini');
  });

  it('uses 4o for user-facing drafts, chat, and narrative', () => {
    expect(modelForPurpose('draft')).toBe('gpt-4o');
    expect(modelForPurpose('chat')).toBe('gpt-4o');
    expect(modelForPurpose('narrative')).toBe('gpt-4o');
    expect(modelForPurpose('scenario')).toBe('gpt-4o');
  });
});
