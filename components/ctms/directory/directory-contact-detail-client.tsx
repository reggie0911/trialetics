'use client';

import { useEffect, useState, useTransition } from 'react';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Trash2, Plus, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  updateDirectoryContact,
  removeContactStudyLink,
  upsertContactStudyLink,
  removeContactSiteLink,
  upsertContactSiteLink,
  removeContactInstitutionLink,
  upsertContactInstitutionLink,
  setDirectoryContactStatus,
} from '@/lib/actions/directory-contacts';
import { directoryContactFormSchema } from '@/lib/validation/directory';

const contactDetailFormSchema = directoryContactFormSchema.omit({ profile_id: true });
type ContactDetailFormInput = z.input<typeof contactDetailFormSchema>;
type ContactDetailFormOutput = z.infer<typeof contactDetailFormSchema>;
import type { DirectoryContactWithRelations } from '@/lib/types/directory';
import type { Study } from '@/lib/types/ctms';
import type { StudySiteWithStudy } from '@/lib/types/ctms';
import type { InstitutionRow } from '@/lib/types/directory';
import {
  DirectoryPrimaryRoleFields,
  getCategoryIdForRoleId,
  getRoleOptionsForCategoryFilter,
} from '@/components/ctms/directory/directory-primary-role-fields';
import { DirectoryCountryRegionFields } from '@/components/ctms/directory/directory-country-region-fields';
import { DirectoryContactPhotoField } from '@/components/ctms/directory/directory-contact-photo-field';
import { formatPhoneNumber } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type CatalogCat = {
  id: string;
  code: string;
  name: string;
  roles: { id: string; name: string }[];
};

interface Props {
  companyId: string;
  contact: DirectoryContactWithRelations;
  canEdit: boolean;
  catalog: CatalogCat[];
  studies: Study[];
  sites: StudySiteWithStudy[];
  institutions: InstitutionRow[];
}

export function DirectoryContactDetailClient({
  companyId,
  contact: initial,
  canEdit,
  catalog,
  studies,
  sites,
  institutions,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [contact, setContact] = useState(initial);

  /** Full catalog list (study/site link dialogs). */
  const flatRoles = catalog.flatMap((c) => c.roles);

  const form = useForm<ContactDetailFormInput, unknown, ContactDetailFormOutput>({
    resolver: zodResolver(contactDetailFormSchema),
    defaultValues: {
      first_name: initial.first_name,
      last_name: initial.last_name,
      title: initial.title ?? '',
      email: initial.email ?? '',
      avatar_url: initial.avatar_url ?? '',
      phone: formatPhoneNumber(initial.phone ?? ''),
      department: initial.department ?? '',
      country_code: initial.country_code ?? '',
      region: initial.region ?? '',
      status: initial.status,
      notes: initial.notes ?? '',
      primary_directory_role_id: initial.primary_directory_role_id ?? '',
      primary_institution_id: initial.primary_institution_id ?? '',
      secondary_role_ids: initial.secondary_roles.map((r) => r.id),
    },
  });

  const [studyOpen, setStudyOpen] = useState(false);
  const [siteOpen, setSiteOpen] = useState(false);
  const [instOpen, setInstOpen] = useState(false);
  const [roleCategoryFilter, setRoleCategoryFilter] = useState(() =>
    getCategoryIdForRoleId(catalog, initial.primary_directory_role_id)
  );

  useEffect(() => {
    setRoleCategoryFilter(getCategoryIdForRoleId(catalog, initial.primary_directory_role_id));
  }, [initial.primary_directory_role_id, catalog]);

  useEffect(() => {
    setContact(initial);
  }, [initial.id, initial.updated_at]);

  const secondaryRoleOptions = getRoleOptionsForCategoryFilter(catalog, roleCategoryFilter);
  const visibleSecondaryIds = new Set(secondaryRoleOptions.map((r) => r.id));
  const secondaryHiddenCount = (form.watch('secondary_role_ids') ?? []).filter(
    (id) => !visibleSecondaryIds.has(id)
  ).length;

  const onSave = form.handleSubmit(async (values) => {
    startTransition(async () => {
      const res = await updateDirectoryContact(contact.id, {
        ...values,
        profile_id: contact.profile_id,
        title: values.title || undefined,
        email: values.email || undefined,
        avatar_url: values.avatar_url?.trim() || null,
        phone: values.phone || undefined,
        department: values.department || undefined,
        country_code: values.country_code || undefined,
        region: values.region || undefined,
        notes: values.notes || undefined,
      });
      if (res.error) toast.error(res.error);
      else {
        toast.success('Contact updated');
        if (res.duplicateEmailWarning) toast.message('Another contact shares this email.');
        setContact((c) => ({
          ...c,
          first_name: values.first_name,
          last_name: values.last_name,
          title: values.title || null,
          email: values.email || null,
          avatar_url: values.avatar_url?.trim() || null,
          phone: values.phone || null,
          department: values.department || null,
          country_code: values.country_code || null,
          region: values.region || null,
          status: values.status,
          notes: values.notes || null,
          primary_directory_role_id: values.primary_directory_role_id || null,
          primary_institution_id: values.primary_institution_id || null,
        }));
        router.refresh();
      }
    });
  });

  const normStudy = (s: unknown) => (Array.isArray(s) ? s[0] : s) as { title?: string; protocol_number?: string } | null;
  const normSite = (s: unknown) =>
    (Array.isArray(s) ? s[0] : s) as {
      site_number?: string;
      name?: string;
      studies?: unknown;
    } | null;
  const normInst = (i: unknown) => (Array.isArray(i) ? i[0] : i) as { name?: string } | null;
  const normComm = (c: unknown) => (Array.isArray(c) ? c[0] : c) as { name?: string } | null;
  const normRole = (r: unknown) => (Array.isArray(r) ? r[0] : r) as { name?: string } | null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <Avatar className="h-14 w-14 shrink-0 rounded-lg after:rounded-lg border border-border">
            <AvatarImage src={contact.avatar_url ?? undefined} alt="" className="rounded-lg" />
            <AvatarFallback className="rounded-lg">
              <User className="h-6 w-6 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              {contact.first_name} {contact.last_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Linked app login (profile) is not auto-updated when the user changes their account — keep directory fields
              accurate manually.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                startTransition(async () => {
                  const next = contact.status === 'active' ? 'inactive' : 'active';
                  const { error } = await setDirectoryContactStatus(contact.id, next);
                  if (error) toast.error(error);
                  else {
                    toast.success(next === 'active' ? 'Activated' : 'Deactivated');
                    setContact((c) => ({ ...c, status: next }));
                    router.refresh();
                  }
                });
              }}
            >
              {contact.status === 'active' ? 'Deactivate' : 'Activate'}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={onSave} className="space-y-3">
            {canEdit ? (
              <DirectoryContactPhotoField
                companyId={companyId}
                imageUrl={form.watch('avatar_url') ?? ''}
                onImageUrlChange={(url) =>
                  form.setValue('avatar_url', url, { shouldDirty: true })
                }
              />
            ) : (
              contact.avatar_url && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-16 w-16 rounded-lg after:rounded-lg border border-border">
                    <AvatarImage src={contact.avatar_url} alt="" className="rounded-lg" />
                    <AvatarFallback className="rounded-lg">
                      <User className="h-7 w-7 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-xs text-muted-foreground">Profile photo</p>
                </div>
              )
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">First name</Label>
                <Input className="text-xs h-9" {...form.register('first_name')} disabled={!canEdit} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Last name</Label>
                <Input className="text-xs h-9" {...form.register('last_name')} disabled={!canEdit} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title</Label>
              <Input className="text-xs h-9" {...form.register('title')} disabled={!canEdit} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input className="text-xs h-9" type="email" {...form.register('email')} disabled={!canEdit} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input
                  className="text-xs h-9"
                  disabled={!canEdit}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+1 (555) 000-0000"
                  value={form.watch('phone') ?? ''}
                  onChange={(e) =>
                    form.setValue('phone', formatPhoneNumber(e.target.value), { shouldDirty: true })
                  }
                />
              </div>
            </div>
            <DirectoryPrimaryRoleFields
              catalog={catalog}
              categoryFilter={roleCategoryFilter}
              onCategoryFilterChange={setRoleCategoryFilter}
              roleId={form.watch('primary_directory_role_id') ?? ''}
              onRoleChange={(id) =>
                form.setValue('primary_directory_role_id', id, { shouldDirty: true })
              }
              disabled={!canEdit}
            />
            <div className="space-y-1">
              <Label className="text-xs">Primary organization</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs disabled:opacity-50 max-w-full sm:max-w-md"
                disabled={!canEdit}
                {...form.register('primary_institution_id')}
              >
                <option value="">None</option>
                {institutions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Additional organizations (matrix affiliations) appear in the Organizations section below.
            </p>
            <div className="space-y-2">
              <Label className="text-xs">Secondary roles</Label>
              <p className="text-[11px] text-muted-foreground">
                Options match the role category above. Choose &quot;All categories&quot; to show every role in
                the library.
              </p>
              {secondaryHiddenCount > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {secondaryHiddenCount} additional secondary role
                  {secondaryHiddenCount === 1 ? '' : 's'} selected in other categories (still saved).
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {secondaryRoleOptions.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      value={r.id}
                      disabled={!canEdit}
                      checked={form.watch('secondary_role_ids')?.includes(r.id) ?? false}
                      onChange={(e) => {
                        const cur = new Set(form.getValues('secondary_role_ids') ?? []);
                        if (e.target.checked) cur.add(r.id);
                        else cur.delete(r.id);
                        form.setValue('secondary_role_ids', [...cur]);
                      }}
                    />
                    {r.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Department</Label>
                <Input className="text-xs h-9" {...form.register('department')} disabled={!canEdit} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs disabled:opacity-50"
                  disabled={!canEdit}
                  {...form.register('status')}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <DirectoryCountryRegionFields
              variant="contactRow"
              countryCode={form.watch('country_code') ?? ''}
              region={form.watch('region') ?? ''}
              onCountryChange={(c) => {
                form.setValue('country_code', c, { shouldDirty: true });
              }}
              onRegionChange={(r) => form.setValue('region', r, { shouldDirty: true })}
              disabled={!canEdit}
            />
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea className="text-xs min-h-[72px]" {...form.register('notes')} disabled={!canEdit} />
            </div>
            {canEdit && (
              <Button type="submit" size="sm" className="text-xs" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : 'Save changes'}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Study assignments</CardTitle>
          {canEdit && (
            <Button type="button" size="sm" variant="outline" className="text-xs h-8" onClick={() => setStudyOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Study</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs">Active</TableHead>
                <TableHead className="text-xs w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contact.studies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-xs text-muted-foreground">
                    No study links.
                  </TableCell>
                </TableRow>
              ) : (
                contact.studies.map((row) => {
                  const st = normStudy(row.studies);
                  const dr = normRole(row.directory_roles);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs">
                        {st ? `${st.protocol_number} — ${st.title}` : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{dr?.name ?? '—'}</TableCell>
                      <TableCell className="text-xs">{row.is_active ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="text-xs">
                        {canEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              startTransition(async () => {
                                await removeContactStudyLink(row.id);
                                toast.success('Removed');
                                router.refresh();
                              });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Site assignments</CardTitle>
          {canEdit && (
            <Button type="button" size="sm" variant="outline" className="text-xs h-8" onClick={() => setSiteOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Site</TableHead>
                <TableHead className="text-xs">Study</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contact.sites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-xs text-muted-foreground">
                    No site links.
                  </TableCell>
                </TableRow>
              ) : (
                contact.sites.map((row) => {
                  const ss = normSite(row.study_sites);
                  const st = normStudy(ss?.studies);
                  const dr = normRole(row.directory_roles);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs">
                        {ss ? `${ss.site_number} — ${ss.name}` : '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {st ? `${st.protocol_number}` : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{dr?.name ?? '—'}</TableCell>
                      <TableCell className="text-xs">
                        {canEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              startTransition(async () => {
                                await removeContactSiteLink(row.id);
                                toast.success('Removed');
                                router.refresh();
                              });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Organizations</CardTitle>
          {canEdit && (
            <Button type="button" size="sm" variant="outline" className="text-xs h-8" onClick={() => setInstOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />
              Add link
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Organization</TableHead>
                <TableHead className="text-xs">Primary</TableHead>
                <TableHead className="text-xs w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contact.institutions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-xs text-muted-foreground">
                    No additional organization links (primary is on the profile form).
                  </TableCell>
                </TableRow>
              ) : (
                contact.institutions.map((row) => {
                  const ins = normInst(row.institutions);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs">{ins?.name ?? '—'}</TableCell>
                      <TableCell className="text-xs">{row.is_primary ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="text-xs">
                        {canEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              startTransition(async () => {
                                await removeContactInstitutionLink(row.id);
                                toast.success('Removed');
                                router.refresh();
                              });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Committee memberships</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Committee</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contact.committees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-xs text-muted-foreground">
                    No committees — add members from each committee’s page.
                  </TableCell>
                </TableRow>
              ) : (
                contact.committees.map((row) => {
                  const co = normComm(row.committees);
                  const dr = normRole(row.directory_roles);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs">{co?.name ?? '—'}</TableCell>
                      <TableCell className="text-xs">{dr?.name ?? '—'}</TableCell>
                      <TableCell className="text-xs">{row.is_active ? 'Yes' : 'No'}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <StudyLinkDialog
        open={studyOpen}
        onOpenChange={setStudyOpen}
        contactId={contact.id}
        studies={studies}
        roles={flatRoles}
        existingStudyIds={new Set(contact.studies.map((s) => s.study_id))}
        onDone={() => {
          setStudyOpen(false);
          router.refresh();
        }}
      />
      <SiteLinkDialog
        open={siteOpen}
        onOpenChange={setSiteOpen}
        contactId={contact.id}
        sites={sites}
        roles={flatRoles}
        existingSiteIds={new Set(contact.sites.map((s) => s.study_site_id))}
        onDone={() => {
          setSiteOpen(false);
          router.refresh();
        }}
      />
      <InstLinkDialog
        open={instOpen}
        onOpenChange={setInstOpen}
        contactId={contact.id}
        institutions={institutions}
        existingInstIds={new Set(contact.institutions.map((i) => i.institution_id))}
        onDone={() => {
          setInstOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function StudyLinkDialog({
  open,
  onOpenChange,
  contactId,
  studies,
  roles,
  existingStudyIds,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contactId: string;
  studies: Study[];
  roles: { id: string; name: string }[];
  existingStudyIds: Set<string>;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);

  const submit = async (fd: FormData) => {
    const study_id = String(fd.get('study_id'));
    if (existingStudyIds.has(study_id)) {
      toast.error('Already linked to this study');
      return;
    }
    setPending(true);
    const { error } = await upsertContactStudyLink({
      directory_contact_id: contactId,
      study_id,
      directory_role_id: String(fd.get('directory_role_id')) || null,
      is_active: true,
    });
    setPending(false);
    if (error) toast.error(error);
    else {
      toast.success('Linked');
      onDone();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base">Link study</DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Study</Label>
            <select name="study_id" required className="flex h-9 w-full rounded-md border border-input px-2 text-xs">
              {studies.map((s) => (
                <option key={s.id} value={s.id} disabled={existingStudyIds.has(s.id)}>
                  {s.protocol_number} — {s.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Role</Label>
            <select name="directory_role_id" className="flex h-9 w-full rounded-md border border-input px-2 text-xs">
              <option value="">None</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" className="text-xs" disabled={pending}>
              {pending ? 'Saving…' : 'Link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SiteLinkDialog({
  open,
  onOpenChange,
  contactId,
  sites,
  roles,
  existingSiteIds,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contactId: string;
  sites: StudySiteWithStudy[];
  roles: { id: string; name: string }[];
  existingSiteIds: Set<string>;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);

  const submit = async (fd: FormData) => {
    const study_site_id = String(fd.get('study_site_id'));
    if (existingSiteIds.has(study_site_id)) {
      toast.error('Already linked to this site');
      return;
    }
    setPending(true);
    const { error } = await upsertContactSiteLink({
      directory_contact_id: contactId,
      study_site_id,
      directory_role_id: String(fd.get('directory_role_id')) || null,
      is_active: true,
    });
    setPending(false);
    if (error) toast.error(error);
    else {
      toast.success('Linked');
      onDone();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base">Link site</DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Site</Label>
            <select
              name="study_site_id"
              required
              className="flex h-9 w-full rounded-md border border-input px-2 text-xs"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id} disabled={existingSiteIds.has(s.id)}>
                  {s.studies?.protocol_number} / {s.site_number} — {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Role</Label>
            <select name="directory_role_id" className="flex h-9 w-full rounded-md border border-input px-2 text-xs">
              <option value="">None</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" className="text-xs" disabled={pending}>
              {pending ? 'Saving…' : 'Link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InstLinkDialog({
  open,
  onOpenChange,
  contactId,
  institutions,
  existingInstIds,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contactId: string;
  institutions: InstitutionRow[];
  existingInstIds: Set<string>;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);

  const submit = async (fd: FormData) => {
    const institution_id = String(fd.get('institution_id'));
    if (existingInstIds.has(institution_id)) {
      toast.error('Already linked');
      return;
    }
    setPending(true);
    const { error } = await upsertContactInstitutionLink({
      directory_contact_id: contactId,
      institution_id,
      is_primary: fd.get('is_primary') === 'on',
    });
    setPending(false);
    if (error) toast.error(error);
    else {
      toast.success('Linked');
      onDone();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base">Link organization</DialogTitle>
        </DialogHeader>
        <form action={submit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Organization</Label>
            <select
              name="institution_id"
              required
              className="flex h-9 w-full rounded-md border border-input px-2 text-xs"
            >
              {institutions.map((i) => (
                <option key={i.id} value={i.id} disabled={existingInstIds.has(i.id)}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" name="is_primary" />
            Set as primary affiliation
          </label>
          <DialogFooter>
            <Button type="submit" className="text-xs" disabled={pending}>
              {pending ? 'Saving…' : 'Link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
