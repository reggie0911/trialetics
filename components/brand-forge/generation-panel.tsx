'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, ImagePlus, Loader2, Sparkles, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GENERATION_STYLES,
  GENERATION_MODELS,
  generationModelDisplayLabel,
  type GenerationModelId,
  type LogoWorkspaceBriefSummary,
} from '@/lib/types/brand-forge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface GenerationPanelProps {
  /** Saved study context shown above controls; matches the prompt used when generating. */
  briefSummary?: LogoWorkspaceBriefSummary | null;
  showStyleCards: boolean;
  showInlineGenerate: boolean;
  selectedStyle: string;
  onStyleChange: (styleId: string) => void;
  selectedModel: GenerationModelId;
  onModelChange: (modelId: GenerationModelId) => void;
  customPrompt: string;
  onCustomPromptChange: (value: string) => void;
  styleDescription: string;
  referencePreviewUrl: string | null;
  onReferenceFile: (file: File) => void;
  onClearReference: () => void;
  isAnalyzing: boolean;
  onGenerate: () => void;
  isGenerating: boolean;
  /** Batch delete selected logo concepts (gallery only). */
  batchDelete?: {
    selectedCount: number;
    isDeleting: boolean;
    onConfirm: () => Promise<void>;
  };
}

const QUICK_MODELS = GENERATION_MODELS.filter((m) => m.tier === 'quick');
const STANDARD_MODELS = GENERATION_MODELS.filter((m) => m.tier === 'standard');
const VECTOR_MODELS = GENERATION_MODELS.filter((m) => m.tier === 'vector');

function selectedGenerationModelMeta(modelId: GenerationModelId) {
  return GENERATION_MODELS.find((m) => m.id === modelId);
}

function ModelSelectItem({ m }: { m: (typeof GENERATION_MODELS)[number] }) {
  return (
    <SelectItem value={m.id} className="text-xs">
      <span className="flex flex-col items-start gap-0.5 py-0.5">
        <span className="flex items-center gap-2">
          {m.label}
          <Badge variant="outline" className="text-[9px] px-1 py-0">
            {m.cost}
          </Badge>
        </span>
        <span className="text-[10px] text-muted-foreground font-mono leading-tight">{m.replicate}</span>
      </span>
    </SelectItem>
  );
}

export function GenerationPanel({
  briefSummary,
  showStyleCards,
  showInlineGenerate,
  selectedStyle,
  onStyleChange,
  selectedModel,
  onModelChange,
  customPrompt,
  onCustomPromptChange,
  styleDescription,
  referencePreviewUrl,
  onReferenceFile,
  onClearReference,
  isAnalyzing,
  onGenerate,
  isGenerating,
  batchDelete,
}: GenerationPanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  useEffect(() => {
    if (!batchDelete?.selectedCount) setBatchDeleteOpen(false);
  }, [batchDelete?.selectedCount]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropId = useId();

  const acceptTypes = 'image/png,image/jpeg,image/webp';

  const pickFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const processFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        toast.error('Please use a PNG, JPEG, or WebP image.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image must be 10MB or smaller.');
        return;
      }
      onReferenceFile(file);
    },
    [onReferenceFile],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    processFile(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="space-y-4">
      {briefSummary ? (
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
          <p className="text-xs font-medium text-foreground">{briefSummary.primary}</p>
          {briefSummary.secondary ? (
            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
              {briefSummary.secondary}
            </p>
          ) : null}
        </div>
      ) : null}
      <div>
        <h3 className="text-sm font-medium mb-2">Choose a logo style</h3>
        {showStyleCards ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {GENERATION_STYLES.map((style) => (
              <Tooltip key={style.id}>
                <TooltipTrigger
                  render={
                    <Card
                      className={cn(
                        'cursor-pointer transition-all hover:border-primary/40',
                        selectedStyle === style.id && 'border-primary ring-2 ring-primary/20',
                      )}
                      onClick={() => onStyleChange(style.id)}
                    />
                  }
                >
                  <CardContent className="p-3">
                    <p className="text-sm font-medium">{style.label}</p>
                    <p className="text-xs text-muted-foreground">{style.description}</p>
                  </CardContent>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] leading-snug">
                  {style.description}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {GENERATION_STYLES.map((style) => (
              <Tooltip key={style.id}>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant={selectedStyle === style.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onStyleChange(style.id)}
                    />
                  }
                >
                  {style.label}
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-[11px] leading-snug">
                  {style.description}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
      </div>

      {/* Model selector */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-xs font-medium">AI Model</Label>
          {batchDelete && batchDelete.selectedCount > 0 ? (
            <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
                onClick={() => setBatchDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Delete selected ({batchDelete.selectedCount})
              </Button>
              <AlertDialogContent size="default" onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete selected logo concepts?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove {batchDelete.selectedCount} selected concept
                    {batchDelete.selectedCount === 1 ? '' : 's'}. This cannot be undone. Any of these used in your brand
                    kit will be cleared there.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={batchDelete.isDeleting}>Cancel</AlertDialogCancel>
                  <Button
                    type="button"
                    variant="destructive"
                    size="default"
                    disabled={batchDelete.isDeleting}
                    className="gap-2"
                    onClick={() =>
                      void (async () => {
                        try {
                          await batchDelete.onConfirm();
                          setBatchDeleteOpen(false);
                        } catch {
                          /* toast from parent */
                        }
                      })()
                    }
                  >
                    {batchDelete.isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : null}
                    Delete {batchDelete.selectedCount}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex w-full max-w-sm" />}>
            <Select value={selectedModel} onValueChange={(v) => onModelChange(v as GenerationModelId)}>
              <SelectTrigger className="text-xs w-full sm:w-[min(100%,280px)]">
                <SelectValue
                  getDisplayLabel={(v) => generationModelDisplayLabel(v)}
                  placeholder="Select model"
                />
              </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel className="text-[10px]">Quick Exploration</SelectLabel>
              {QUICK_MODELS.map((m) => (
                <ModelSelectItem key={m.id} m={m} />
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="text-[10px]">Standard Generation</SelectLabel>
              {STANDARD_MODELS.map((m) => (
                <ModelSelectItem key={m.id} m={m} />
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="text-[10px]">Vector Output</SelectLabel>
              {VECTOR_MODELS.map((m) => (
                <ModelSelectItem key={m.id} m={m} />
              ))}
            </SelectGroup>
          </SelectContent>
            </Select>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-[11px] leading-snug">
            {selectedGenerationModelMeta(selectedModel)?.description ??
              'Choose how logos are generated. Each option balances speed, cost, and output type.'}
          </TooltipContent>
        </Tooltip>
      </div>

      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {advancedOpen ? (
              <ChevronDown className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )}
            Advanced options
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-4">
          <div className="space-y-2">
            <Label htmlFor={dropId} className="text-xs font-medium">
              Reference image
            </Label>
            <p className="text-xs text-muted-foreground">
              Upload a logo or mood image. We&apos;ll describe its style and add it to your generation prompt.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptTypes}
              className="sr-only"
              id={dropId}
              aria-label="Upload reference image"
              onChange={onInputChange}
            />
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  pickFile();
                }
              }}
              onClick={pickFile}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={cn(
                'rounded-md border border-dashed border-input p-4 text-center text-xs text-muted-foreground cursor-pointer transition-colors',
                isDragging && 'border-primary bg-primary/5',
              )}
            >
              {isAnalyzing ? (
                <span className="inline-flex items-center gap-2 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing image…
                </span>
              ) : referencePreviewUrl ? (
                <div className="flex flex-col items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={referencePreviewUrl}
                    alt=""
                    className="max-h-32 max-w-full rounded-md object-contain border border-border"
                  />
                  <span className="text-xs">Click or drop to replace</span>
                </div>
              ) : (
                <span className="inline-flex items-center gap-2 justify-center">
                  <ImagePlus className="h-4 w-4" />
                  Drop an image here or click to browse (PNG, JPEG, WebP, max 10MB)
                </span>
              )}
            </div>
            {referencePreviewUrl && !isAnalyzing && (
              <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onClearReference}>
                <X className="mr-1 h-3 w-3" />
                Remove reference image
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bf-style-description" className="text-xs font-medium">
              Extracted style (from image)
            </Label>
            <Textarea
              id="bf-style-description"
              readOnly
              value={styleDescription}
              placeholder="Upload a reference image to see an AI summary of its style."
              className="text-xs min-h-[72px] bg-muted/50 resize-none"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bf-custom-prompt" className="text-xs font-medium">
              Additional instructions
            </Label>
            <Textarea
              id="bf-custom-prompt"
              value={customPrompt}
              onChange={(e) => onCustomPromptChange(e.target.value)}
              placeholder="Add extra instructions to append to the generated prompt…"
              className="text-xs min-h-[80px] resize-y"
              maxLength={2000}
              rows={4}
            />
            <p className="text-[11px] text-muted-foreground">{customPrompt.length} / 2000</p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {showInlineGenerate && (
        <Tooltip>
          <TooltipTrigger
            render={<Button type="button" onClick={onGenerate} disabled={isGenerating} size="sm" />}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate concepts
              </>
            )}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-[11px] leading-snug">
            Create new logo concepts using your study brief, selected style, and model settings.
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
