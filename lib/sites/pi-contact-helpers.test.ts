import { describe, expect, it } from 'vitest';

import {
  findPrincipalInvestigatorRoleId,
  pickPrincipalInvestigatorContact,
  shouldWarnOnPrincipalInvestigatorRoleChange,
} from '@/lib/sites/pi-contact-helpers';

describe('findPrincipalInvestigatorRoleId', () => {
  it('returns first PI-like role id from catalog', () => {
    const roleId = findPrincipalInvestigatorRoleId([
      {
        roles: [
          { id: 'r1', name: 'Study Coordinator' },
          { id: 'r2', name: 'Principal Investigator (PI)' },
        ],
      },
    ]);
    expect(roleId).toBe('r2');
  });

  it('returns null when catalog has no PI role', () => {
    expect(findPrincipalInvestigatorRoleId([{ roles: [{ id: 'r1', name: 'Monitor' }] }])).toBeNull();
  });
});

describe('shouldWarnOnPrincipalInvestigatorRoleChange', () => {
  it('warns when changing from PI role to non-PI role', () => {
    expect(
      shouldWarnOnPrincipalInvestigatorRoleChange('Principal Investigator', 'Study Coordinator')
    ).toBe(true);
  });

  it('does not warn when role remains PI-like', () => {
    expect(
      shouldWarnOnPrincipalInvestigatorRoleChange(
        'Principal Investigator (PI)',
        'Principal Investigator'
      )
    ).toBe(false);
  });
});

describe('pickPrincipalInvestigatorContact', () => {
  it('prefers is_primary rows', () => {
    const selected = pickPrincipalInvestigatorContact([
      {
        id: 'b',
        name: 'Non Primary',
        email: null,
        directory_contact_id: null,
        is_primary: false,
      },
      {
        id: 'c',
        name: 'Primary',
        email: null,
        directory_contact_id: null,
        is_primary: true,
      },
    ]);
    expect(selected?.id).toBe('c');
  });

  it('falls back deterministically by id when no primary exists', () => {
    const selected = pickPrincipalInvestigatorContact([
      {
        id: 'z',
        name: 'Z',
        email: null,
        directory_contact_id: null,
        is_primary: false,
      },
      {
        id: 'a',
        name: 'A',
        email: null,
        directory_contact_id: null,
        is_primary: false,
      },
    ]);
    expect(selected?.id).toBe('a');
  });
});
