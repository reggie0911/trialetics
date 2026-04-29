'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createCommittee } from '@/lib/actions/directory-committees';
import type { CommitteeRow, CommitteeType } from '@/lib/types/directory';
import { COMMITTEE_TYPE_OPTIONS } from '@/lib/types/directory';
import type { Study } from '@/lib/types/ctms';

interface Props {
  committees: CommitteeRow[];
  committeesError: string | null;
  studies: Study[];
  canEdit: boolean;
}

export function DirectorySetupCommitteesSection({
  committees,
  committeesError,
  studies,
  canEdit,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);

  const submit = async (fd: FormData) => {
    const name = String(fd.get('name') ?? '').trim();
    const committee_type = String(fd.get('committee_type') ?? '');
    const studyRaw = String(fd.get('study_id') ?? '');
    const notes = String(fd.get('notes') ?? '').trim();
    if (!name) {
      toast.error('Name is required');
      return;
    }
    setPending(true);
    const { data, error } = await createCommittee({
      name,
      committee_type: committee_type as CommitteeType,
      study_id: studyRaw || null,
      status: 'active',
      notes: notes || null,
    });
    setPending(false);
    if (error) toast.error(error);
    else {
      toast.success('Committee created');
      setOpen(false);
      router.refresh();
      if (data?.id) {
        router.push(`/protected/directory/committees/${data.id}`);
      }
    }
  };

  return (
    <section id="committees" className="scroll-mt-24 space-y-4 rounded-lg border bg-card p-4 text-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-medium">Committees</h2>
          <p className="text-muted-foreground text-xs leading-relaxed max-w-prose">
            Create ethics, DSMB, steering, or other governance committees for your company. Add members from a{' '}
            <strong>contact&apos;s profile</strong> (Committee memberships) or open a committee and use{' '}
            <strong>Add member</strong>.
          </p>
        </div>
        {canEdit && (
          <Button type="button" size="sm" variant="outline" className="text-xs shrink-0" onClick={() => setOpen(true)}>
            <Plus className="h-3 w-3 mr-1" />
            New committee
          </Button>
        )}
      </div>

      {committeesError ? (
        <p className="text-xs text-destructive">{committeesError}</p>
      ) : committees.length === 0 ? (
        <p className="text-xs text-muted-foreground border border-dashed rounded-md px-3 py-4 text-center">
          No committees yet.
          {canEdit ? ' Click New committee to create one.' : null}
        </p>
      ) : (
        <ul className="divide-y rounded-md border text-xs">
          {committees.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 hover:bg-muted/30">
              <Link
                href={`/protected/directory/committees/${c.id}`}
                className="font-medium text-foreground hover:text-primary hover:underline underline-offset-2"
              >
                {c.name}
              </Link>
              <span className="text-muted-foreground capitalize">{c.committee_type.replace(/_/g, ' ')}</span>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base">New committee</DialogTitle>
          </DialogHeader>
          <form action={submit} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input name="name" required className="text-xs h-9" placeholder="e.g. Study 101 DSMB" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <select
                name="committee_type"
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                defaultValue="steering"
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
                name="study_id"
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="">Company-wide / not study-specific</option>
                {studies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.study_name || s.protocol_number} — {s.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea name="notes" className="text-xs min-h-[64px]" placeholder="Internal notes" />
            </div>
            <DialogFooter>
              <Button type="submit" className="text-xs" disabled={pending}>
                {pending ? 'Saving…' : 'Create committee'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
