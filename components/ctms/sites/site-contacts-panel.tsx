'use client';

import { useState, useCallback, useTransition, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Star, ChevronRight } from 'lucide-react';
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
  type QuickContactCatalogCategory,
} from '@/components/ctms/directory/quick-contact-form-fields';
import { formatPhoneNumber } from '@/lib/utils';

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
  institutions: InstitutionRow[];
}

export function SiteContactsPanel({
  companyId,
  siteId,
  studyId,
  initialContacts,
  directoryContactOptions = [],
  directoryCatalog,
  institutions,
}: SiteContactsPanelProps) {
  const [contacts, setContacts] = useState(initialContacts);
  const [addOpen, setAddOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<SiteContact | null>(null);
  const [, startTransition] = useTransition();

  const refreshContacts = useCallback(() => {
    startTransition(async () => {
      try {
        const site = await getSiteById(siteId);
        if (site) setContacts(site.site_contacts);
      } catch {
        toast.error('Failed to refresh contacts');
      }
    });
  }, [siteId]);

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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-medium">Contacts</h3>
          <p className="text-sm text-muted-foreground">
            Site team members and key contacts.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="text-xs h-9"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add contact
        </Button>
      </div>

      <ContactFormDialog
        companyId={companyId}
        open={addOpen}
        onOpenChange={setAddOpen}
        siteId={siteId}
        studyId={studyId}
        onSuccess={refreshContacts}
        directoryContactOptions={directoryContactOptions}
        directoryCatalog={directoryCatalog}
        institutions={institutions}
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
              {contacts.map((contact) => (
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
              ))}
            </TableBody>
          </Table>
        </div>
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

function ContactFormDialog({
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
}) {
  const isEdit = !!contact;

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: getDefaultValues(contact),
  });

  const [addRoleCategoryFilter, setAddRoleCategoryFilter] = useState('');
  const [addPrimaryRoleId, setAddPrimaryRoleId] = useState('');
  const [addContactCountryCode, setAddContactCountryCode] = useState('');
  const [addContactRegion, setAddContactRegion] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addAvatarUrl, setAddAvatarUrl] = useState('');
  const [addIsPrimary, setAddIsPrimary] = useState(false);
  const [addPending, setAddPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      form.reset(getDefaultValues(contact));
    } else {
      setAddRoleCategoryFilter('');
      setAddPrimaryRoleId('');
      setAddContactCountryCode('');
      setAddContactRegion('');
      setAddPhone('');
      setAddIsPrimary(false);
    }
  }, [open, contact?.id, form, isEdit, contact]);

  const onSubmitEdit = async (values: ContactFormValues) => {
    if (!contact) return;
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
      toast.error(parsed.error.errors[0]?.message ?? 'Invalid form');
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
              companyId={companyId}
              avatarUrl={addAvatarUrl}
              onAvatarUrlChange={setAddAvatarUrl}
            >
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="site_add_is_primary"
                  checked={addIsPrimary}
                  onCheckedChange={(c) => setAddIsPrimary(!!c)}
                />
                <Label htmlFor="site_add_is_primary" className="text-sm font-normal">
                  Primary contact for this site
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
