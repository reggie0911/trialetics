'use client';

import { useState, useCallback, useMemo, useTransition, useEffect, useRef, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Star, ChevronRight, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { SiteContact } from '@/lib/types/ctms';
import type { InstitutionRow } from '@/lib/types/directory';
import { directoryContactFormSchema } from '@/lib/validation/directory';
import { createDirectoryContact } from '@/lib/actions/directory-contacts';
import {
  addSiteContact,
  updateSiteContact,
  deleteSiteContact,
  getSiteById,
} from '@/lib/actions/sites';
import {
  QuickContactFormFields,
  siteRoleLabelFromQuickContact,
  directoryCatalogHasRoles,
  type QuickContactCatalogCategory,
} from '@/components/ctms/directory/quick-contact-form-fields';
import { getCategoryIdForRoleId } from '@/components/ctms/directory/directory-primary-role-fields';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatPhoneNumber } from '@/lib/utils';
import { useClientPagination } from '@/lib/hooks/use-client-pagination';
import { TablePaginationFooter } from '@/components/ui/table-pagination-footer';
import {
  findPrincipalInvestigatorRoleId,
  shouldWarnOnPrincipalInvestigatorRoleChange,
} from '@/lib/sites/pi-contact-helpers';

const CONTACTS_TABLE_COL_COUNT = 6;

const DIRECTORY_LINK_NONE = '__none__';

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
  email: z.string().optional(),
  phone: z.string().optional(),
  is_primary: z.boolean().optional(),
  directory_contact_id: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface SiteContactsPanelProps {
  companyId: string;
  siteId: string;
  studyId: string;
  initialContacts: SiteContact[];
  directoryContactOptions?: { id: string; label: string }[];
  directoryCatalog: QuickContactCatalogCategory[];
  /** Error message from `getDirectoryRoleCatalog` when the catalog could not be loaded. */
  directoryCatalogError?: string | null;
  institutions: InstitutionRow[];
  /** Institution row linked to this site; used to prefill `primary_institution_id` in new-contact dialog. */
  siteInstitutionId?: string | null;
  /** When set, opening the add-contact dialog should prefill PI directory role (overview CTA). */
  openAddContactIntent?: 'pi' | null;
  onAddContactIntentConsumed?: () => void;
}

export function SiteContactsPanel({
  companyId,
  siteId,
  studyId,
  initialContacts,
  directoryContactOptions = [],
  directoryCatalog,
  directoryCatalogError = null,
  institutions,
  siteInstitutionId = null,
  openAddContactIntent = null,
  onAddContactIntentConsumed,
}: SiteContactsPanelProps) {
  const router = useRouter();
  const [contacts, setContacts] = useState(initialContacts);
  const [addOpen, setAddOpen] = useState(false);
  const [localAddIntent, setLocalAddIntent] = useState<'pi' | null>(null);
  const [editingContact, setEditingContact] = useState<SiteContact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [, startTransition] = useTransition();

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.role?.toLowerCase().includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.phone?.toLowerCase().includes(q) ?? false),
    );
  }, [contacts, searchQuery]);

  const pagination = useClientPagination({
    totalItems: filteredContacts.length,
    resetKey: [searchQuery],
  });
  const paginatedContacts = pagination.paginate(filteredContacts);

  const refreshContacts = useCallback(() => {
    startTransition(async () => {
      try {
        const site = await getSiteById(siteId);
        if (site) setContacts(site.site_contacts);
        router.refresh();
      } catch {
        toast.error('Failed to refresh contacts');
      }
    });
  }, [siteId, router]);

  useEffect(() => {
    if (openAddContactIntent !== 'pi') return;
    setAddOpen(true);
  }, [openAddContactIntent]);

  const catalogRolesOk = directoryCatalogHasRoles(directoryCatalog);

  const handleDelete = async (id: string) => {
    const { error } = await deleteSiteContact(id, siteId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Contact deleted');
    refreshContacts();
  };

  return (
    <div className="space-y-4">
      {directoryCatalogError && (
        <Alert variant="destructive" className="text-sm">
          <AlertTitle>Role catalog failed to load</AlertTitle>
          <AlertDescription className="text-xs">
            {directoryCatalogError}. Refresh, or open{' '}
            <Link href="/protected/directory" className="underline underline-offset-2 font-medium">
              Directory
            </Link>{' '}
            after signing in.
          </AlertDescription>
        </Alert>
      )}
      {!directoryCatalogError && !catalogRolesOk && (
        <Alert className="text-sm border-amber-500/40 bg-amber-500/5">
          <AlertTitle>Role catalog is empty</AlertTitle>
          <AlertDescription className="text-xs">
            Apply directory migrations and role seeds, then refresh. Confirm on the{' '}
            <Link href="/protected/directory" className="underline underline-offset-2 font-medium">
              Directory
            </Link>{' '}
            page.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="ml-auto text-xs h-9"
          onClick={() => {
            setLocalAddIntent(null);
            setAddOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add contact
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        PI details shown in site forms and overview cards are synced from site contacts.
      </p>

      <ContactFormDialog
        companyId={companyId}
        open={addOpen}
        onOpenChange={(next) => {
          setAddOpen(next);
          if (!next) setLocalAddIntent(null);
        }}
        siteId={siteId}
        studyId={studyId}
        onSuccess={refreshContacts}
        directoryContactOptions={directoryContactOptions}
        directoryCatalog={directoryCatalog}
        institutions={institutions}
        siteInstitutionId={siteInstitutionId}
        openAddContactIntent={openAddContactIntent ?? localAddIntent}
        onAddContactIntentConsumed={() => {
          setLocalAddIntent(null);
          onAddContactIntentConsumed?.();
        }}
      />
      <ContactFormDialog
        companyId={companyId}
        open={!!editingContact}
        onOpenChange={(next) => {
          if (!next) setEditingContact(null);
        }}
        siteId={siteId}
        studyId={studyId}
        contact={editingContact ?? undefined}
        onSuccess={refreshContacts}
        directoryContactOptions={directoryContactOptions}
        directoryCatalog={directoryCatalog}
        institutions={institutions}
        siteInstitutionId={siteInstitutionId}
      />

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm font-medium text-muted-foreground">No contacts added</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add site contacts to track key personnel.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Phone</TableHead>
                <TableHead className="text-xs">Primary</TableHead>
                <TableHead className="text-xs w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={CONTACTS_TABLE_COL_COUNT}
                    className="text-xs text-muted-foreground text-center py-6"
                  >
                    No contacts match your search.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="text-xs font-medium">{contact.name}</TableCell>
                    <TableCell className="text-xs">{contact.role}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {contact.email || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {contact.phone || '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {contact.is_primary && (
                        <Badge variant="default" className="text-xs">
                          <Star className="mr-1 h-3 w-3" />
                          Primary
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1">
                        {contact.directory_contact_id ? (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                            <Link href={`/protected/directory/contacts/${contact.directory_contact_id}`}>
                              Open <ChevronRight className="h-3 w-3 ml-0.5" />
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setEditingContact(contact)}
                            aria-label="Edit contact"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" />
                            }
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove {contact.name} from this site&apos;s
                                contact list.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(contact.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {contacts.length > 0 && (
        <TablePaginationFooter
          pagination={pagination}
          totalItems={filteredContacts.length}
          itemNoun="contact"
        />
      )}
    </div>
  );
}

function getDefaultValues(contact?: SiteContact): ContactFormValues {
  if (contact) {
    return {
      name: contact.name,
      role: contact.role,
      email: contact.email ?? '',
      phone: formatPhoneNumber(contact.phone ?? ''),
      is_primary: contact.is_primary,
      directory_contact_id:
        contact.directory_contact_id && contact.directory_contact_id.length > 0
          ? contact.directory_contact_id
          : DIRECTORY_LINK_NONE,
    };
  }
  return {
    name: '',
    role: '',
    email: '',
    phone: '',
    is_primary: false,
    directory_contact_id: DIRECTORY_LINK_NONE,
  };
}

export function ContactFormDialog({
  companyId,
  open,
  onOpenChange,
  siteId,
  studyId,
  contact,
  onSuccess,
  directoryContactOptions,
  directoryCatalog,
  institutions,
  siteInstitutionId = null,
  openAddContactIntent = null,
  onAddContactIntentConsumed,
}: {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  studyId: string;
  contact?: SiteContact;
  onSuccess: () => void;
  directoryContactOptions: { id: string; label: string }[];
  directoryCatalog: QuickContactCatalogCategory[];
  institutions: InstitutionRow[];
  siteInstitutionId?: string | null;
  openAddContactIntent?: 'pi' | null;
  onAddContactIntentConsumed?: () => void;
}) {
  const isEdit = !!contact;
  const addOpenedWithPiIntentRef = useRef(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: getDefaultValues(contact),
  });

  const [addRoleCategoryFilter, setAddRoleCategoryFilter] = useState('');
  const [addPrimaryRoleId, setAddPrimaryRoleId] = useState('');
  const [addPrimaryInstitutionId, setAddPrimaryInstitutionId] = useState('');
  const [addContactCountryCode, setAddContactCountryCode] = useState('');
  const [addContactRegion, setAddContactRegion] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addAvatarUrl, setAddAvatarUrl] = useState('');
  const [addIsPrimary, setAddIsPrimary] = useState(false);
  const [addPrimaryFieldsLocked, setAddPrimaryFieldsLocked] = useState(false);
  const [addPending, setAddPending] = useState(false);

  useEffect(() => {
    if (!open) {
      addOpenedWithPiIntentRef.current = false;
      return;
    }
    if (isEdit) {
      form.reset(getDefaultValues(contact));
      return;
    }

    if (openAddContactIntent === 'pi' && !addOpenedWithPiIntentRef.current) {
      const rid = findPrincipalInvestigatorRoleId(directoryCatalog);
      setAddContactCountryCode('');
      setAddContactRegion('');
      setAddPhone('');
      setAddAvatarUrl('');
      setAddPrimaryInstitutionId(siteInstitutionId ?? '');
      setAddPrimaryRoleId(rid ?? '');
      setAddRoleCategoryFilter(rid ? getCategoryIdForRoleId(directoryCatalog, rid) : '');
      setAddIsPrimary(true);
      setAddPrimaryFieldsLocked(true);
      addOpenedWithPiIntentRef.current = true;
      onAddContactIntentConsumed?.();
      return;
    }

    if (!addOpenedWithPiIntentRef.current) {
      setAddRoleCategoryFilter('');
      setAddContactCountryCode('');
      setAddContactRegion('');
      setAddPhone('');
      setAddAvatarUrl('');
      setAddPrimaryInstitutionId(siteInstitutionId ?? '');
      setAddPrimaryRoleId('');
      setAddIsPrimary(false);
      setAddPrimaryFieldsLocked(false);
    }
  }, [
    open,
    contact?.id,
    form,
    isEdit,
    contact,
    openAddContactIntent,
    directoryCatalog,
    onAddContactIntentConsumed,
    siteInstitutionId,
  ]);

  const onSubmitEdit = async (values: ContactFormValues) => {
    if (!contact) return;
    if (shouldWarnOnPrincipalInvestigatorRoleChange(contact.role, values.role)) {
      const ok = window.confirm(
        'This contact is currently the Principal Investigator. Changing the role may clear PI fields on the site if no other PI contact remains. Continue?'
      );
      if (!ok) return;
    }
    const directoryContactId =
      values.directory_contact_id === DIRECTORY_LINK_NONE
        ? null
        : values.directory_contact_id || null;

    const { error } = await updateSiteContact(
      contact.id,
      siteId,
      {
        ...values,
        directory_contact_id: directoryContactId,
      },
      studyId
    );
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Contact updated');
    onOpenChange(false);
    form.reset(getDefaultValues(contact));
    onSuccess();
  };

  const onSubmitAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    const fd = new FormData(el);
    const raw = {
      first_name: String(fd.get('first_name') ?? ''),
      last_name: String(fd.get('last_name') ?? ''),
      title: String(fd.get('title') ?? '') || undefined,
      email: String(fd.get('email') ?? '') || undefined,
      avatar_url: String(fd.get('avatar_url') ?? '').trim() || undefined,
      phone: String(fd.get('phone') ?? '') || undefined,
      department: String(fd.get('department') ?? '') || undefined,
      country_code: addContactCountryCode || undefined,
      region: addContactRegion || undefined,
      status: (fd.get('status') as string) === 'inactive' ? 'inactive' : 'active',
      notes: String(fd.get('notes') ?? '') || undefined,
      primary_directory_role_id: addPrimaryRoleId || null,
      primary_institution_id: String(fd.get('primary_institution_id') ?? '') || null,
    };
    const parsed = directoryContactFormSchema.safeParse({
      ...raw,
      primary_directory_role_id: raw.primary_directory_role_id || null,
      primary_institution_id: raw.primary_institution_id || null,
    });
    if (!parsed.success) {
      const err = parsed.error.errors[0];
      const msg = err?.path?.length
        ? `${err.path.join('.')}: ${err.message}`
        : err?.message ?? 'Invalid form';
      toast.error(msg);
      return;
    }
    setAddPending(true);
    const res = await createDirectoryContact(parsed.data);
    setAddPending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (res.duplicateEmailWarning) toast.message('Another contact shares this email — please verify.');
    if (!res.data) {
      toast.error('Could not create contact');
      return;
    }
    const siteName = `${parsed.data.first_name} ${parsed.data.last_name}`.trim();
    const siteRole = siteRoleLabelFromQuickContact(
      directoryCatalog,
      addPrimaryRoleId,
      parsed.data.title ?? ''
    );
    const { error: siteErr } = await addSiteContact(
      {
        site_id: siteId,
        name: siteName,
        role: siteRole,
        email: parsed.data.email,
        phone: parsed.data.phone,
        is_primary: addIsPrimary,
        directory_contact_id: res.data.id,
      },
      studyId
    );
    if (siteErr) {
      toast.error(siteErr);
      return;
    }
    toast.success('Contact added');
    onOpenChange(false);
    onSuccess();
  };

  if (!isEdit) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">New contact</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={onSubmitAdd}>
            <QuickContactFormFields
              catalog={directoryCatalog}
              institutions={institutions}
              roleCategoryFilter={addRoleCategoryFilter}
              onRoleCategoryFilterChange={setAddRoleCategoryFilter}
              primaryRoleId={addPrimaryRoleId}
              onPrimaryRoleChange={setAddPrimaryRoleId}
              contactCountryCode={addContactCountryCode}
              contactRegion={addContactRegion}
              onContactCountryChange={setAddContactCountryCode}
              onContactRegionChange={setAddContactRegion}
              phone={addPhone}
              onPhoneChange={setAddPhone}
              primaryInstitutionId={addPrimaryInstitutionId}
              onPrimaryInstitutionChange={setAddPrimaryInstitutionId}
              primaryFieldsLocked={addPrimaryFieldsLocked}
              companyId={companyId}
              avatarUrl={addAvatarUrl}
              onAvatarUrlChange={setAddAvatarUrl}
            >
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="site_add_is_primary"
                  checked={addIsPrimary}
                  onCheckedChange={(c) => setAddIsPrimary(!!c)}
                  disabled={addPrimaryFieldsLocked}
                />
                <Label htmlFor="site_add_is_primary" className="text-sm font-normal">
                  {addPrimaryFieldsLocked ? 'Primary contact for this site (locked for PI)' : 'Primary contact for this site'}
                </Label>
              </div>
            </QuickContactFormFields>
            <DialogFooter>
              <Button type="button" variant="outline" className="text-xs" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="text-xs" disabled={addPending}>
                {addPending ? 'Saving…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>Update contact information.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmitEdit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="Full name"
                className="text-xs"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                placeholder="e.g., Study Coordinator"
                className="text-xs"
                {...form.register('role')}
              />
              {form.formState.errors.role && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.role.message}
                </p>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@example.com"
                className="text-xs"
                {...form.register('email')}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                placeholder="+1 (555) 000-0000"
                className="text-xs"
                inputMode="tel"
                autoComplete="tel"
                value={form.watch('phone') ?? ''}
                onChange={(e) =>
                  form.setValue('phone', formatPhoneNumber(e.target.value), { shouldDirty: true })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Link to directory contact</Label>
            <Select
              value={form.watch('directory_contact_id') ?? DIRECTORY_LINK_NONE}
              onValueChange={(v) => form.setValue('directory_contact_id', v)}
            >
              <SelectTrigger className="text-xs w-full">
                <SelectValue
                  placeholder="Optional"
                  getDisplayLabel={(v) =>
                    v === DIRECTORY_LINK_NONE
                      ? 'None'
                      : directoryContactOptions.find((o) => o.id === v)?.label ?? v
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DIRECTORY_LINK_NONE} className="text-xs">
                  None
                </SelectItem>
                {directoryContactOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Optional link to a person in the company directory; site fields stay editable separately.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={contact ? `is_primary_${contact.id}` : 'is_primary'}
              checked={form.watch('is_primary')}
              onCheckedChange={(checked) => form.setValue('is_primary', !!checked)}
            />
            <Label htmlFor={contact ? `is_primary_${contact.id}` : 'is_primary'} className="text-sm font-normal">
              Primary contact for this site
            </Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
