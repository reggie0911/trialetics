'use client';

import { useState } from 'react';
import { Heart, Check, AlertTriangle, Eraser, Spline, ZoomIn, Printer, Loader2, Copy, Contrast, Download, FileImage, FileType, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { deleteLogoConcept, toggleConceptFavorite } from '@/lib/actions/brand-forge';
import type { BFLogoConcept } from '@/lib/types/brand-forge';
import { cn } from '@/lib/utils';

interface LogoConceptCardProps {
  concept: BFLogoConcept;
  isSelected: boolean;
  onToggleSelect: () => void;
  onFavoriteToggle: (id: string, isFavorite: boolean) => void;
  onClone?: (concept: BFLogoConcept) => void;
  onDeleted?: (id: string) => void;
  onConceptUpdated?: (id: string, patch: Partial<BFLogoConcept>) => void;
}

export function LogoConceptCard({
  concept,
  isSelected,
  onToggleSelect,
  onFavoriteToggle,
  onClone,
  onDeleted,
  onConceptUpdated,
}: LogoConceptCardProps) {
  const [isFav, setIsFav] = useState(concept.is_favorite);
  const [isCloning, setIsCloning] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isFav;
    setIsFav(next);
    onFavoriteToggle(concept.id, next);

    const result = await toggleConceptFavorite(concept.id, next);
    if (result?.error) {
      setIsFav(!next);
      onFavoriteToggle(concept.id, !next);
      toast.error('Failed to update favorite');
    }
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      const result = await deleteLogoConcept(concept.id);
      if (result?.error) {
        toast.error('Could not delete concept', { description: result.error });
        return;
      }
      toast.success('Logo concept deleted');
      setDeleteOpen(false);
      onDeleted?.(concept.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClone = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCloning(true);
    try {
      const res = await fetch('/api/brand-forge/clone-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptId: concept.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { concept?: BFLogoConcept; error?: string };
      if (!res.ok || !data.concept) {
        throw new Error(data.error || 'Clone failed');
      }
      toast.success('Concept cloned');
      onClone?.(data.concept);
    } catch (err) {
      toast.error('Failed to clone concept', { description: (err as Error).message });
    } finally {
      setIsCloning(false);
    }
  };

  const runConceptDownload = async (format: 'svg' | 'png', e: React.MouseEvent) => {
    e.stopPropagation();
    const params = new URLSearchParams({ conceptId: concept.id, format });
    try {
      const res = await fetch(`/api/brand-forge/download?${params.toString()}`);
      if (!res.ok) {
        const ct = res.headers.get('Content-Type') ?? '';
        let message = `Download failed (${res.status})`;
        if (ct.includes('application/json')) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          message = data.error || message;
        } else {
          const text = await res.text().catch(() => '');
          if (text) message = text.slice(0, 200);
        }
        throw new Error(message);
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition');
      const match = cd?.match(/filename="?([^";]+)"?/i);
      const fallback =
        format === 'svg' ? `logo-concept-${concept.id.slice(0, 8)}.svg` : `logo-concept-${concept.id.slice(0, 8)}.png`;
      const filename = match?.[1]?.trim() || fallback;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Download failed', { description: (err as Error).message });
    }
  };

  const hasSvg = !!concept.svg_storage_path;
  const hasPng = !!concept.png_storage_path;
  const canDownloadPng = hasPng || hasSvg;

  const isAutoTraced = concept.generation_metadata?.source === 'auto-traced';
  const isNativeSvg = concept.generation_metadata?.source === 'native-svg';

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all hover:border-primary/40 relative',
        isSelected && 'border-primary ring-2 ring-primary/20',
      )}
      onClick={onToggleSelect}
    >
      <CardContent className="p-0">
        {/* Image preview */}
        <div className="aspect-square bg-muted/30 flex items-center justify-center p-4 rounded-t-lg overflow-hidden relative">
          {concept.thumbnail_url ? (
            <img
              key={concept.thumbnail_url ?? concept.id}
              src={concept.thumbnail_url}
              alt="Logo concept"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-xs text-muted-foreground">Preview unavailable</div>
          )}

          {/* Select indicator */}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={isSelected ? 'Deselect logo concept' : 'Select logo concept'}
                  className={cn(
                    'absolute top-2 left-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30 bg-background',
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect();
                  }}
                />
              }
            >
              {isSelected ? <Check className="h-3 w-3 text-primary-foreground" aria-hidden /> : null}
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[220px] text-[11px] leading-snug">
              {isSelected
                ? 'Included in your selection for the brand kit. Click to remove from selection.'
                : 'Click to select this concept for your brand kit or batch actions. You can also click the card.'}
            </TooltipContent>
          </Tooltip>

          {/* Delete */}
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label="Delete logo concept"
                    className="absolute top-2 right-12 z-10 rounded-full bg-background/80 p-1.5 transition-colors outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteOpen(true);
                    }}
                  />
                }
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px] text-[11px] leading-snug">
                Delete this concept from the project.
              </TooltipContent>
            </Tooltip>
            <AlertDialogContent size="default" onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this logo concept?</AlertDialogTitle>
                <AlertDialogDescription>
                  This cannot be undone. If this concept is used in your brand kit, those slots will be cleared.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <Button
                  type="button"
                  variant="destructive"
                  size="default"
                  disabled={isDeleting}
                  className="gap-2"
                  onClick={(e) => void handleConfirmDelete(e)}
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  Delete
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Favorite button */}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={handleFavorite}
                  aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  className="absolute top-2 right-2 z-10 rounded-full bg-background/80 p-1.5 transition-colors outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                />
              }
            >
              <Heart
                className={cn(
                  'h-4 w-4 transition-colors',
                  isFav ? 'fill-red-500 text-red-500' : 'text-muted-foreground',
                )}
                aria-hidden
              />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[220px] text-[11px] leading-snug">
              {isFav
                ? 'Remove favorite. Favorites are saved with this project.'
                : 'Mark as a favorite to find this concept quickly in your gallery.'}
            </TooltipContent>
          </Tooltip>

          {/* Auto-traced badge */}
          {isAutoTraced && (
            <Badge variant="outline" className="absolute bottom-2 left-2 text-[10px] gap-1 bg-background/80">
              <AlertTriangle className="h-2.5 w-2.5" />
              Auto-traced
            </Badge>
          )}

          {/* Clone button */}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label="Duplicate this concept"
                  disabled={isCloning}
                  className="absolute bottom-2 right-2 z-10 rounded-full bg-background/80 p-1.5 transition-colors outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
                  onClick={handleClone}
                />
              }
            >
              {isCloning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              )}
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-[11px] leading-snug">
              Duplicate this concept as an independent copy. Apply different post-processing to the clone without affecting the original.
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t space-y-1.5">
          <p className="text-xs text-muted-foreground truncate">
            {concept.generation_metadata?.model?.split('/').pop() ?? concept.generation_metadata?.style_preset ?? 'Generated concept'}
          </p>
          <div className="flex min-h-5 flex-nowrap items-center gap-2">
            <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max min-w-0 items-center pr-1">
                <PostProcessActions conceptId={concept.id} metadata={concept.generation_metadata} hasPng={hasPng} />
              </div>
            </div>
            <div className="flex shrink-0 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ variant: 'ghost' }),
                  'inline-flex h-5 min-h-5 items-center justify-center px-1.5 text-[9px] font-medium leading-none gap-0.5 rounded-md shrink-0',
                )}
                aria-label="Download logo files"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="h-2.5 w-2.5 shrink-0" />
                Save
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px] font-medium">Download</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-xs cursor-pointer gap-2"
                    disabled={!hasSvg}
                    onClick={(e) => void runConceptDownload('svg', e)}
                  >
                    <FileType className="h-3.5 w-3.5 shrink-0" />
                    Vector file (SVG)
                    {!hasSvg && <span className="ml-auto text-[10px] text-muted-foreground">Not available</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-xs cursor-pointer gap-2"
                    disabled={!canDownloadPng}
                    onClick={(e) => void runConceptDownload('png', e)}
                  >
                    <FileImage className="h-3.5 w-3.5 shrink-0" />
                    Image file (PNG)
                    {!canDownloadPng && <span className="ml-auto text-[10px] text-muted-foreground">Not available</span>}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PostProcessActions({
  conceptId,
  metadata,
  hasPng,
  onConceptUpdated,
}: {
  conceptId: string;
  metadata: BFLogoConcept['generation_metadata'];
  hasPng: boolean;
  onConceptUpdated?: (id: string, patch: Partial<BFLogoConcept>) => void;
}) {
  const [processing, setProcessing] = useState<string | null>(null);
  const applied = metadata?.postProcessing ?? [];

  const runAction = async (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcessing(action);
    try {
      const res = await fetch('/api/brand-forge/post-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptId, action }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || 'Processing failed');
      }
      const data = (await res.json().catch(() => ({}))) as {
        concept?: Partial<BFLogoConcept>;
      };
      if (data.concept && onConceptUpdated) {
        onConceptUpdated(conceptId, data.concept);
      }
      toast.success(`${action.replace(/-/g, ' ')} complete`);
    } catch (err) {
      toast.error('Processing failed', { description: (err as Error).message });
    } finally {
      setProcessing(null);
    }
  };

  const actions = [
    {
      id: 'remove-bg',
      label: 'BG',
      icon: Eraser,
      hint: 'Remove the background so the logo works on any color.',
      requiresPng: true,
    },
    {
      id: 'vectorize',
      label: 'SVG',
      icon: Spline,
      hint: 'Trace or refine the concept into a scalable vector where supported.',
      requiresPng: true,
    },
    {
      id: 'upscale',
      label: 'HD',
      icon: ZoomIn,
      hint: 'Upscale for a sharper image suitable for larger displays.',
      requiresPng: true,
    },
    {
      id: 'print-render',
      label: 'Print',
      icon: Printer,
      hint: 'Produce a print-friendly render for PDFs and physical materials.',
      requiresPng: false,
    },
    {
      id: 'convert-bw',
      label: 'B&W',
      icon: Contrast,
      hint: 'Convert the logo to black and white (greyscale). The image is updated in place.',
      requiresPng: true,
    },
  ] as const;

  return (
    <div className="flex flex-nowrap items-center gap-1">
      {actions.map((action) => {
        const done = applied.includes(action.id);
        const isProcessing = processing === action.id;
        const isDisabled = isProcessing || !!processing || (action.requiresPng && !hasPng);
        const Icon = action.icon;
        return (
          <Tooltip key={action.id}>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant={done ? 'secondary' : 'ghost'}
                  className="inline-flex h-5 min-h-5 shrink-0 items-center justify-center px-1.5 text-[9px] font-medium leading-none gap-0.5 rounded-md"
                  disabled={isDisabled}
                  onClick={(e) => runAction(action.id, e)}
                />
              }
            >
              {isProcessing ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Icon className="h-2.5 w-2.5" />}
              {action.label}
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-[10px] leading-snug">
              {action.requiresPng && !hasPng ? 'A PNG is required for this action.' : action.hint}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
