'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Info, Loader2, Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { PlatformDocAdminListItem } from '@/lib/docs/platform-documentation-shared';
import { deleteDocumentation } from '@/lib/actions/platform-documentation';
import { cn } from '@/lib/utils';

function DocRowDeleteButton({ item }: { item: PlatformDocAdminListItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isRegistry = item.source === 'registry';

  function confirmDelete() {
    setDeleteError(null);
    startTransition(async () => {
      const res = await deleteDocumentation(item.slug);
      if (!res.ok) {
        setDeleteError(res.error ?? 'Delete failed');
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="mr-1 h-3.5 w-3.5" />
        {isRegistry ? 'Remove overlay' : 'Delete'}
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setDeleteError(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRegistry ? 'Remove database overlay?' : 'Delete this documentation page?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRegistry
                ? 'The public docs page will fall back to the markdown file shipped with the app.'
                : 'This removes the page from the catalog. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive" role="alert">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={pending} onClick={confirmDelete}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function PlatformDocsAdminList({
  items,
  documentationTableAvailable = true,
}: {
  items: PlatformDocAdminListItem[];
  /** When false, `platform_documentation` is missing — apply Supabase migration to enable saves. */
  documentationTableAvailable?: boolean;
}) {
  return (
    <div className="space-y-4">
      {!documentationTableAvailable && (
        <Alert
          variant="default"
          className="border-amber-500/35 bg-amber-500/[0.08] text-foreground dark:border-amber-500/25 dark:bg-amber-500/[0.06]"
        >
          <Info className="size-4 text-amber-700 dark:text-amber-400" aria-hidden />
          <AlertTitle className="text-amber-950 dark:text-amber-100">
            Enable documentation storage (one-time Supabase setup)
          </AlertTitle>
          <AlertDescription className="text-sm text-foreground/90 dark:text-foreground/85">
            <p className="mb-2">
              The <code className="rounded bg-background/80 px-1 py-0.5 font-mono text-xs">platform_documentation</code>{' '}
              table is not on this project yet. The list below still works from built-in files; <strong>saving</strong>{' '}
              or <strong>new DB-only pages</strong> need this table.
            </p>
            <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
              <li>
                In the{' '}
                <strong className="text-foreground">Supabase Dashboard</strong> for this app, open{' '}
                <strong className="text-foreground">SQL Editor</strong>.
              </li>
              <li>
                Copy the full contents of{' '}
                <code className="rounded bg-background/80 px-1 py-0.5 font-mono text-xs">
                  supabase/migrations/20260334200000_platform_documentation.sql
                </code>{' '}
                from the repo, paste, and run.
              </li>
              <li>Reload this page — the banner should disappear and saves will work.</li>
            </ol>
            <p className="mt-2 text-xs text-muted-foreground">
              More context: <code className="rounded bg-background/80 px-1 py-0.5 font-mono text-[11px]">docs/PLATFORM_ADMIN.md</code>{' '}
              (migrations / <code className="font-mono text-[11px]">supabase db push</code> if your migration history matches the repo).
            </p>
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documentation editor</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Override built-in pages in the database or add new docs without a deploy. Public docs read DB
            content when present, otherwise the shipped markdown file. Body content is edited with a rich editor;
            it is stored as Markdown. Screenshots use the <code className="text-[11px]">documentation-screenshots</code>{' '}
            storage bucket.
          </p>
        </div>
        <Button asChild>
          <Link href="/protected/platform/docs/new">
            <Plus className="mr-2 h-4 w-4" />
            New page
          </Link>
        </Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Module route</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>DB</TableHead>
              <TableHead className={cn('min-w-[200px] text-right')} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.slug}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell className="font-mono text-xs">{item.slug}</TableCell>
                <TableCell
                  className="max-w-[220px] truncate font-mono text-xs text-muted-foreground"
                  title={item.moduleRoute || undefined}
                >
                  {item.moduleRoute || '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={item.source === 'registry' ? 'secondary' : 'outline'}>
                    {item.source === 'registry' ? 'Built-in' : 'Database only'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {item.hasDbRow ? (
                    <Badge className="text-xs">Overlay</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/protected/platform/docs/edit/${encodeURIComponent(item.slug)}`}>
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Link>
                    </Button>
                    {item.hasDbRow && <DocRowDeleteButton item={item} />}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
