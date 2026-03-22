'use client';

import type { RefObject } from 'react';
import { useRef } from 'react';
import { ImageUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocsViewer } from '@/components/docs/docs-viewer';
import {
  PlatformDocsTiptapEditor,
  type PlatformDocsTiptapEditorHandle,
} from '@/components/platform/platform-docs-tiptap-editor';
import { docBodyWithoutFrontmatter } from '@/lib/docs/doc-body-frontmatter';
import { stripHtmlCommentsForPreview, sanitizeDocImageAlt } from '@/components/platform/platform-docs-editor-shared';
import { uploadDocumentationScreenshot } from '@/lib/actions/platform-documentation';
import { cn } from '@/lib/utils';

type Props = {
  bodyMarkdown: string;
  onBodyMarkdownChange: (v: string) => void;
  bodySyncBump: number;
  pending: boolean;
  uploadingScreenshot: boolean;
  setUploadingScreenshot: (v: boolean) => void;
  screenshotAlt: string;
  setScreenshotAlt: (v: string) => void;
  uploadError: string | null;
  setUploadError: (v: string | null) => void;
  editorRef: RefObject<PlatformDocsTiptapEditorHandle | null>;
};

export function PlatformDocsBodyEditor({
  bodyMarkdown,
  onBodyMarkdownChange,
  bodySyncBump,
  pending,
  uploadingScreenshot,
  setUploadingScreenshot,
  screenshotAlt,
  setScreenshotAlt,
  uploadError,
  setUploadError,
  editorRef,
}: Props) {
  const screenshotFileRef = useRef<HTMLInputElement>(null);

  async function handleUploadScreenshot() {
    setUploadError(null);
    const input = screenshotFileRef.current;
    const file = input?.files?.[0];
    if (!file) {
      setUploadError('Choose an image file first.');
      return;
    }
    setUploadingScreenshot(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadDocumentationScreenshot(fd);
      if (!res.ok || !res.url) {
        setUploadError(res.error ?? 'Upload failed');
        return;
      }
      const alt = sanitizeDocImageAlt(screenshotAlt);
      editorRef.current?.insertMarkdown(`![${alt}](${res.url})`);
      input.value = '';
    } finally {
      setUploadingScreenshot(false);
    }
  }

  return (
    <Tabs defaultValue="write" className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-sm font-medium">Documentation</Label>
        <TabsList className="h-7">
          <TabsTrigger value="write" className="px-2 py-1 text-xs">
            Write
          </TabsTrigger>
          <TabsTrigger value="preview" className="px-2 py-1 text-xs">
            Preview
          </TabsTrigger>
        </TabsList>
      </div>
      <p className="text-xs text-muted-foreground -mt-1 max-w-3xl">
        <span className="font-medium text-foreground/80">This field is the help article.</span> Use the rich editor
        (optional <code className="text-[11px]">---</code> YAML frontmatter at the top of the stored markdown is
        preserved but not shown in the editor). After you save, users see it in the in-app docs.{' '}
        <span className="font-medium text-foreground/80">Preview</span> shows roughly how it will render.
      </p>
      <TabsContent value="write" className="mt-0 space-y-3">
        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <ImageUp className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
            <span className="text-sm font-medium">Insert screenshot</span>
            <span className="text-xs text-muted-foreground">
              Uploads to Supabase (<code className="text-[11px]">documentation-screenshots</code>). You can also use the
              toolbar image button or paste a <code className="text-[11px]">https://</code> image URL via link/markdown.
            </span>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid gap-1 min-w-[140px]">
              <Label htmlFor="doc-screenshot-alt" className="text-xs">
                Alt text
              </Label>
              <Input
                id="doc-screenshot-alt"
                value={screenshotAlt}
                onChange={(e) => setScreenshotAlt(e.target.value)}
                placeholder="Screenshot"
                className="h-8 text-sm"
                disabled={uploadingScreenshot}
              />
            </div>
            <div className="grid gap-1 flex-1 min-w-[200px]">
              <Label htmlFor="doc-screenshot-file" className="text-xs">
                Image file
              </Label>
              <input
                id="doc-screenshot-file"
                ref={screenshotFileRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                disabled={uploadingScreenshot}
                className={cn(
                  'h-8 w-full min-w-0 cursor-pointer rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] file:mr-2 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30',
                )}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0"
              disabled={uploadingScreenshot || pending}
              onClick={() => void handleUploadScreenshot()}
            >
              {uploadingScreenshot ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Upload and append
            </Button>
          </div>
          {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
        </div>
        <PlatformDocsTiptapEditor
          ref={editorRef}
          value={bodyMarkdown}
          onChange={onBodyMarkdownChange}
          externalBump={bodySyncBump}
          disabled={pending}
          screenshotAlt={screenshotAlt}
          onUploadError={(msg) => setUploadError(msg)}
        />
      </TabsContent>
      <TabsContent value="preview" className="mt-0 min-h-[420px] overflow-y-auto rounded-md border">
        <DocsViewer content={stripHtmlCommentsForPreview(docBodyWithoutFrontmatter(bodyMarkdown))} />
      </TabsContent>
    </Tabs>
  );
}
