'use client';

import { useState, useTransition } from 'react';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';

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
  updateCommittee,
  deleteCommittee,
  upsertCommitteeMember,
  removeCommitteeMember,
} from '@/lib/actions/directory-committees';
import { committeeFormSchema } from '@/lib/validation/directory';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import type { CommitteeWithMembers } from '@/lib/types/directory';
import type { Study } from '@/lib/types/ctms';
import { COMMITTEE_TYPE_OPTIONS } from '@/lib/types/directory';

interface ContactOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

interface Props {
  committee: CommitteeWithMembers;
  canEdit: boolean;
  studies: Study[];
  contacts: ContactOption[];
  flatRoles: { id: string; name: string }[];
  catalogError?: string | null;
}

export function DirectoryCommitteeDetailClient({
  committee: initial,
  canEdit,
  studies,
  contacts,
  flatRoles,
  catalogError = null,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [memberOpen, setMemberOpen] = useState(false);

  const form = useForm<
    z.input<typeof committeeFormSchema>,
    unknown,
    z.infer<typeof committeeFormSchema>
  >({
    resolver: zodResolver(committeeFormSchema),
    defaultValues: {
      name: initial.name,
      committee_type: initial.committee_type,
      study_id: initial.study_id ?? '',
      status: initial.status,
      notes: initial.notes ?? '',
    },
  });

  const normContact = (c: unknown) =>
    (Array.isArray(c) ? c[0] : c) as { first_name?: string; last_name?: string; email?: string } | null;
  const normRole = (r: unknown) => (Array.isArray(r) ? r[0] : r) as { name?: string } | null;

  const onSave = form.handleSubmit(async (values) => {
    startTransition(async () => {
      const { error } = await updateCommittee(initial.id, {
        ...values,
        notes: values.notes || undefined,
      });
      if (error) toast.error(error);
      else {
        toast.success('Committee updated');
        router.refresh();
      }
    });
  });

  const existingContactIds = new Set(initial.members.map((m) => m.directory_contact_id));
  const rolesReady = flatRoles.length > 0 && !catalogError;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{initial.name}</h1>
        {canEdit && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="text-xs"
            onClick={() => {
              startTransition(async () => {
                const { error } = await deleteCommittee(initial.id);
                if (error) toast.error(error);
                else {
                  toast.success('Committee removed');
                  router.push('/protected/studies');
                }
              });
            }}
          >
            Delete committee
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Committee details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSave} className="space-y-3 max-w-xl">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input className="text-xs h-9" {...form.register('name')} disabled={!canEdit} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input px-2 text-xs disabled:opacity-50"
                disabled={!canEdit}
                {...form.register('committee_type')}
              >
                {COMMITTEE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Study (optional)</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input px-2 text-xs disabled:opacity-50"
                disabled={!canEdit}
                {...form.register('study_id')}
              >
                <option value="">Company-wide</option>
                {studies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.protocol_number} — {s.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input px-2 text-xs disabled:opacity-50"
                disabled={!canEdit}
                {...form.register('status')}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea className="text-xs min-h-[72px]" {...form.register('notes')} disabled={!canEdit} />
            </div>
            {canEdit && (
              <Button type="submit" size="sm" className="text-xs" disabled={form.formState.isSubmitting}>
                Save
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Members</CardTitle>
          {canEdit && (
            <Button type="button" variant="outline" size="sm" className="text-xs h-8" onClick={() => setMemberOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />
              Add member
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Contact</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs">Active</TableHead>
                <TableHead className="text-xs w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {initial.members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-xs text-muted-foreground">
                    No members yet.
                  </TableCell>
                </TableRow>
              ) : (
                initial.members.map((row) => {
                  const dc = normContact(row.directory_contacts);
                  const dr = normRole(row.directory_roles);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs">
                        {dc ? `${dc.first_name} ${dc.last_name}` : '—'}
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
                                await removeCommitteeMember(row.id);
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

      <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base">Add member</DialogTitle>
          </DialogHeader>
          {catalogError ? (
            <Alert variant="destructive" className="text-xs">
              <AlertTitle>Role catalog failed to load</AlertTitle>
              <AlertDescription className="text-xs">
                {catalogError}. See{' '}
                <Link href="/protected/directory" className="underline underline-offset-2 font-medium">
                  Directory &amp; role catalog setup
                </Link>{' '}
                or refresh after signing in.
              </AlertDescription>
            </Alert>
          ) : null}
          {!catalogError && flatRoles.length === 0 ? (
            <Alert className="text-xs border-amber-500/40 bg-amber-500/5">
              <AlertTitle>Role catalog is empty</AlertTitle>
              <AlertDescription className="text-xs">
                Apply Supabase migrations (role seeds), run{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">supabase db push</code>, then refresh.{' '}
                <Link href="/protected/directory" className="underline underline-offset-2 font-medium">
                  Directory &amp; role catalog setup
                </Link>
                .
              </AlertDescription>
            </Alert>
          ) : null}
          <form
            action={async (fd) => {
              const directory_contact_id = String(fd.get('directory_contact_id'));
              if (existingContactIds.has(directory_contact_id)) {
                toast.error('Already a member');
                return;
              }
              const { error } = await upsertCommitteeMember({
                committee_id: initial.id,
                directory_contact_id,
                directory_role_id: String(fd.get('directory_role_id')) || null,
                is_active: true,
              });
              if (error) toast.error(error);
              else {
                toast.success('Member added');
                setMemberOpen(false);
                router.refresh();
              }
            }}
            className="space-y-3"
          >
            <div className="space-y-1">
              <Label className="text-xs">Contact</Label>
              <select
                name="directory_contact_id"
                required
                className="flex h-9 w-full rounded-md border border-input px-2 text-xs"
              >
                {contacts.map((c) => (
                  <option key={c.id} value={c.id} disabled={existingContactIds.has(c.id)}>
                    {c.first_name} {c.last_name}
                    {c.email ? ` (${c.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role in committee</Label>
              <select
                name="directory_role_id"
                disabled={!rolesReady}
                className="flex h-9 w-full rounded-md border border-input px-2 text-xs disabled:opacity-50"
              >
                <option value="">None</option>
                {flatRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="submit" className="text-xs">
                Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
