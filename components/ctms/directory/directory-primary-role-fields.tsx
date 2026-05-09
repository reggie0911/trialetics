'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Label } from '@/components/ui/label';

/** Catalog shape used by directory home + contact detail (categories with nested roles). */
export type DirectoryPrimaryRoleCatalogCategory = {
  id: string;
  name: string;
  /** Stable category code from `directory_role_categories.code` (e.g. `governance`). */
  code?: string;
  sort_order?: number;
  roles: { id: string; name: string; sort_order?: number; category_id?: string }[];
};

function sortedCategories(catalog: DirectoryPrimaryRoleCatalogCategory[]) {
  return [...catalog].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function sortedRoles(roles: DirectoryPrimaryRoleCatalogCategory['roles']) {
  return [...roles].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

/** All roles in catalog order (categories by sort_order, roles within each by sort_order). */
export function getRoleOptionsForCategoryFilter(
  catalog: DirectoryPrimaryRoleCatalogCategory[],
  categoryFilter: string
): { id: string; name: string }[] {
  if (!categoryFilter) {
    return sortedCategories(catalog).flatMap((c) => sortedRoles(c.roles));
  }
  const cat = catalog.find((c) => c.id === categoryFilter);
  return cat ? sortedRoles(cat.roles) : [];
}

/** Category id containing this role, or "" if not found. */
export function getCategoryIdForRoleId(
  catalog: DirectoryPrimaryRoleCatalogCategory[],
  roleId: string | null | undefined
): string {
  if (!roleId) return '';
  for (const c of catalog) {
    if (c.roles.some((r) => r.id === roleId)) return c.id;
  }
  return '';
}

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs disabled:opacity-50';

function roleOptionLabels(roles: { id: string; name: string }[]): Map<string, string> {
  const byName = new Map<string, number>();
  for (const r of roles) {
    byName.set(r.name, (byName.get(r.name) ?? 0) + 1);
  }
  const m = new Map<string, string>();
  const seen = new Map<string, number>();
  for (const r of roles) {
    const dup = (byName.get(r.name) ?? 0) > 1;
    if (!dup) {
      m.set(r.id, r.name);
      continue;
    }
    const n = (seen.get(r.name) ?? 0) + 1;
    seen.set(r.name, n);
    m.set(r.id, `${r.name} — ${r.id.slice(0, 8)}`);
  }
  return m;
}

interface DirectoryPrimaryRoleFieldsProps {
  catalog: DirectoryPrimaryRoleCatalogCategory[];
  roleId: string;
  onRoleChange: (roleId: string) => void;
  disabled?: boolean;
  /** Label for empty role option (e.g. "None" vs "Optional"). */
  emptyRoleLabel?: string;
  /** When true, show a single Role list (all catalog roles) with no Category step. */
  hideCategory?: boolean;
}

export function DirectoryPrimaryRoleFields({
  catalog,
  roleId,
  onRoleChange,
  disabled,
  emptyRoleLabel = 'None',
  hideCategory = false,
}: DirectoryPrimaryRoleFieldsProps) {
  const [categoryId, setCategoryId] = useState(() => getCategoryIdForRoleId(catalog, roleId));
  const prevRoleIdRef = useRef<string | undefined>(undefined);

  /**
   * Keep category aligned with a selected role, and clear category only when `roleId`
   * transitions from a value to empty (form reset / clear), not while the user is
   * choosing category before role.
   */
  useEffect(() => {
    if (roleId) {
      setCategoryId(getCategoryIdForRoleId(catalog, roleId));
    } else if (prevRoleIdRef.current) {
      setCategoryId('');
    }
    prevRoleIdRef.current = roleId;
  }, [catalog, roleId]);

  const categoriesWithRoles = useMemo(() => {
    return sortedCategories(catalog).filter((c) => sortedRoles(c.roles).length > 0);
  }, [catalog]);

  const rolesInCategory = useMemo(() => {
    if (hideCategory) return getRoleOptionsForCategoryFilter(catalog, '');
    if (!categoryId) return [];
    return getRoleOptionsForCategoryFilter(catalog, categoryId);
  }, [hideCategory, catalog, categoryId]);

  const roleLabelById = useMemo(() => roleOptionLabels(rolesInCategory), [rolesInCategory]);

  const governanceHint =
    !hideCategory &&
    categoriesWithRoles.find((c) => c.id === categoryId)?.code === 'governance'
      ? 'Oversight committees and advisory roles.'
      : undefined;

  const roleDisabled = hideCategory ? !!disabled : disabled || !categoryId;

  if (hideCategory) {
    return (
      <div className="space-y-1">
        <Label className="text-xs">Role</Label>
        <select
          className={selectClassName}
          disabled={roleDisabled}
          value={roleId && rolesInCategory.some((r) => r.id === roleId) ? roleId : ''}
          aria-label="Primary role"
          onChange={(e) => onRoleChange(e.target.value)}
        >
          <option value="">{emptyRoleLabel}</option>
          {rolesInCategory.map((r) => (
            <option key={r.id} value={r.id}>
              {roleLabelById.get(r.id) ?? r.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label className="text-xs">Category</Label>
        <select
          className={selectClassName}
          disabled={disabled}
          value={categoryId}
          aria-label="Primary role category"
          onChange={(e) => {
            const next = e.target.value;
            setCategoryId(next);
            const nextRoles = next ? getRoleOptionsForCategoryFilter(catalog, next) : [];
            if (!nextRoles.some((r) => r.id === roleId)) {
              onRoleChange('');
            }
          }}
        >
          <option value="">Select category…</option>
          {categoriesWithRoles.map((c) => (
            <option key={c.id} value={c.id} title={c.code === 'governance' ? 'Oversight committees and advisory roles.' : undefined}>
              {c.name}
            </option>
          ))}
        </select>
        {governanceHint ? (
          <p className="text-[11px] text-muted-foreground leading-snug">{governanceHint}</p>
        ) : null}
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Role</Label>
        <select
          className={selectClassName}
          disabled={roleDisabled}
          value={roleId && rolesInCategory.some((r) => r.id === roleId) ? roleId : ''}
          aria-label="Primary role"
          onChange={(e) => onRoleChange(e.target.value)}
        >
          <option value="">{categoryId ? emptyRoleLabel : 'Select a category first'}</option>
          {rolesInCategory.map((r) => (
            <option key={r.id} value={r.id}>
              {roleLabelById.get(r.id) ?? r.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
