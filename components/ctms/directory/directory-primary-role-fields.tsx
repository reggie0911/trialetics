'use client';

import { Label } from '@/components/ui/label';

/** Catalog shape used by directory home + contact detail (categories with nested roles). */
export type DirectoryPrimaryRoleCatalogCategory = {
  id: string;
  name: string;
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

interface DirectoryPrimaryRoleFieldsProps {
  catalog: DirectoryPrimaryRoleCatalogCategory[];
  categoryFilter: string;
  onCategoryFilterChange: (categoryId: string) => void;
  roleId: string;
  onRoleChange: (roleId: string) => void;
  disabled?: boolean;
  /** Label for empty role option (e.g. "None" vs "Optional"). */
  emptyRoleLabel?: string;
}

export function DirectoryPrimaryRoleFields({
  catalog,
  categoryFilter,
  onCategoryFilterChange,
  roleId,
  onRoleChange,
  disabled,
  emptyRoleLabel = 'None',
}: DirectoryPrimaryRoleFieldsProps) {
  const roleOptions = getRoleOptionsForCategoryFilter(catalog, categoryFilter);

  const selectClass =
    'flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs disabled:opacity-50';

  const handleCategoryChange = (nextCategory: string) => {
    onCategoryFilterChange(nextCategory);
    const nextRoles = getRoleOptionsForCategoryFilter(catalog, nextCategory);
    if (roleId && !nextRoles.some((r) => r.id === roleId)) {
      onRoleChange('');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div className="space-y-1">
        <Label className="text-xs">Role category</Label>
        <select
          className={selectClass}
          disabled={disabled}
          value={categoryFilter}
          onChange={(e) => handleCategoryChange(e.target.value)}
          aria-label="Role category"
        >
          <option value="">All categories</option>
          {sortedCategories(catalog).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Primary role</Label>
        <select
          className={selectClass}
          disabled={disabled}
          value={roleId}
          onChange={(e) => onRoleChange(e.target.value)}
          aria-label="Primary role"
        >
          <option value="">{emptyRoleLabel}</option>
          {roleOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
