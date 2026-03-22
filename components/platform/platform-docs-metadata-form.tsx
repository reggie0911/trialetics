'use client';

import type { MutableRefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PLATFORM_DOC_CATEGORIES, PLATFORM_DOC_ICON_KEYS } from '@/lib/docs/platform-documentation-shared';
import { DOC_CATEGORY_LABELS, type DocCategory, type DocIconKey } from '@/lib/docs/registry';
import { ICON_LABELS, titleToDocSlug, syncSlugFromTitle } from '@/components/platform/platform-docs-editor-shared';

type Props = {
  mode: 'create' | 'edit';
  isRegistry: boolean;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  slugInput: string;
  setSlugInput: (v: string) => void;
  category: DocCategory;
  setCategory: (v: DocCategory) => void;
  iconKey: DocIconKey;
  setIconKey: (v: DocIconKey) => void;
  moduleRoute: string;
  setModuleRoute: (v: string) => void;
  sortOrder: string;
  setSortOrder: (v: string) => void;
  roleAdmin: boolean;
  setRoleAdmin: (v: boolean) => void;
  roleUser: boolean;
  setRoleUser: (v: boolean) => void;
  slugManuallyEditedRef: MutableRefObject<boolean>;
  descriptionManuallyEditedRef: MutableRefObject<boolean>;
  moduleRouteManuallyEditedRef: MutableRefObject<boolean>;
};

export function PlatformDocsMetadataForm({
  mode,
  isRegistry,
  title,
  setTitle,
  description,
  setDescription,
  slugInput,
  setSlugInput,
  category,
  setCategory,
  iconKey,
  setIconKey,
  moduleRoute,
  setModuleRoute,
  sortOrder,
  setSortOrder,
  roleAdmin,
  setRoleAdmin,
  roleUser,
  setRoleUser,
  slugManuallyEditedRef,
  descriptionManuallyEditedRef,
  moduleRouteManuallyEditedRef,
}: Props) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="doc-title">Title</Label>
          <Input
            id="doc-title"
            value={title}
            onChange={(e) => {
              const next = e.target.value;
              setTitle(next);
              if (mode === 'create') {
                syncSlugFromTitle(next, setSlugInput, slugManuallyEditedRef);
              }
            }}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="doc-description">Description</Label>
          <Input
            id="doc-description"
            value={description}
            onChange={(e) => {
              descriptionManuallyEditedRef.current = true;
              setDescription(e.target.value);
            }}
            placeholder="Shown on the docs index"
          />
        </div>
      </div>

      {mode === 'create' && (
        <div className="grid gap-2 max-w-md">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="doc-slug">Slug</Label>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs text-muted-foreground"
              onClick={() => {
                slugManuallyEditedRef.current = false;
                setSlugInput(titleToDocSlug(title));
              }}
            >
              Generate from title
            </Button>
          </div>
          <Input
            id="doc-slug"
            value={slugInput}
            onChange={(e) => {
              slugManuallyEditedRef.current = true;
              setSlugInput(e.target.value);
            }}
            placeholder="my-new-page"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Filled automatically from the title until you edit this field. Lowercase letters, numbers, and hyphens
            only.
          </p>
        </div>
      )}

      {!isRegistry && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as DocCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_DOC_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {DOC_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Icon</Label>
            <Select value={iconKey} onValueChange={(v) => setIconKey(v as DocIconKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_DOC_ICON_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {ICON_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="doc-module-route">Module route (optional)</Label>
          <Input
            id="doc-module-route"
            value={moduleRoute}
            onChange={(e) => {
              moduleRouteManuallyEditedRef.current = true;
              setModuleRoute(e.target.value);
            }}
            placeholder="/protected/..."
            className="font-mono text-sm"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="doc-sort">Sort order</Label>
          <Input
            id="doc-sort"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            placeholder="100"
          />
          <p className="text-xs text-muted-foreground">Lower numbers appear earlier within a category.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <Label className="text-sm font-medium">Visible to</Label>
        <div className="flex items-center gap-2">
          <Checkbox
            id="role-admin"
            checked={roleAdmin}
            onCheckedChange={(c) => setRoleAdmin(c === true)}
          />
          <Label htmlFor="role-admin" className="text-sm font-normal cursor-pointer">
            Company admins
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="role-user" checked={roleUser} onCheckedChange={(c) => setRoleUser(c === true)} />
          <Label htmlFor="role-user" className="text-sm font-normal cursor-pointer">
            Standard users
          </Label>
        </div>
      </div>
    </div>
  );
}
