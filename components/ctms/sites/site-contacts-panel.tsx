'use client';

import { useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Star } from 'lucide-react';
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
  DialogTrigger,
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
import {
  addSiteContact,
  updateSiteContact,
  deleteSiteContact,
  getSiteById,
} from '@/lib/actions/sites';

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
  siteId: string;
  studyId: string;
  initialContacts: SiteContact[];
  directoryContactOptions?: { id: string; label: string }[];
}

export function SiteContactsPanel({
  siteId,
  studyId,
  initialContacts,
  directoryContactOptions = [],
}: SiteContactsPanelProps) {
  const [contacts, setContacts] = useState(initialContacts);
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Contacts</h3>
          <p className="text-sm text-muted-foreground">
            Site team members and key contacts.
          </p>
        </div>
        <ContactFormDialog
          siteId={siteId}
          studyId={studyId}
          onSuccess={refreshContacts}
          directoryContactOptions={directoryContactOptions}
        />
      </div>

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
                <TableHead className="text-xs w-[80px]">Primary</TableHead>
                <TableHead className="text-xs w-[80px]">Actions</TableHead>
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
                    {contact.directory_contact_id ? (
                      <Link
                        href={`/protected/directory/contacts/${contact.directory_contact_id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        View profile
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.is_primary && (
                      <Badge variant="default" className="text-xs">
                        <Star className="mr-1 h-3 w-3" />
                        Primary
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <ContactFormDialog
                        siteId={siteId}
                        studyId={studyId}
                        contact={contact}
                        onSuccess={refreshContacts}
                        directoryContactOptions={directoryContactOptions}
                      />
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

function ContactFormDialog({
  siteId,
  studyId,
  contact,
  onSuccess,
  directoryContactOptions,
}: {
  siteId: string;
  studyId: string;
  contact?: SiteContact;
  onSuccess: () => void;
  directoryContactOptions: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const isEdit = !!contact;

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: isEdit
      ? {
          name: contact.name,
          role: contact.role,
          email: contact.email ?? '',
          phone: contact.phone ?? '',
          is_primary: contact.is_primary,
          directory_contact_id:
            contact.directory_contact_id && contact.directory_contact_id.length > 0
              ? contact.directory_contact_id
              : DIRECTORY_LINK_NONE,
        }
      : {
          name: '',
          role: '',
          email: '',
          phone: '',
          is_primary: false,
          directory_contact_id: DIRECTORY_LINK_NONE,
        },
  });

  const onSubmit = async (values: ContactFormValues) => {
    const directoryContactId =
      values.directory_contact_id === DIRECTORY_LINK_NONE
        ? null
        : values.directory_contact_id || null;

    if (isEdit) {
      const { error } = await updateSiteContact(contact.id, siteId, {
        ...values,
        directory_contact_id: directoryContactId,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Contact updated');
    } else {
      const { error } = await addSiteContact(
        { site_id: siteId, ...values, directory_contact_id: directoryContactId },
        studyId
      );
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Contact added');
    }
    setOpen(false);
    form.reset();
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isEdit ? (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" />
          ) : (
            <Button size="sm" />
          )
        }
      >
        {isEdit ? (
          <Pencil className="h-3 w-3" />
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update contact information.'
              : 'Add a new contact to this site.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                placeholder="+1 (555) 123-4567"
                className="text-xs"
                {...form.register('phone')}
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
              id="is_primary"
              checked={form.watch('is_primary')}
              onCheckedChange={(checked) => form.setValue('is_primary', !!checked)}
            />
            <Label htmlFor="is_primary" className="text-sm font-normal">
              Primary contact for this site
            </Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
