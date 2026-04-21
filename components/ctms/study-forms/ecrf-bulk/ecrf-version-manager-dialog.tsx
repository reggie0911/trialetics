'use client';

import { useState, useTransition } from 'react';
import { Archive, Copy, FilePlus2, Pencil, Rocket, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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

import {
  archiveVersion,
  cloneVersion,
  createDraftVersion,
  deleteDraftVersion,
  publishVersion,
  renameVersion,
} from '@/lib/actions/study-ecrf-template-versions';
import type { EcrfTemplateVersionWithCounts } from '@/lib/types/ctms';

import { VersionStatusPill } from './ecrf-version-selector';

interface EcrfVersionManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string;
  versions: EcrfTemplateVersionWithCounts[];
  onChanged: () => void;
}

export function EcrfVersionManagerDialog({
  open,
  onOpenChange,
  studyId,
  versions,
  onChanged,
}: EcrfVersionManagerDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isPending, startTransition] = useTransition();

  const refresh = () => {
    onChanged();
  };

  const handleCreateBlank = () => {
    startTransition(async () => {
      const res = await createDraftVersion(studyId, {});
      if (res.error) toast.error(res.error);
      else {
        toast.success('Draft created.');
        refresh();
      }
    });
  };

  const handleClone = (sourceId: string) => {
    startTransition(async () => {
      const res = await cloneVersion(studyId, sourceId, {});
      if (res.error) toast.error(res.error);
      else {
        toast.success('Cloned to new draft.');
        refresh();
      }
    });
  };

  const handlePublish = (versionId: string) => {
    startTransition(async () => {
      const res = await publishVersion(studyId, versionId);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Version is now live.');
        refresh();
      }
    });
  };

  const handleArchive = (versionId: string) => {
    startTransition(async () => {
      const res = await archiveVersion(studyId, versionId);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Version archived.');
        refresh();
      }
    });
  };

  const handleDelete = (versionId: string) => {
    startTransition(async () => {
      const res = await deleteDraftVersion(studyId, versionId);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Draft deleted.');
        refresh();
      }
    });
  };

  const startRename = (id: string, name: string | null) => {
    setEditingId(id);
    setEditName(name ?? '');
  };

  const commitRename = () => {
    if (!editingId) return;
    const id = editingId;
    const name = editName.trim();
    if (!name) {
      toast.error('Version name is required.');
      return;
    }
    startTransition(async () => {
      const res = await renameVersion(studyId, id, name);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Renamed.');
        setEditingId(null);
        refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Template versions</DialogTitle>
          <DialogDescription>
            Drafts can be edited; the live version is read-only and powers downstream eCRF capture.
            Only one version can be live at a time.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={handleCreateBlank} disabled={isPending}>
            <FilePlus2 className="mr-1 h-3.5 w-3.5" />
            New blank draft
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-40 text-right">Contents</TableHead>
                <TableHead className="w-[260px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-xs text-muted-foreground">
                    No versions yet. Create a draft to get started.
                  </TableCell>
                </TableRow>
              ) : (
                versions.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      {editingId === v.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-7 text-xs"
                            autoFocus
                          />
                          <Button size="sm" className="h-7" onClick={commitRename}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">v{v.version_number}</span>
                          <span className="text-xs text-muted-foreground">
                            {v.name ?? `Version ${v.version_number}`}
                          </span>
                          {v.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => startRename(v.id, v.name)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <VersionStatusPill status={v.status} />
                    </TableCell>
                    <TableCell className="text-right text-[10px] text-muted-foreground">
                      {v.visit_count}V · {v.crf_count}C · {v.question_count}Q
                    </TableCell>
                    <TableCell>
                      <VersionActions
                        version={v}
                        disabled={isPending}
                        onClone={() => handleClone(v.id)}
                        onPublish={() => handlePublish(v.id)}
                        onArchive={() => handleArchive(v.id)}
                        onDelete={() => handleDelete(v.id)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VersionActions({
  version,
  disabled,
  onClone,
  onPublish,
  onArchive,
  onDelete,
}: {
  version: EcrfTemplateVersionWithCounts;
  disabled: boolean;
  onClone: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2"
        onClick={onClone}
        disabled={disabled}
      >
        <Copy className="mr-1 h-3 w-3" />
        Clone
      </Button>

      {version.status === 'draft' && (
        <ConfirmActionButton
          title="Publish version?"
          description={`This makes "v${version.version_number} ${version.name ?? ''}" the live version. Any currently live version is archived. Drafts cannot be edited after publishing — clone them to keep iterating.`}
          confirmLabel="Publish"
          onConfirm={onPublish}
          disabled={disabled}
          trigger={
            <Button size="sm" variant="ghost" className="h-7 px-2">
              <Rocket className="mr-1 h-3 w-3" />
              Publish
            </Button>
          }
        />
      )}

      {version.status === 'live' && (
        <ConfirmActionButton
          title="Archive live version?"
          description="This study will have no live version until another is published. Existing eCRF capture will continue against archived data."
          confirmLabel="Archive"
          onConfirm={onArchive}
          disabled={disabled}
          trigger={
            <Button size="sm" variant="ghost" className="h-7 px-2">
              <Archive className="mr-1 h-3 w-3" />
              Archive
            </Button>
          }
        />
      )}

      {version.status === 'draft' && (
        <ConfirmActionButton
          title="Delete draft?"
          description="This permanently deletes the draft and all visits, CRFs, and questions inside it."
          confirmLabel="Delete"
          destructive
          onConfirm={onDelete}
          disabled={disabled}
          trigger={
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          }
        />
      )}
    </div>
  );
}

function ConfirmActionButton({
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
  disabled,
  trigger,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  disabled?: boolean;
  trigger: React.ReactElement;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={trigger} disabled={disabled} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
