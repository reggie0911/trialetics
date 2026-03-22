'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Info, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { PlatformDocDraft } from '@/lib/docs/platform-documentation-shared';
import {
  createDocumentation,
  deleteDocumentation,
  saveDocumentation,
} from '@/lib/actions/platform-documentation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PlatformDocsRepoTemplateSelect } from '@/components/platform/platform-docs-repo-template-select';
import { PlatformDocsMetadataForm } from '@/components/platform/platform-docs-metadata-form';
import { PlatformDocsBodyEditor } from '@/components/platform/platform-docs-body-editor';
import type { PlatformDocsTiptapEditorHandle } from '@/components/platform/platform-docs-tiptap-editor';
import { parseSortOrder, syncSlugFromTitle, titleToDocSlug } from '@/components/platform/platform-docs-editor-shared';
import type { RepoManualTemplateOption } from '@/lib/docs/repo-manual-templates';
import type { DocCategory, DocIconKey } from '@/lib/docs/registry';

export interface PlatformDocsEditorProps {
  mode: 'create' | 'edit';
  initialDraft: PlatformDocDraft;
  /** “New page” only: repo Markdown files allowed as documentation starters. */
  repoManualTemplates?: RepoManualTemplateOption[];
}

function PlatformDocsEditorInner({ mode, initialDraft, repoManualTemplates }: PlatformDocsEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [screenshotAlt, setScreenshotAlt] = useState('Screenshot');
  const editorRef = useRef<PlatformDocsTiptapEditorHandle | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bodySyncBump, setBodySyncBump] = useState(0);

  const slugManuallyEditedRef = useRef(false);
  const descriptionManuallyEditedRef = useRef(mode === 'edit' || Boolean(initialDraft.description.trim()));
  const moduleRouteManuallyEditedRef = useRef(mode === 'edit' && Boolean(initialDraft.moduleRoute.trim()));

  const [slugInput, setSlugInput] = useState(() =>
    mode === 'create' ? titleToDocSlug(initialDraft.title) : initialDraft.slug,
  );
  const [bodyMarkdown, setBodyMarkdown] = useState(initialDraft.bodyMarkdown);
  const [title, setTitle] = useState(initialDraft.title);
  const [description, setDescription] = useState(initialDraft.description);
  const [category, setCategory] = useState<DocCategory>((initialDraft.category || 'trackers') as DocCategory);
  const [iconKey, setIconKey] = useState<DocIconKey>(initialDraft.iconKey);
  const [moduleRoute, setModuleRoute] = useState(initialDraft.moduleRoute);
  const [sortOrder, setSortOrder] = useState(initialDraft.sortOrder);
  const [roleAdmin, setRoleAdmin] = useState(initialDraft.roles.includes('admin'));
  const [roleUser, setRoleUser] = useState(initialDraft.roles.includes('user'));

  const isRegistry = initialDraft.isRegistry;
  const hasDbRow = initialDraft.hasDbRow;

  const [repoRegistryNoticeSlug, setRepoRegistryNoticeSlug] = useState<string | null>(null);

  function bumpBodySync() {
    setBodySyncBump((n) => n + 1);
  }

  function handleRepoTemplateApplied(payload: {
    bodyMarkdown: string;
    title: string;
    description: string;
    registrySlug?: string;
    category?: DocCategory;
    iconKey?: DocIconKey;
    moduleRoute?: string;
  }) {
    setBodyMarkdown(payload.bodyMarkdown);
    setTitle(payload.title);
    setDescription(payload.description);
    descriptionManuallyEditedRef.current = true;
    if (payload.category) setCategory(payload.category);
    if (payload.iconKey) setIconKey(payload.iconKey);
    if (payload.moduleRoute !== undefined) setModuleRoute(payload.moduleRoute);

    if (payload.registrySlug) {
      slugManuallyEditedRef.current = true;
      setSlugInput('');
      setRepoRegistryNoticeSlug(payload.registrySlug);
    } else {
      setRepoRegistryNoticeSlug(null);
      slugManuallyEditedRef.current = false;
      syncSlugFromTitle(payload.title, setSlugInput, slugManuallyEditedRef);
    }
    bumpBodySync();
  }

  function buildRoles(): ('admin' | 'user')[] {
    const r: ('admin' | 'user')[] = [];
    if (roleAdmin) r.push('admin');
    if (roleUser) r.push('user');
    return r;
  }

  function handleSave() {
    setError(null);
    const roles = buildRoles();
    if (!roles.length) {
      setError('Select at least one audience role (Admin and/or User).');
      return;
    }
    if (mode === 'create') {
      if (!slugInput.trim()) {
        setError('Slug is required.');
        return;
      }
      if (!title.trim() || !description.trim()) {
        setError('Title and description are required.');
        return;
      }
    }
    const sortVal = parseSortOrder(sortOrder);

    startTransition(async () => {
      if (mode === 'create') {
        const s = slugInput.trim().toLowerCase();
        const res = await createDocumentation({
          slug: s,
          bodyMarkdown,
          title: title.trim(),
          description: description.trim(),
          category,
          iconKey,
          roles,
          moduleRoute: moduleRoute.trim() || undefined,
          sortOrder: sortVal,
        });
        if (!res.ok) {
          setError(res.error ?? 'Save failed');
          return;
        }
        router.push('/protected/platform/docs');
        router.refresh();
        return;
      }

      const res = await saveDocumentation({
        slug: initialDraft.slug,
        bodyMarkdown,
        title: title.trim(),
        description: description.trim(),
        category: isRegistry ? undefined : category,
        iconKey: isRegistry ? undefined : iconKey,
        roles,
        moduleRoute: moduleRoute.trim() || undefined,
        sortOrder: sortVal,
      });
      if (!res.ok) {
        setError(res.error ?? 'Save failed');
        return;
      }
      router.push('/protected/platform/docs');
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteDocumentation(initialDraft.slug);
      if (!res.ok) {
        setError(res.error ?? 'Delete failed');
        return;
      }
      router.push('/protected/platform/docs');
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/protected/platform/docs" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === 'create' ? 'New documentation page' : `Edit: ${initialDraft.slug}`}
        </h1>
        {isRegistry && (
          <p className="mt-1 text-sm text-muted-foreground">
            Built-in page: category and icon stay defined in the codebase registry; saving stores a database
            overlay for the markdown and optional title/description overrides.
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {mode === 'create' && repoManualTemplates && repoManualTemplates.length > 0 ? (
        <>
          <PlatformDocsRepoTemplateSelect
            templates={repoManualTemplates}
            disabled={pending}
            onApplied={handleRepoTemplateApplied}
            onSelectionCleared={() => setRepoRegistryNoticeSlug(null)}
          />
          {repoRegistryNoticeSlug ? (
            <Alert>
              <Info className="h-4 w-4" aria-hidden />
              <AlertTitle>Built-in documentation</AlertTitle>
              <AlertDescription>
                This manual is already published as a registry doc. To change what users see, open{' '}
                <Link
                  href={`/protected/platform/docs/edit/${repoRegistryNoticeSlug}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Edit overlay
                </Link>{' '}
                for slug <code className="rounded bg-muted px-1 py-0.5 text-xs">{repoRegistryNoticeSlug}</code>.
                To create a <em>fork</em> with a new URL, enter a new slug below (not the built-in slug) and
                click Create page.
              </AlertDescription>
            </Alert>
          ) : null}
        </>
      ) : null}

      <PlatformDocsMetadataForm
        mode={mode}
        isRegistry={isRegistry}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        slugInput={slugInput}
        setSlugInput={setSlugInput}
        category={category}
        setCategory={setCategory}
        iconKey={iconKey}
        setIconKey={setIconKey}
        moduleRoute={moduleRoute}
        setModuleRoute={setModuleRoute}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        roleAdmin={roleAdmin}
        setRoleAdmin={setRoleAdmin}
        roleUser={roleUser}
        setRoleUser={setRoleUser}
        slugManuallyEditedRef={slugManuallyEditedRef}
        descriptionManuallyEditedRef={descriptionManuallyEditedRef}
        moduleRouteManuallyEditedRef={moduleRouteManuallyEditedRef}
      />

      <PlatformDocsBodyEditor
        bodyMarkdown={bodyMarkdown}
        onBodyMarkdownChange={setBodyMarkdown}
        bodySyncBump={bodySyncBump}
        pending={pending}
        uploadingScreenshot={uploadingScreenshot}
        setUploadingScreenshot={setUploadingScreenshot}
        screenshotAlt={screenshotAlt}
        setScreenshotAlt={setScreenshotAlt}
        uploadError={uploadError}
        setUploadError={setUploadError}
        editorRef={editorRef}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={pending}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {mode === 'create' ? 'Create page' : 'Save'}
        </Button>
        <Button type="button" variant="outline" asChild disabled={pending}>
          <Link href="/protected/platform/docs">Cancel</Link>
        </Button>

        {mode === 'edit' && hasDbRow && (
          <>
            <Button
              type="button"
              variant="destructive"
              className="ml-auto"
              disabled={pending}
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isRegistry ? 'Remove DB overlay' : 'Delete page'}
            </Button>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => {
                      setDeleteDialogOpen(false);
                      handleDelete();
                    }}
                  >
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  );
}

function PlatformDocsEditorSkeleton() {
  return (
    <div
      className="space-y-6 min-h-[32rem] animate-pulse"
      aria-busy="true"
      aria-label="Loading documentation editor"
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-muted" />
        <div className="h-7 w-56 rounded bg-muted" />
      </div>
      <div className="h-4 max-w-xl rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-9 rounded-md bg-muted" />
        <div className="h-9 rounded-md bg-muted" />
      </div>
      <div className="h-9 max-w-md rounded-md bg-muted" />
      <div className="h-72 rounded-md border border-border bg-muted/40" />
      <div className="flex gap-2">
        <div className="h-9 w-24 rounded-md bg-muted" />
        <div className="h-9 w-24 rounded-md bg-muted" />
      </div>
    </div>
  );
}

export function PlatformDocsEditor(props: PlatformDocsEditorProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return <PlatformDocsEditorSkeleton />;
  }
  return <PlatformDocsEditorInner {...props} />;
}
