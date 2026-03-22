'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from '@tiptap/markdown';
import {
  Bold,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Redo2,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { splitDocFrontmatter, mergeDocFrontmatter } from '@/lib/docs/doc-body-frontmatter';
import { uploadDocumentationScreenshot } from '@/lib/actions/platform-documentation';
import { cn } from '@/lib/utils';

function sanitizeDocImageAlt(raw: string): string {
  const s = raw.replace(/[\[\]]/g, '').trim();
  return s.length ? s : 'Screenshot';
}

export type PlatformDocsTiptapEditorHandle = {
  /** Insert markdown at the end of the document (e.g. after file upload). */
  insertMarkdown: (markdown: string) => void;
};

export interface PlatformDocsTiptapEditorProps {
  /** Full markdown including optional YAML frontmatter (frontmatter not shown in editor). */
  value: string;
  onChange: (fullMarkdown: string) => void;
  /** Increment when parent replaces body (outline, placeholder, upload append) so editor resyncs. */
  externalBump: number;
  disabled?: boolean;
  className?: string;
  screenshotAlt?: string;
  onUploadError?: (message: string) => void;
}

export const PlatformDocsTiptapEditor = forwardRef<
  PlatformDocsTiptapEditorHandle,
  PlatformDocsTiptapEditorProps
>(function PlatformDocsTiptapEditor(
  {
  value,
  onChange,
  externalBump,
  disabled,
  className,
  screenshotAlt = 'Screenshot',
  onUploadError,
}: PlatformDocsTiptapEditorProps,
  ref,
) {
  const prefixRef = useRef(splitDocFrontmatter(value).prefix);
  const lastBumpRef = useRef(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);

  const initialBody = splitDocFrontmatter(value).body;

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3, 4] },
          link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
        }),
        Image.configure({ inline: false, allowBase64: false }),
        Placeholder.configure({ placeholder: 'Write documentation…' }),
        Markdown,
      ],
      immediatelyRender: false,
      content: initialBody,
      contentType: 'markdown',
      editable: !disabled,
      editorProps: {
        attributes: {
          class: cn(
            'min-h-[380px] px-3 py-2 outline-none',
            'prose prose-sm dark:prose-invert max-w-none',
            'prose-headings:scroll-mt-20 prose-p:leading-relaxed',
            'prose-a:text-primary',
            '[&_img]:max-w-full [&_img]:rounded-md [&_img]:border [&_img]:border-border',
          ),
        },
      },
      onUpdate: ({ editor: ed }) => {
        const body = ed.getMarkdown();
        onChange(mergeDocFrontmatter(prefixRef.current, body));
      },
    },
    [],
  );

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  // Keep frontmatter prefix in sync when the full document is replaced externally.
  useEffect(() => {
    prefixRef.current = splitDocFrontmatter(value).prefix;
  }, [value, externalBump]);

  useEffect(() => {
    if (!editor) return;
    if (externalBump === lastBumpRef.current) return;
    lastBumpRef.current = externalBump;
    const { body } = splitDocFrontmatter(value);
    editor.commands.setContent(body, { contentType: 'markdown' });
  }, [editor, externalBump, value]);

  useImperativeHandle(
    ref,
    () => ({
      insertMarkdown: (markdown: string) => {
        const chunk = markdown.trim();
        if (!chunk || !editor) return;
        editor.chain().focus('end').insertContent(`\n\n${chunk}\n`, { contentType: 'markdown' }).run();
      },
    }),
    [editor],
  );

  async function handleImageFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editor || uploadingRef.current) return;
    uploadingRef.current = true;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadDocumentationScreenshot(fd);
      if (!res.ok || !res.url) {
        onUploadError?.(res.error ?? 'Upload failed');
        return;
      }
      const alt = sanitizeDocImageAlt(screenshotAlt);
      editor.chain().focus().setImage({ src: res.url, alt }).run();
    } finally {
      uploadingRef.current = false;
    }
  }

  function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  if (!editor) {
    return (
      <div
        className={cn('min-h-[420px] rounded-md border border-dashed border-muted-foreground/25 bg-muted/20 animate-pulse', className)}
        aria-hidden
      />
    );
  }

  return (
    <div className={cn('rounded-md border bg-muted/30 overflow-hidden', className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-background/80 px-1 py-1">
        <Button
          type="button"
          variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
          size="icon-sm"
          className="h-8 w-8"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
          size="icon-sm"
          className="h-8 w-8"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <Button
          type="button"
          variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
          size="icon-sm"
          className="h-8 w-8"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-label="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
          size="icon-sm"
          className="h-8 w-8"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          aria-label="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <Button
          type="button"
          variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
          size="icon-sm"
          className="h-8 w-8"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bullet list"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
          size="icon-sm"
          className="h-8 w-8"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="h-8 w-8"
          disabled={disabled}
          onClick={setLink}
          aria-label="Link"
        >
          <Link2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="h-8 w-8"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Insert image from file"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => void handleImageFileChange(e)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="h-8 w-8"
          disabled={disabled}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          aria-label="Horizontal rule"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="h-8 w-8"
          disabled={disabled || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
          aria-label="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="h-8 w-8"
          disabled={disabled || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
          aria-label="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent editor={editor} className="bg-background" />
    </div>
  );
});

PlatformDocsTiptapEditor.displayName = 'PlatformDocsTiptapEditor';
