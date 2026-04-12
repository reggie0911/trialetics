'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FlaskConical, ArrowRight, MoreVertical, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { deleteBrandForgeProject, updateBrandForgeProject } from '@/lib/actions/brand-forge';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BFProject } from '@/lib/types/brand-forge';

interface ProjectCardProps {
  project: BFProject & {
    therapeutic_area?: string | null;
    phase?: string | null;
    protocol_number?: string | null;
  };
  onDeleted?: (projectId: string) => void;
  onProjectUpdated?: (projectId: string, patch: Partial<BFProject>) => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export function ProjectCard({ project, onDeleted, onProjectUpdated }: ProjectCardProps) {
  const href = `/protected/brand-forge/${project.id}/logos`;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  async function handleConfirmDelete() {
    setIsDeleting(true);
    const result = await deleteBrandForgeProject(project.id);
    setIsDeleting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Study brand deleted');
    setConfirmOpen(false);
    onDeleted?.(project.id);
  }

  async function setStudyStatus(next: BFProject['status']) {
    if (next === project.status) return;
    setIsUpdatingStatus(true);
    const result = await updateBrandForgeProject(project.id, { status: next });
    setIsUpdatingStatus(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    const label = next === 'active' ? 'Active' : next === 'archived' ? 'Archived' : 'Draft';
    toast.success(`Status set to ${label}`);
    onProjectUpdated?.(project.id, { status: next, updated_at: new Date().toISOString() });
  }

  async function handleConfirmArchive() {
    setArchiveOpen(false);
    await setStudyStatus('archived');
  }

  return (
    <>
      <Card className="group border-input hover:border-primary/40 transition-colors">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="rounded-md bg-muted p-2">
              <FlaskConical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Badge variant="outline" className={statusColors[project.status] ?? ''}>
                {project.status === 'active'
                  ? 'Active'
                  : project.status === 'archived'
                    ? 'Archived'
                    : 'Draft'}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'shrink-0')}
                  aria-label="Study brand actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {project.status !== 'archived' ? (
                    <>
                      {project.status === 'draft' && (
                        <DropdownMenuItem
                          disabled={isUpdatingStatus}
                          onClick={() => void setStudyStatus('active')}
                        >
                          Mark as active
                        </DropdownMenuItem>
                      )}
                      {project.status === 'active' && (
                        <DropdownMenuItem
                          disabled={isUpdatingStatus}
                          onClick={() => void setStudyStatus('draft')}
                        >
                          Mark as draft
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        disabled={isUpdatingStatus}
                        onClick={() => setArchiveOpen(true)}
                      >
                        Archive
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem
                        disabled={isUpdatingStatus}
                        onClick={() => void setStudyStatus('active')}
                      >
                        Restore to active
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={isUpdatingStatus}
                        onClick={() => void setStudyStatus('draft')}
                      >
                        Restore to draft
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setConfirmOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete study brand
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <Link href={href} className="block rounded-md outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
            <div>
              <h3 className="text-sm font-medium truncate">{project.name}</h3>
              {project.protocol_number && (
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">{project.protocol_number}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                {project.therapeutic_area && (
                  <Badge variant="secondary" className="text-xs">{project.therapeutic_area}</Badge>
                )}
                {project.phase && (
                  <Badge variant="outline" className="text-xs">{project.phase}</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-muted-foreground">
                {new Date(project.created_at).toLocaleDateString()}
              </p>
              <div className="flex items-center text-xs text-muted-foreground group-hover:text-primary transition-colors">
                Open
                <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </div>
          </Link>
        </CardContent>
      </Card>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this study brand?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block font-medium text-foreground">{project.name}</span>
              Archiving marks it as inactive on the dashboard. You can restore it to active or draft anytime from the menu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingStatus}>Cancel</AlertDialogCancel>
            <Button disabled={isUpdatingStatus} onClick={() => void handleConfirmArchive()}>
              {isUpdatingStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Archiving…
                </>
              ) : (
                'Archive'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this study brand?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block font-medium text-foreground">{project.name}</span>
              This permanently removes the study brand, logos, brand kit, export history, share links, and stored assets. This cannot be undone. Download exports first if you need to keep files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
