'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { CtmsRole, CtmsRoleCategory } from '@/lib/types/contacts-organizations';
import { CTMS_ROLE_CATEGORIES } from '@/lib/types/contacts-organizations';
import { cn } from '@/lib/utils';

const CATEGORY_ORDER: CtmsRoleCategory[] = [
  'sponsor',
  'cro',
  'site',
  'regulatory_ethics',
  'vendors',
  'financial',
  'governance',
  'technology',
  'platform',
];

interface RoleMultiSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  roles: CtmsRole[];
  placeholder?: string;
  className?: string;
}

export function RoleMultiSelect({
  value,
  onChange,
  roles,
  placeholder = 'Select roles',
  className,
}: RoleMultiSelectProps) {
  const [filteredCategory, setFilteredCategory] = useState<CtmsRoleCategory | 'all'>('all');

  const rolesByCategory = useMemo(() => {
    const map = new Map<CtmsRoleCategory, CtmsRole[]>();
    for (const role of roles) {
      if (!map.has(role.category)) {
        map.set(role.category, []);
      }
      map.get(role.category)!.push(role);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.sort_order - b.sort_order);
    }
    return map;
  }, [roles]);

  const selectedRoleNames = useMemo(() => {
    const ids = new Set(value);
    return roles.filter((r) => ids.has(r.id)).map((r) => r.name);
  }, [value, roles]);

  const selectedRoles = useMemo(() => {
    const ids = new Set(value);
    return CATEGORY_ORDER.flatMap((cat) => rolesByCategory.get(cat) ?? []).filter(
      (r) => ids.has(r.id)
    );
  }, [value, rolesByCategory]);

  const toggleRole = (roleId: string) => {
    if (value.includes(roleId)) {
      onChange(value.filter((id) => id !== roleId));
    } else {
      onChange([...value, roleId]);
    }
  };

  const displayText =
    selectedRoleNames.length === 0
      ? placeholder
      : selectedRoleNames.length <= 2
        ? selectedRoleNames.join(', ')
        : `${selectedRoleNames.length} roles selected`;

  return (
    <div className="flex flex-row flex-wrap gap-2 items-start">
      <div className="flex flex-col gap-2 shrink-0">
        <Select
          value={filteredCategory}
          onValueChange={(v) => setFilteredCategory(v as CtmsRoleCategory | 'all')}
        >
          <SelectTrigger className="h-8 text-xs w-full capitalize">
            <SelectValue
              placeholder="All Categories"
              getDisplayLabel={(v) =>
                v === 'all' ? 'All Categories' : (v && CTMS_ROLE_CATEGORIES[v as CtmsRoleCategory]) ?? null
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All Categories
            </SelectItem>
            {CATEGORY_ORDER.map((cat) => (
              <SelectItem key={cat} value={cat} className="text-xs">
                {CTMS_ROLE_CATEGORIES[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger
            type="button"
            role="combobox"
            className={cn(
              'border-input inline-flex h-8 w-full items-center justify-between gap-1.5 rounded-md border bg-transparent px-3 text-xs font-normal whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
              !value.length && 'text-muted-foreground',
              className
            )}
          >
        <span className="truncate capitalize">{displayText}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {value.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {value.length}
            </Badge>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <ScrollArea className="h-[280px]">
          <div className="p-2 space-y-3">
            {CATEGORY_ORDER.filter(
              (cat) => filteredCategory === 'all' || cat === filteredCategory
            ).map((category) => {
              const categoryRoles = rolesByCategory.get(category);
              if (!categoryRoles?.length) return null;

              const label = CTMS_ROLE_CATEGORIES[category];
              return (
                <div key={category} className="space-y-1.5">
                  <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {label}
                  </div>
                  <div className="space-y-0.5">
                    {categoryRoles.map((role) => (
                      <label
                        key={role.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-xs"
                      >
                        <Checkbox
                          checked={value.includes(role.id)}
                          onCheckedChange={() => toggleRole(role.id)}
                        />
                        <span className="capitalize">{role.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
      </div>
      {selectedRoles.length > 0 && (
        <div className="min-w-0 flex-1 rounded-md border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                  Role
                </th>
                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                  Category
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {selectedRoles.map((role) => (
                <tr
                  key={role.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-2 py-1.5 capitalize">{role.name}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {CTMS_ROLE_CATEGORIES[role.category]}
                  </td>
                  <td className="px-1 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => toggleRole(role.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
