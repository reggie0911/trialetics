'use client';

import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { DirectoryRole, DirectoryRoleCategory, InstitutionRow } from '@/lib/types/directory';
import { DirectoryPrimaryRoleFields } from '@/components/ctms/directory/directory-primary-role-fields';
import { DirectoryCountryRegionFields } from '@/components/ctms/directory/directory-country-region-fields';
import { DirectoryContactPhotoField } from '@/components/ctms/directory/directory-contact-photo-field';
import { formatPhoneNumber } from '@/lib/utils';

export type QuickContactCatalogCategory = DirectoryRoleCategory & {
  roles: DirectoryRole[];
};

interface QuickContactFormFieldsProps {
  catalog: QuickContactCatalogCategory[];
  institutions: InstitutionRow[];
  roleCategoryFilter: string;
  onRoleCategoryFilterChange: (v: string) => void;
  primaryRoleId: string;
  onPrimaryRoleChange: (v: string) => void;
  contactCountryCode: string;
  contactRegion: string;
  onContactCountryChange: (v: string) => void;
  onContactRegionChange: (v: string) => void;
  /** Controlled phone (submitted via hidden input as `name="phone"`) */
  phone: string;
  onPhoneChange: (value: string) => void;
  companyId: string;
  avatarUrl: string;
  onAvatarUrlChange: (url: string) => void;
  /** Rendered inside the form after Notes, before DialogFooter (e.g. site primary checkbox) */
  children?: ReactNode;
}

export function QuickContactFormFields({
  catalog,
  institutions,
  roleCategoryFilter,
  onRoleCategoryFilterChange,
  primaryRoleId,
  onPrimaryRoleChange,
  contactCountryCode,
  contactRegion,
  onContactCountryChange,
  onContactRegionChange,
  phone,
  onPhoneChange,
  companyId,
  avatarUrl,
  onAvatarUrlChange,
  children,
}: QuickContactFormFieldsProps) {
  return (
    <>
      <DirectoryContactPhotoField
        companyId={companyId}
        imageUrl={avatarUrl}
        onImageUrlChange={onAvatarUrlChange}
        compact
      />
      <input type="hidden" name="avatar_url" value={avatarUrl} />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">First name</Label>
          <Input name="first_name" className="text-xs h-9" required />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Last name</Label>
          <Input name="last_name" className="text-xs h-9" required />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Title</Label>
        <Input name="title" className="text-xs h-9" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Email</Label>
          <Input name="email" type="email" className="text-xs h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Phone</Label>
          <Input
            className="text-xs h-9"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChange={(e) => onPhoneChange(formatPhoneNumber(e.target.value))}
            aria-label="Phone"
          />
          <input type="hidden" name="phone" value={phone} />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground mb-1">Primary role (from library)</p>
        <DirectoryPrimaryRoleFields
          catalog={catalog}
          categoryFilter={roleCategoryFilter}
          onCategoryFilterChange={onRoleCategoryFilterChange}
          roleId={primaryRoleId}
          onRoleChange={onPrimaryRoleChange}
          emptyRoleLabel="Optional"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Primary organization</Label>
        <select
          name="primary_institution_id"
          className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
          defaultValue=""
        >
          <option value="">Optional — main affiliation</option>
          {institutions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Additional organization links can be added on the contact profile. Profile-linked app users: set on the
        detail page if needed.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Department</Label>
          <Input name="department" className="text-xs h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <select
            name="status"
            className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
            defaultValue="active"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <DirectoryCountryRegionFields
        variant="contactRow"
        countryCode={contactCountryCode}
        region={contactRegion}
        onCountryChange={onContactCountryChange}
        onRegionChange={onContactRegionChange}
      />
      <div className="space-y-1">
        <Label className="text-xs">Notes</Label>
        <Textarea name="notes" className="text-xs min-h-[60px]" />
      </div>
      {children}
    </>
  );
}

export function siteRoleLabelFromQuickContact(
  catalog: QuickContactCatalogCategory[],
  primaryRoleId: string,
  title: string
): string {
  if (primaryRoleId) {
    for (const c of catalog) {
      const r = c.roles.find((x) => x.id === primaryRoleId);
      if (r) return r.name;
    }
  }
  const t = title.trim();
  if (t) return t;
  return 'Contact';
}
