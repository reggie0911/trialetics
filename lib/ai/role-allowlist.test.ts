import { describe, expect, it } from 'vitest';

import { WRITE_TOOLS, assertToolAllowedForRole, isToolAllowedForRole } from './role-allowlist';

describe('isToolAllowedForRole', () => {
  it('allows read tools for every role', () => {
    expect(isToolAllowedForRole('viewer', 'listStudies')).toBe(true);
    expect(isToolAllowedForRole('user', 'listStudies')).toBe(true);
    expect(isToolAllowedForRole('manager', 'listStudies')).toBe(true);
  });

  it('denies every write tool to viewers', () => {
    for (const tool of WRITE_TOOLS) {
      expect(isToolAllowedForRole('viewer', tool)).toBe(false);
    }
  });

  it('lets platform_admin run anything', () => {
    expect(isToolAllowedForRole('platform_admin', 'recordKriValue')).toBe(true);
    expect(isToolAllowedForRole('platform_admin', 'createTask')).toBe(true);
  });

  it('respects per-tool allowlists for non-admin roles', () => {
    expect(isToolAllowedForRole('user', 'recordKriValue')).toBe(false);
    expect(isToolAllowedForRole('manager', 'recordKriValue')).toBe(true);
    expect(isToolAllowedForRole('user', 'createTask')).toBe(true);
    expect(isToolAllowedForRole('user', 'createMilestone')).toBe(false);
  });
});

describe('assertToolAllowedForRole', () => {
  it('throws a descriptive error when denied', () => {
    expect(() => assertToolAllowedForRole('viewer', 'recordKriValue')).toThrow(/Permission denied/);
  });

  it('does not throw when allowed', () => {
    expect(() => assertToolAllowedForRole('manager', 'recordKriValue')).not.toThrow();
  });
});
