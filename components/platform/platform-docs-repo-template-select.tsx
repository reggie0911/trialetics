'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { loadRepoManualForEditor } from '@/lib/actions/platform-documentation';
import type { RepoManualTemplateOption } from '@/lib/docs/repo-manual-templates';
import type { DocCategory, DocIconKey } from '@/lib/docs/registry';

export type RepoTemplateAppliedPayload = {
  bodyMarkdown: string;
  title: string;
  description: string;
  registrySlug?: string;
  category?: DocCategory;
  iconKey?: DocIconKey;
  moduleRoute?: string;
};

type Props = {
  templates: RepoManualTemplateOption[];
  disabled?: boolean;
  onApplied: (payload: RepoTemplateAppliedPayload) => void;
  /** Fired when the user chooses “None” (clears selection only; does not reset the form). */
  onSelectionCleared?: () => void;
};

export function PlatformDocsRepoTemplateSelect({
  templates,
  disabled,
  onApplied,
  onSelectionCleared,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);

  function handleChange(next: string) {
    setLocalError(null);
    if (!next) {
      setValue('');
      onSelectionCleared?.();
      return;
    }
    setValue(next);
    startTransition(async () => {
      const res = await loadRepoManualForEditor(next);
      if (!res.ok) {
        setLocalError(res.error);
        setValue('');
        return;
      }
      onApplied({
        bodyMarkdown: res.rawMarkdown,
        title: res.suggestedTitle,
        description: res.suggestedDescription,
        registrySlug: res.registrySlug,
        category: res.category,
        iconKey: res.iconKey,
        moduleRoute: res.moduleRoute,
      });
    });
  }

  if (templates.length === 0) return null;

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-2 min-w-[min(100%,280px)] flex-1">
          <Label htmlFor="repo-manual-template">Start from repo manual (optional)</Label>
          <Select
            value={value}
            onValueChange={handleChange}
            disabled={disabled || pending}
          >
            <SelectTrigger id="repo-manual-template" className="w-full">
              <SelectValue placeholder="Choose a markdown file from the repo…" />
            </SelectTrigger>
            <SelectContent className="max-h-[min(24rem,70vh)]">
              <SelectItem value="">None</SelectItem>
              {templates.map((t) => (
                <SelectItem key={t.filePath} value={t.filePath}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {pending ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground mb-2" aria-hidden />
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Loads allowlisted Markdown from the deployed app repo. Built-in docs also have an{' '}
        <strong>Edit</strong> entry from the documentation list to save a database overlay.
      </p>
      {localError ? (
        <p className="text-sm text-destructive" role="alert">
          {localError}
        </p>
      ) : null}
    </div>
  );
}
