'use client';

import { useEffect, useState } from 'react';
import { FileText, Loader2, Package, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { LogoWorkspaceBriefSummary } from '@/lib/types/brand-forge';

export interface GalleryPromptPreviewExtras {
  hasReferenceImage: boolean;
  isFluxKontext: boolean;
}

interface GalleryActionBarProps {
  selectedCount: number;
  isGenerating: boolean;
  /** Must run generation with the same custom prompt / reference style as LogoGallery state (parent closure). */
  onGenerate: () => void;
  hasAnyConcepts: boolean;
  briefSummary: LogoWorkspaceBriefSummary;
  /** Prompt from study + style + panel fields (no manual full-text override). */
  promptBase: string | null;
  /** Text used for the next generation: override if set, otherwise `promptBase`. */
  effectivePrompt: string | null;
  hasPromptOverride: boolean;
  onPromptOverrideApply: (fullText: string) => void;
  onPromptOverrideReset: () => void;
  promptPreviewExtras?: GalleryPromptPreviewExtras;
  /** When true, a saved brand kit row exists — CTA reads “Edit brand kit”. */
  hasBrandKit: boolean;
  /** Navigate to brand kit; parent runs apply-from-selection when concepts are selected, then routes. */
  onBrandKitNavigate: () => void | Promise<void>;
  isBrandKitNavigating?: boolean;
}

export function GalleryActionBar({
  selectedCount,
  isGenerating,
  onGenerate,
  hasAnyConcepts,
  briefSummary,
  promptBase,
  effectivePrompt,
  hasPromptOverride,
  onPromptOverrideApply,
  onPromptOverrideReset,
  promptPreviewExtras,
  hasBrandKit,
  onBrandKitNavigate,
  isBrandKitNavigating = false,
}: GalleryActionBarProps) {
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const showFluxReferenceNote =
    Boolean(promptPreviewExtras?.isFluxKontext && promptPreviewExtras.hasReferenceImage);

  useEffect(() => {
    if (promptDialogOpen && effectivePrompt != null) {
      setDraft(effectivePrompt);
    }
  }, [promptDialogOpen, effectivePrompt]);

  const trimmedDraft = draft.trim();
  const trimmedEffective = effectivePrompt?.trim() ?? '';
  const trimmedBase = promptBase?.trim() ?? '';

  const handleApply = () => {
    if (!trimmedDraft) return;
    if (trimmedDraft === trimmedBase) {
      onPromptOverrideReset();
    } else {
      onPromptOverrideApply(trimmedDraft);
    }
    setPromptDialogOpen(false);
  };

  const handleReset = () => {
    onPromptOverrideReset();
    if (promptBase != null) setDraft(promptBase);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between gap-4 px-6 py-3 max-w-7xl mx-auto">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium text-foreground truncate" title={briefSummary.primary}>
            {briefSummary.primary}
          </p>
          {briefSummary.secondary ? (
            <p
              className="text-[10px] text-muted-foreground line-clamp-2"
              title={briefSummary.secondary}
            >
              {briefSummary.secondary}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {selectedCount > 0 ? `${selectedCount} selected` : 'No concepts selected'}
            {hasPromptOverride ? (
              <span className="text-foreground/80"> · Custom image prompt</span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
            <DialogContent className="sm:max-w-lg max-h-[min(90vh,720px)] flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle className="text-lg">What we send to the image model</DialogTitle>
                <DialogDescription className="text-xs">
                  Review or edit the full text below. Applying saves your version for the next run until you reset or
                  change logo style or instructions in the panel above. Each image still gets a short variation label on
                  the server (not shown here).
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2 min-h-0 flex-1">
                <Label htmlFor="gallery-prompt-draft" className="text-[12px] font-medium">
                  Image prompt
                </Label>
                <div className="min-h-0 flex-1 overflow-y-auto rounded-md border bg-muted/30">
                  {effectivePrompt != null ? (
                    <Textarea
                      id="gallery-prompt-draft"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="min-h-[220px] text-[12px] resize-y border-0 bg-transparent focus-visible:ring-0 shadow-none rounded-md"
                      disabled={promptBase == null}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground px-3 py-2">
                      Brand details load from your saved inputs. Refresh or return to this page if the prompt is
                      unavailable.
                    </p>
                  )}
                </div>
              </div>
              {showFluxReferenceNote ? (
                <p className="text-xs text-muted-foreground leading-snug">
                  This model also receives your reference image as a separate input (not duplicated in the text above).
                </p>
              ) : null}
              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={handleReset}
                  disabled={!hasPromptOverride && trimmedDraft === trimmedBase}
                >
                  Use automatic prompt
                </Button>
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPromptDialogOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApply}
                    disabled={
                      promptBase == null ||
                      trimmedDraft.length === 0 ||
                      trimmedDraft === trimmedEffective
                    }
                  >
                    Apply
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPromptDialogOpen(true)}
                  disabled={!promptBase}
                />
              }
            >
              <FileText className="mr-2 h-4 w-4" />
              Preview prompt
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-[11px] leading-snug">
              {promptBase
                ? 'View or edit the full text sent with the next generation.'
                : 'Brand details load from your saved inputs—open this workspace after inputs are loaded.'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onGenerate}
                  disabled={isGenerating}
                />
              }
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate more
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-[11px] leading-snug">
              Add more logo concepts using your current style, model, and study brief from the panel above
              {hasPromptOverride ? ' (using your custom image prompt).' : '.'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Button
                type="button"
                size="sm"
                disabled={!hasAnyConcepts || isBrandKitNavigating}
                onClick={() => void onBrandKitNavigate()}
              >
                {isBrandKitNavigating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening…
                  </>
                ) : (
                  <>
                    <Package className="mr-2 h-4 w-4" />
                    {hasBrandKit ? 'Edit brand kit' : 'Build brand kit'}
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-[11px] leading-snug">
              {!hasAnyConcepts
                ? 'Generate at least one concept before building your brand kit.'
                : selectedCount > 0
                  ? `Opens the kit editor. Selection order maps to primary, secondary, and icon mark${hasBrandKit ? ' (updates your kit)' : ''}.`
                  : hasBrandKit
                    ? 'Open the brand kit editor to update logos, colors, typography, and voice.'
                    : 'Open the brand kit editor to lock in logos, colors, and typography.'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
