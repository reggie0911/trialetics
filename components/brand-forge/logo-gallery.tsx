'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Palette } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { GenerationPanel } from './generation-panel';
import { LogoConceptCard } from './logo-concept-card';
import { GalleryActionBar } from './gallery-action-bar';
import { buildPrompt } from '@/lib/brand-forge/prompt-builder';
import {
  applyBrandKitLogoSlotsFromSelection,
  deleteLogoConcept,
  syncLogoConceptsSelection,
} from '@/lib/actions/brand-forge';
import {
  GENERATION_STYLES,
  logoWorkspaceBriefSummary,
  type BFLogoConcept,
  type BFBrandInputs,
  type GenerationModelId,
} from '@/lib/types/brand-forge';
import { brandForgePath, brandForgeStudyIdFromPathname } from '@/lib/nav/brand-forge-paths';

interface LogoGalleryProps {
  projectId: string;
  projectName: string;
  concepts: BFLogoConcept[];
  brandInputs: BFBrandInputs | null;
  /** True when a `bf_brand_kits` row exists for this project. */
  hasBrandKit: boolean;
}

/** First occurrence wins — matches `[...newerBatch, ...older]` so API rows beat stale client rows. */
function dedupeConceptsById(concepts: BFLogoConcept[]): BFLogoConcept[] {
  const map = new Map<string, BFLogoConcept>();
  for (const c of concepts) {
    if (!map.has(c.id)) map.set(c.id, c);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function LogoGallery({
  projectId,
  projectName,
  concepts: initialConcepts,
  brandInputs,
  hasBrandKit,
}: LogoGalleryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const studyId = brandForgeStudyIdFromPathname(pathname);
  const [concepts, setConcepts] = useState<BFLogoConcept[]>(() => dedupeConceptsById(initialConcepts));
  const [selectedStyle, setSelectedStyle] = useState<string>(GENERATION_STYLES[0].id);
  const [selectedModel, setSelectedModel] = useState<GenerationModelId>('ideogram-v3-turbo');
  const [customPrompt, setCustomPrompt] = useState('');
  const [styleDescription, setStyleDescription] = useState('');
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const ids = initialConcepts.filter((c) => c.is_selected).map((c) => c.id);
    return new Set(ids);
  });
  const [isBrandKitNavigating, setIsBrandKitNavigating] = useState(false);
  /** Full prompt text; when set, generation uses this instead of rebuilding from study + panel fields. */
  const [fullPromptOverride, setFullPromptOverride] = useState<string | null>(null);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const briefSummary = useMemo(
    () => logoWorkspaceBriefSummary(brandInputs, projectName),
    [brandInputs, projectName],
  );

  const promptBase = useMemo(() => {
    if (!brandInputs) return null;
    return buildPrompt(brandInputs, selectedStyle, {
      styleDescription: styleDescription.trim() || undefined,
      customPrompt: customPrompt.trim() || undefined,
    });
  }, [brandInputs, selectedStyle, styleDescription, customPrompt]);

  const effectivePrompt = fullPromptOverride ?? promptBase;

  useEffect(() => {
    setFullPromptOverride(null);
  }, [selectedStyle, styleDescription, customPrompt]);

  const promptPreviewExtras = useMemo(
    () => ({
      hasReferenceImage: Boolean(referencePreviewUrl),
      isFluxKontext: selectedModel === 'flux-kontext-pro',
    }),
    [referencePreviewUrl, selectedModel],
  );

  /** Merge server props with in-flight local rows so optimistic clones are not wiped when `initialConcepts` gets a new array reference. */
  useEffect(() => {
    setConcepts((prev) => {
      const serverIds = new Set(initialConcepts.map((c) => c.id));
      const pendingOnly = prev.filter((c) => !serverIds.has(c.id));
      return dedupeConceptsById([...pendingOnly, ...initialConcepts]);
    });
  }, [initialConcepts]);

  /** Drop selection for concepts that no longer exist. */
  useEffect(() => {
    const valid = new Set(concepts.map((c) => c.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => valid.has(id)));
      if (next.size === prev.size && [...prev].every((id) => next.has(id))) return prev;
      return next;
    });
  }, [concepts]);

  /** Persist multi-select to `bf_logo_concepts.is_selected` (debounced). */
  useEffect(() => {
    const t = setTimeout(() => {
      void (async () => {
        const result = await syncLogoConceptsSelection(projectId, Array.from(selectedIds));
        if (result?.error) {
          toast.error('Could not save selection', { description: result.error });
        }
      })();
    }, 400);
    return () => clearTimeout(t);
  }, [selectedIds, projectId]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        router.refresh();
      }, 400);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimeout(timeoutId);
    };
  }, [router]);

  useEffect(() => {
    return () => {
      if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl);
    };
  }, [referencePreviewUrl]);

  const handleReferenceFile = async (file: File) => {
    if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl);
    const url = URL.createObjectURL(file);
    setReferencePreviewUrl(url);
    setStyleDescription('');
    setIsAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/brand-forge/analyze-image', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not analyze image');
      }
      setStyleDescription(data.styleDescription ?? '');
      toast.success('Reference style captured');
    } catch (err) {
      setStyleDescription('');
      toast.error('Image analysis failed', { description: (err as Error).message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearReference = () => {
    if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl);
    setReferencePreviewUrl(null);
    setStyleDescription('');
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const useOverride = Boolean(fullPromptOverride?.trim());
      const res = await fetch('/api/brand-forge/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          generationStyle: selectedStyle,
          model: selectedModel,
          ...(useOverride
            ? { fullPromptOverride: fullPromptOverride!.trim() }
            : {
                ...(styleDescription.trim() ? { styleDescription: styleDescription.trim() } : {}),
                ...(customPrompt.trim() ? { customPrompt: customPrompt.trim() } : {}),
              }),
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof payload.error === 'string' ? payload.error : 'Generation failed';
        const details = typeof payload.details === 'string' ? payload.details : '';
        const retryAfter = typeof (payload as { retryAfter?: unknown }).retryAfter === 'number'
          ? (payload as { retryAfter: number }).retryAfter
          : null;
        const waitHint = retryAfter != null ? ` You can retry in about ${retryAfter} seconds.` : '';
        throw new Error(
          details ? `${msg} ${details}${waitHint}` : `${msg}${waitHint}`,
        );
      }

      const { concepts: newConcepts } = payload as { concepts?: typeof initialConcepts };
      if (!newConcepts?.length) {
        throw new Error('No concepts returned from server.');
      }
      setConcepts((prev) => dedupeConceptsById([...newConcepts, ...prev]));
      toast.success(`Generated ${newConcepts.length} concepts`);
    } catch (err) {
      toast.error('Generation failed', { description: (err as Error).message });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBrandKitNavigate = async () => {
    const ids = Array.from(selectedIds);
    setIsBrandKitNavigating(true);
    try {
      if (ids.length >= 1) {
        const result = await applyBrandKitLogoSlotsFromSelection(projectId, ids);
        if (result?.error) {
          toast.error('Could not apply logos to kit', { description: result.error });
          return;
        }
      }
      router.push(brandForgePath(studyId, projectId, 'brand-kit'));
    } finally {
      setIsBrandKitNavigating(false);
    }
  };

  const handleFavoriteToggle = (id: string, isFavorite: boolean) => {
    setConcepts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_favorite: isFavorite } : c))
    );
  };

  const handleClone = (cloned: BFLogoConcept) => {
    setConcepts((prev) => {
      if (prev.some((c) => c.id === cloned.id)) return prev;
      return [cloned, ...prev];
    });
    router.refresh();
  };

  const handleConceptDeleted = (id: string) => {
    setConcepts((prev) => prev.filter((c) => c.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleConceptUpdated = (id: string, patch: Partial<BFLogoConcept>) => {
    setConcepts((prev) =>
      dedupeConceptsById(prev.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    );
  };

  const handleBatchDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setIsBatchDeleting(true);
    try {
      let ok = 0;
      let fail = 0;
      for (const id of ids) {
        const result = await deleteLogoConcept(id);
        if (result?.error) {
          fail++;
        } else {
          ok++;
          setConcepts((prev) => prev.filter((c) => c.id !== id));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      }
      if (fail === 0) {
        toast.success(ok === 1 ? 'Deleted 1 concept' : `Deleted ${ok} concepts`);
      } else if (ok > 0) {
        toast.warning('Some concepts could not be deleted', {
          description: `${fail} failed. You can retry or remove them one at a time.`,
        });
      } else {
        toast.error('Could not delete concepts', { description: 'Try again or delete one at a time.' });
      }
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const batchDeleteProps =
    concepts.length > 0
      ? {
          selectedCount: selectedIds.size,
          isDeleting: isBatchDeleting,
          onConfirm: handleBatchDeleteSelected,
        }
      : undefined;

  if (concepts.length === 0 && !isGenerating) {
    return (
      <div className="space-y-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="rounded-full bg-muted p-4">
              <Palette className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-medium">No concepts yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Choose a logo style below, optionally add a reference image or extra instructions, then generate.
              </p>
            </div>
          </CardContent>
        </Card>

        <GenerationPanel
          showStyleCards
          showInlineGenerate
          selectedStyle={selectedStyle}
          onStyleChange={setSelectedStyle}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          customPrompt={customPrompt}
          onCustomPromptChange={setCustomPrompt}
          styleDescription={styleDescription}
          referencePreviewUrl={referencePreviewUrl}
          onReferenceFile={handleReferenceFile}
          onClearReference={handleClearReference}
          isAnalyzing={isAnalyzing}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          batchDelete={batchDeleteProps}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <GenerationPanel
        briefSummary={briefSummary}
        showStyleCards={false}
        showInlineGenerate={false}
        selectedStyle={selectedStyle}
        onStyleChange={setSelectedStyle}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        customPrompt={customPrompt}
        onCustomPromptChange={setCustomPrompt}
        styleDescription={styleDescription}
        referencePreviewUrl={referencePreviewUrl}
        onReferenceFile={handleReferenceFile}
        onClearReference={handleClearReference}
        isAnalyzing={isAnalyzing}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        batchDelete={batchDeleteProps}
      />

      {isGenerating && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating new concepts…
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {concepts.map((concept) => (
          <LogoConceptCard
            key={concept.id}
            concept={concept}
            isSelected={selectedIds.has(concept.id)}
            onToggleSelect={() => toggleSelect(concept.id)}
            onFavoriteToggle={handleFavoriteToggle}
            onClone={handleClone}
            onDeleted={handleConceptDeleted}
            onConceptUpdated={handleConceptUpdated}
          />
        ))}
      </div>

      <GalleryActionBar
        selectedCount={selectedIds.size}
        isGenerating={isGenerating}
        onGenerate={handleGenerate}
        hasAnyConcepts={concepts.length > 0}
        briefSummary={briefSummary}
        promptBase={promptBase}
        effectivePrompt={effectivePrompt}
        hasPromptOverride={fullPromptOverride != null}
        onPromptOverrideApply={(text) => setFullPromptOverride(text)}
        onPromptOverrideReset={() => setFullPromptOverride(null)}
        promptPreviewExtras={promptPreviewExtras}
        hasBrandKit={hasBrandKit}
        onBrandKitNavigate={handleBrandKitNavigate}
        isBrandKitNavigating={isBrandKitNavigating}
      />
    </div>
  );
}
