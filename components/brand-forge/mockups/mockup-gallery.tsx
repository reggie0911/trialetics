'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Download,
  ImageIcon,
  Info,
  Loader2,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { MOCKUP_CUSTOM_HINT_MAX_LENGTH, MOCKUP_PROMPT_MAX_LENGTH } from '@/lib/brand-forge/mockup-prompt';
import { deleteMockup, toggleMockupFavorite, updateMockupPrompt } from '@/lib/actions/brand-forge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  MOCKUP_CATEGORIES,
  MOCKUP_TYPES,
  type BFMockup,
  type MockupCategoryId,
  type MockupTypeConfig,
} from '@/lib/types/brand-forge';

export interface LogoReferenceOption {
  id: string;
  label: string;
}

interface MockupGalleryProps {
  projectId: string;
  mockups: BFMockup[];
  signedUrlMap: Record<string, string>;
  hasLogo: boolean;
  /** Brand kit primary concept id — passed through to the API so generation uses the same artwork as the preview. */
  primaryLogoConceptId?: string | null;
  primaryLogoPreviewUrl?: string | null;
  logoReferenceOptions?: LogoReferenceOption[];
}

type MockupPreviewResponse = {
  prompt: string;
  mockupLabel: string;
  aspectRatio: string;
  aspectRatioLabel: string;
  usesPrimaryLogo: boolean;
  categoryLabel: string;
};

const PRIMARY_REFERENCE = '__primary__';
const PREVIEW_CACHE_TTL_MS = 5000;

const ASPECT_LABEL: Record<string, string> = {
  '1:1': 'Square',
  '16:9': 'Landscape',
  '9:16': 'Portrait',
  '3:4': 'Portrait',
};

function mockupLabel(typeId: string): string {
  return MOCKUP_TYPES.find((t) => t.id === typeId)?.label ?? typeId;
}

function categoryLabel(catId: string): string {
  return MOCKUP_CATEGORIES.find((c) => c.id === catId)?.label ?? catId;
}

export function MockupGallery({
  projectId,
  mockups: initialMockups,
  signedUrlMap: initialSignedUrlMap,
  hasLogo,
  primaryLogoConceptId = null,
  primaryLogoPreviewUrl = null,
  logoReferenceOptions = [],
}: MockupGalleryProps) {
  const router = useRouter();

  const [showFull, setShowFull] = useState(false);
  const [customHint, setCustomHint] = useState('');
  const [generatingTypes, setGeneratingTypes] = useState<Set<string>>(new Set());
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BFMockup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterCategory, setFilterCategory] = useState<MockupCategoryId | 'all'>('all');
  const [filterFavOnly, setFilterFavOnly] = useState(false);
  const [collapsedCats, setCollapsedCats] = useState<Set<MockupCategoryId>>(new Set());
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  const [generatorModalTypeId, setGeneratorModalTypeId] = useState<string | null>(null);
  const [generatorDraftPrompt, setGeneratorDraftPrompt] = useState('');
  const [generatorReferenceId, setGeneratorReferenceId] = useState(PRIMARY_REFERENCE);
  const [generatorPreviewMeta, setGeneratorPreviewMeta] = useState<Pick<
    MockupPreviewResponse,
    'mockupLabel' | 'aspectRatioLabel' | 'usesPrimaryLogo' | 'categoryLabel'
  > | null>(null);
  const [generatorPreviewLoading, setGeneratorPreviewLoading] = useState(false);
  const [generatorPreviewError, setGeneratorPreviewError] = useState<string | null>(null);

  const [galleryEditMockup, setGalleryEditMockup] = useState<BFMockup | null>(null);
  const [galleryDraftPrompt, setGalleryDraftPrompt] = useState('');
  const [galleryDraftHint, setGalleryDraftHint] = useState('');
  const [gallerySavePending, setGallerySavePending] = useState(false);
  const [generatorPreviewNonce, setGeneratorPreviewNonce] = useState(0);

  const previewCacheRef = useRef<Map<string, { at: number; data: MockupPreviewResponse }>>(new Map());

  const [mockups, setMockups] = useState(initialMockups);
  const [signedUrlMap, setSignedUrlMap] = useState(initialSignedUrlMap);

  const serverMockupIdsKey = [...initialMockups].map((m) => m.id).sort().join(',');
  useEffect(() => {
    setMockups(initialMockups);
    setSignedUrlMap(initialSignedUrlMap);
  }, [projectId, serverMockupIdsKey]);

  const referenceSelectItems = useMemo(
    () => [
      { value: PRIMARY_REFERENCE, label: 'Brand kit primary logo' },
      ...logoReferenceOptions.map((o) => ({ value: o.id, label: o.label })),
    ],
    [logoReferenceOptions],
  );

  const visibleTypes = showFull ? MOCKUP_TYPES : MOCKUP_TYPES.filter((t) => t.mvp);
  const typesByCategory = MOCKUP_CATEGORIES.map((cat) => ({
    ...cat,
    types: visibleTypes.filter((t) => t.category === cat.id),
  })).filter((g) => g.types.length > 0);

  const filteredMockups = mockups.filter((m) => {
    if (filterFavOnly && !m.is_favorite) return false;
    if (filterCategory !== 'all') {
      const cfg = MOCKUP_TYPES.find((t) => t.id === m.mockup_type);
      if (cfg && cfg.category !== filterCategory) return false;
    }
    return true;
  });

  const toggleCollapse = (cat: MockupCategoryId) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const previewCacheKey = (typeId: string, refId: string) =>
    `${projectId}|${typeId}|${customHint.trim()}|${refId}`;

  const showReferenceSelector = hasLogo || logoReferenceOptions.length > 0;

  useEffect(() => {
    if (!generatorModalTypeId) return;
    const typeId = generatorModalTypeId;
    const refId = generatorReferenceId;
    const key = previewCacheKey(typeId, refId);
    const now = Date.now();
    const cached = previewCacheRef.current.get(key);
    if (cached && now - cached.at < PREVIEW_CACHE_TTL_MS) {
      setGeneratorDraftPrompt(cached.data.prompt);
      setGeneratorPreviewMeta({
        mockupLabel: cached.data.mockupLabel,
        aspectRatioLabel: cached.data.aspectRatioLabel,
        usesPrimaryLogo: cached.data.usesPrimaryLogo,
        categoryLabel: cached.data.categoryLabel,
      });
      setGeneratorPreviewLoading(false);
      setGeneratorPreviewError(null);
      return;
    }

    const ac = new AbortController();
    setGeneratorPreviewLoading(true);
    setGeneratorPreviewError(null);

    void (async () => {
      try {
        const res = await fetch('/api/brand-forge/mockup-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            mockupType: typeId,
            customHint: customHint.trim() || undefined,
            referenceConceptId:
              refId === PRIMARY_REFERENCE ? primaryLogoConceptId ?? undefined : refId,
          }),
          signal: ac.signal,
        });
        const data = (await res.json().catch(() => ({}))) as MockupPreviewResponse & { error?: string };
        if (ac.signal.aborted) return;
        if (!res.ok) {
          throw new Error(data.error || `Preview failed (${res.status})`);
        }
        previewCacheRef.current.set(key, { at: Date.now(), data: data as MockupPreviewResponse });
        setGeneratorDraftPrompt(data.prompt);
        setGeneratorPreviewMeta({
          mockupLabel: data.mockupLabel,
          aspectRatioLabel: data.aspectRatioLabel,
          usesPrimaryLogo: data.usesPrimaryLogo,
          categoryLabel: data.categoryLabel,
        });
      } catch (e) {
        if (ac.signal.aborted) return;
        setGeneratorPreviewError(e instanceof Error ? e.message : 'Preview failed');
      } finally {
        if (!ac.signal.aborted) setGeneratorPreviewLoading(false);
      }
    })();

    return () => ac.abort();
  }, [
    generatorModalTypeId,
    generatorReferenceId,
    customHint,
    generatorPreviewNonce,
    projectId,
    primaryLogoConceptId,
  ]);

  const openGeneratorModal = (typeId: string) => {
    setGeneratorModalTypeId(typeId);
    setGeneratorReferenceId(PRIMARY_REFERENCE);
    setGeneratorPreviewMeta(null);
    setGeneratorDraftPrompt('');
    setGeneratorPreviewError(null);
  };

  const handleGeneratorResetDefaults = () => {
    if (!generatorModalTypeId) return;
    previewCacheRef.current.delete(previewCacheKey(generatorModalTypeId, generatorReferenceId));
    setGeneratorPreviewNonce((n) => n + 1);
  };

  const generateOne = async (
    typeId: string,
    options?: {
      skipRefresh?: boolean;
      promptOverride?: string;
      referenceConceptId?: string;
      closeGeneratorModal?: boolean;
    },
  ) => {
    setGeneratingTypes((prev) => new Set(prev).add(typeId));
    try {
      const body: Record<string, unknown> = {
        projectId,
        mockupType: typeId,
        customHint: customHint.trim() || undefined,
      };
      if (options?.promptOverride != null) {
        body.promptOverride = options.promptOverride;
      }
      const explicitRef = options?.referenceConceptId;
      const resolvedRef =
        explicitRef != null && String(explicitRef).trim() !== ''
          ? String(explicitRef).trim()
          : primaryLogoConceptId ?? undefined;
      if (resolvedRef) {
        body.referenceConceptId = resolvedRef;
      }

      const res = await fetch('/api/brand-forge/generate-mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        mockupType?: string;
        storagePath?: string;
        url?: string;
        error?: string;
        prompt?: string;
        customHint?: string | null;
      };
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      if (!data.id || !data.storagePath) {
        throw new Error(data.error || 'Invalid response from server');
      }
      const newMockup: BFMockup = {
        id: data.id,
        project_id: projectId,
        mockup_type: typeId,
        storage_path: data.storagePath,
        prompt: data.prompt ?? null,
        custom_hint: data.customHint ?? null,
        is_favorite: false,
        created_at: new Date().toISOString(),
      };
      setMockups((prev) => [newMockup, ...prev]);
      const signedPath = data.storagePath;
      if (data.url && signedPath) {
        setSignedUrlMap((prev) => ({ ...prev, [signedPath]: data.url! }));
      }
      toast.success(`${mockupLabel(typeId)} generated`);
      if (options?.closeGeneratorModal) {
        setGeneratorModalTypeId(null);
      }
      if (!options?.skipRefresh) {
        router.refresh();
      }
    } catch (err) {
      toast.error(`Failed: ${mockupLabel(typeId)}`, {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setGeneratingTypes((prev) => {
        const next = new Set(prev);
        next.delete(typeId);
        return next;
      });
    }
  };

  const generateFromGeneratorModal = () => {
    if (!generatorModalTypeId) return;
    const ref =
      generatorReferenceId === PRIMARY_REFERENCE ? undefined : generatorReferenceId;
    void generateOne(generatorModalTypeId, {
      promptOverride: generatorDraftPrompt,
      ...(ref !== undefined ? { referenceConceptId: ref } : {}),
      closeGeneratorModal: true,
    });
  };

  const openGalleryEditModal = (m: BFMockup) => {
    setGalleryEditMockup(m);
    setGalleryDraftPrompt(m.prompt ?? '');
    setGalleryDraftHint(m.custom_hint ?? '');
  };

  const handleGallerySave = async () => {
    if (!galleryEditMockup) return;
    const prev = galleryEditMockup;
    const nextPrompt = galleryDraftPrompt.trim() === '' ? null : galleryDraftPrompt.trim();
    const nextHint = galleryDraftHint.trim() === '' ? null : galleryDraftHint.trim();
    setGallerySavePending(true);
    setMockups((list) =>
      list.map((m) =>
        m.id === prev.id ? { ...m, prompt: nextPrompt, custom_hint: nextHint } : m,
      ),
    );
    const result = await updateMockupPrompt(projectId, prev.id, {
      prompt: nextPrompt,
      custom_hint: nextHint,
    });
    setGallerySavePending(false);
    if (result.error) {
      setMockups((list) => list.map((m) => (m.id === prev.id ? prev : m)));
      toast.error(result.error);
      return;
    }
    toast.success('Details saved');
    setGalleryEditMockup(null);
    router.refresh();
  };

  const batchGenerate = async (types: MockupTypeConfig[]) => {
    setBatchProgress({ current: 0, total: types.length });
    for (let i = 0; i < types.length; i++) {
      setBatchProgress({ current: i + 1, total: types.length });
      await generateOne(types[i].id, { skipRefresh: true });
      if (i < types.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    setBatchProgress(null);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const result = await deleteMockup(projectId, deleteTarget.id);
    setIsDeleting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setMockups((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    toast.success('Mockup deleted');
    setDeleteTarget(null);
  };

  const handleToggleFav = async (mockup: BFMockup) => {
    const next = !mockup.is_favorite;
    setMockups((prev) =>
      prev.map((m) => (m.id === mockup.id ? { ...m, is_favorite: next } : m)),
    );
    const result = await toggleMockupFavorite(mockup.id, next);
    if (result.error) {
      setMockups((prev) =>
        prev.map((m) => (m.id === mockup.id ? { ...m, is_favorite: !next } : m)),
      );
      toast.error(result.error);
    }
  };

  const downloadZip = async (favOnly: boolean) => {
    setIsDownloadingZip(true);
    try {
      const params = new URLSearchParams({ projectId });
      if (favOnly) params.set('favorites', '1');
      const res = await fetch(`/api/brand-forge/export-mockups?${params.toString()}`);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mockups.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('ZIP downloaded');
    } catch (err) {
      toast.error('Failed to download ZIP', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const isAnyGenerating = generatingTypes.size > 0 || batchProgress !== null;
  const generatorModalGenerating =
    generatorModalTypeId != null && generatingTypes.has(generatorModalTypeId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Study Material Mockups</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Generate branded previews for study materials, marketing collateral, and branded assets.
        </p>
      </div>

      {hasLogo && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3 w-3 shrink-0" />
          <span>
            Your brand kit primary logo file (PNG, or SVG if there is no PNG) is used as reference artwork in each
            mockup. Without it, mockups use your study name and colors only.
          </span>
        </div>
      )}

      {/* Controls */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-xs">Generate Mockups</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => setShowFull((p) => !p)}
              >
                {showFull ? 'Show MVP set' : 'Show full catalog'}
              </Button>
              <Button
                size="sm"
                className="text-xs h-7"
                disabled={isAnyGenerating}
                onClick={() => void batchGenerate(MOCKUP_TYPES.filter((t) => t.mvp))}
              >
                {batchProgress ? (
                  <>
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    {batchProgress.current}/{batchProgress.total}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-3 w-3" />
                    Generate MVP set
                  </>
                )}
              </Button>
              {showFull && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  disabled={isAnyGenerating}
                  onClick={() => void batchGenerate(MOCKUP_TYPES)}
                >
                  <Sparkles className="mr-1.5 h-3 w-3" />
                  Generate full set
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-md">
            <Label htmlFor="mockup-hint" className="text-xs">
              Additional emphasis (optional)
            </Label>
            <Input
              id="mockup-hint"
              className="text-xs h-8"
              placeholder="e.g. Use softer colors, include Japanese text"
              value={customHint}
              maxLength={MOCKUP_CUSTOM_HINT_MAX_LENGTH}
              onChange={(e) => setCustomHint(e.target.value)}
              disabled={isAnyGenerating}
            />
          </div>
          <p className="text-[10px] text-muted-foreground max-w-xl">
            Bulk actions (MVP set / full catalog) use your additional emphasis and default prompts only—not per-mockup
            edits from the info dialog.
          </p>

          {typesByCategory.map((group) => (
            <div key={group.id}>
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
                onClick={() => toggleCollapse(group.id)}
              >
                {collapsedCats.has(group.id) ? (
                  <ChevronRight className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                {group.label}
                <Badge variant="secondary" className="text-[10px] ml-1">
                  {group.types.length}
                </Badge>
              </button>
              {!collapsedCats.has(group.id) && (
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {group.types.map((t) => {
                    const isGen = generatingTypes.has(t.id);
                    return (
                      <div
                        key={t.id}
                        className="relative rounded-md border border-border hover:border-primary/40 transition-colors"
                      >
                        <button
                          type="button"
                          className="absolute top-1 right-1 z-10 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50"
                          aria-label="View and edit image prompt"
                          disabled={isAnyGenerating}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openGeneratorModal(t.id);
                          }}
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isAnyGenerating}
                          className="w-full rounded-[inherit] p-2 pr-8 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => void generateOne(t.id)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-medium truncate">{t.label}</span>
                            {t.mvp && (
                              <Badge variant="outline" className="text-[9px] shrink-0 ml-1">
                                MVP
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight mb-1.5">
                            {t.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-[9px]">
                              {ASPECT_LABEL[t.aspectRatio] ?? t.aspectRatio}
                            </Badge>
                            {isGen && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Gallery filters */}
      {mockups.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Filter:</span>
          <Button
            variant={filterCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-7"
            onClick={() => setFilterCategory('all')}
          >
            All
          </Button>
          {MOCKUP_CATEGORIES.map((cat) => {
            const count = mockups.filter((m) => {
              const cfg = MOCKUP_TYPES.find((t) => t.id === m.mockup_type);
              return cfg?.category === cat.id;
            }).length;
            if (count === 0) return null;
            return (
              <Button
                key={cat.id}
                variant={filterCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7"
                onClick={() => setFilterCategory(cat.id)}
              >
                {cat.label} ({count})
              </Button>
            );
          })}
          <Button
            variant={filterFavOnly ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-7"
            onClick={() => setFilterFavOnly((p) => !p)}
          >
            <Star className="mr-1 h-3 w-3" />
            Favorites
          </Button>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              disabled={isDownloadingZip || mockups.length === 0}
              onClick={() => void downloadZip(false)}
            >
              {isDownloadingZip ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Archive className="mr-1 h-3 w-3" />}
              Download all
            </Button>
            {mockups.some((m) => m.is_favorite) && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                disabled={isDownloadingZip}
                onClick={() => void downloadZip(true)}
              >
                <Star className="mr-1 h-3 w-3" />
                Download favorites
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Gallery grid */}
      {filteredMockups.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredMockups.map((m) => {
            const url = signedUrlMap[m.storage_path];
            const cfg = MOCKUP_TYPES.find((t) => t.id === m.mockup_type);
            return (
              <Card key={m.id} className="overflow-hidden">
                {url && (
                  <div className="relative bg-muted">
                    <img
                      src={url}
                      alt={mockupLabel(m.mockup_type)}
                      className="w-full object-contain"
                      style={{
                        aspectRatio:
                          cfg?.aspectRatio === '1:1'
                            ? '1/1'
                            : cfg?.aspectRatio === '16:9'
                              ? '16/9'
                              : cfg?.aspectRatio === '9:16'
                                ? '9/16'
                                : '3/4',
                      }}
                    />
                  </div>
                )}
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-medium truncate">{mockupLabel(m.mockup_type)}</span>
                      {cfg && (
                        <Badge variant="secondary" className="text-[9px] shrink-0">
                          {categoryLabel(cfg.category)}
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(m.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-7 w-7"
                            onClick={() => openGalleryEditModal(m)}
                          />
                        }
                      >
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[11px]">
                        Prompt and notes
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-7 w-7"
                            onClick={() => void handleToggleFav(m)}
                          />
                        }
                      >
                        <Star
                          className={`h-3.5 w-3.5 ${m.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[11px]">
                        {m.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                      </TooltipContent>
                    </Tooltip>
                    {url && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <a href={url} target="_blank" rel="noopener noreferrer" download className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent hover:text-accent-foreground" />
                          }
                        >
                          <Download className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-[11px]">
                          Download
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-7 w-7"
                            onClick={() => setDeleteTarget(m)}
                          />
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[11px]">
                        Delete
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : mockups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="rounded-full bg-muted p-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-xs font-medium">No mockups yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Generate branded previews for study materials. Start with the MVP set or pick individual types above.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-8">
          No mockups match the current filters.
        </p>
      )}

      <Dialog
        open={!!generatorModalTypeId}
        onOpenChange={(open) => {
          if (!open) setGeneratorModalTypeId(null);
        }}
      >
        <DialogContent className="sm:max-w-lg gap-4 max-h-[90vh] overflow-y-auto" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-base">
              {generatorPreviewMeta?.mockupLabel ?? mockupLabel(generatorModalTypeId ?? '')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review or edit the image prompt before generating. This does not change your brand kit.
            </DialogDescription>
          </DialogHeader>

          {generatorPreviewMeta && (
            <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
              <span>Category: {generatorPreviewMeta.categoryLabel}</span>
              <span>Image size: {generatorPreviewMeta.aspectRatioLabel}</span>
            </div>
          )}

          {showReferenceSelector && (
            <div className="space-y-1.5">
              <Label className="text-xs">Reference artwork</Label>
              <Select
                value={generatorReferenceId}
                onValueChange={setGeneratorReferenceId}
                items={referenceSelectItems}
              >
                <SelectTrigger size="sm" className="w-full min-w-0 text-xs h-8">
                  <SelectValue
                    placeholder="Choose artwork"
                    getDisplayLabel={(v) =>
                      referenceSelectItems.find((i) => i.value === (v ?? ''))?.label ?? 'Choose artwork'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {referenceSelectItems.map((item) => (
                    <SelectItem key={item.value} value={item.value} className="text-xs">
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Shown on mockups that support a logo reference (Flux Kontext). Other artwork uses the same study context
                without this image.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Reference preview</Label>
            {generatorPreviewMeta?.usesPrimaryLogo && generatorReferenceId === PRIMARY_REFERENCE && primaryLogoPreviewUrl ? (
              <div className="flex items-center gap-3 rounded-md border border-border p-2 bg-muted/20">
                <img
                  src={primaryLogoPreviewUrl}
                  alt="Primary logo"
                  className="h-14 w-14 object-contain rounded border bg-background"
                />
                <p className="text-[10px] text-muted-foreground">
                  Brand kit primary logo file will be sent to the model as reference artwork.
                </p>
              </div>
            ) : generatorPreviewMeta?.usesPrimaryLogo ? (
              <p className="text-[10px] text-muted-foreground">
                The selected saved artwork (PNG) will be used as reference for this mockup. Thumbnails for other
                concepts are not shown here; generation uses the stored file for that artwork.
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                No reference logo image for this run—only your study name and colors guide the result.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="generator-prompt" className="text-xs">
              Image prompt
            </Label>
            {generatorPreviewLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading preview…
              </div>
            ) : generatorPreviewError ? (
              <p className="text-xs text-destructive">{generatorPreviewError}</p>
            ) : (
              <Textarea
                id="generator-prompt"
                className="text-xs min-h-[140px] resize-y"
                value={generatorDraftPrompt}
                maxLength={MOCKUP_PROMPT_MAX_LENGTH}
                onChange={(e) => setGeneratorDraftPrompt(e.target.value)}
              />
            )}
            <p className="text-[10px] text-muted-foreground">
              {generatorDraftPrompt.length}/{MOCKUP_PROMPT_MAX_LENGTH} characters
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              disabled={generatorPreviewLoading}
              onClick={() => handleGeneratorResetDefaults()}
            >
              Reset to default
            </Button>
            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setGeneratorModalTypeId(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="text-xs gap-1.5"
                aria-busy={generatorModalGenerating}
                disabled={
                  isAnyGenerating ||
                  generatorPreviewLoading ||
                  !!generatorPreviewError ||
                  !generatorDraftPrompt.trim()
                }
                onClick={() => generateFromGeneratorModal()}
              >
                {generatorModalGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
                    Generating…
                  </>
                ) : (
                  'Generate with this prompt'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!galleryEditMockup}
        onOpenChange={(open) => {
          if (!open && !gallerySavePending) setGalleryEditMockup(null);
        }}
      >
        <DialogContent className="sm:max-w-lg gap-4" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-base">
              {galleryEditMockup ? mockupLabel(galleryEditMockup.mockup_type) : 'Mockup details'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update saved text for records and ZIP exports. This does not change the image file.
            </DialogDescription>
          </DialogHeader>

          {galleryEditMockup && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="gallery-prompt" className="text-xs">
                  Image prompt
                </Label>
                {!galleryEditMockup.prompt?.trim() && galleryDraftPrompt.trim() === '' ? (
                  <p className="text-[10px] text-muted-foreground mb-1">
                    No image prompt was stored for this preview. You can add one below.
                  </p>
                ) : null}
                <Textarea
                  id="gallery-prompt"
                  className="text-xs min-h-[120px]"
                  value={galleryDraftPrompt}
                  maxLength={MOCKUP_PROMPT_MAX_LENGTH}
                  onChange={(e) => setGalleryDraftPrompt(e.target.value)}
                  placeholder="Describe what was sent to the image model…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gallery-hint" className="text-xs">
                  Additional notes
                </Label>
                <Textarea
                  id="gallery-hint"
                  className="text-xs min-h-[64px]"
                  value={galleryDraftHint}
                  maxLength={MOCKUP_CUSTOM_HINT_MAX_LENGTH}
                  onChange={(e) => setGalleryDraftHint(e.target.value)}
                  placeholder="Optional emphasis or internal notes…"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                This updates the saved description only—the PNG is unchanged.
              </p>
            </>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              disabled={gallerySavePending}
              onClick={() => setGalleryEditMockup(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="text-xs"
              disabled={gallerySavePending || !galleryEditMockup}
              onClick={() => void handleGallerySave()}
            >
              {gallerySavePending ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this mockup?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <span className="block font-medium text-foreground">{mockupLabel(deleteTarget.mockup_type)}</span>
              )}
              This permanently removes the mockup image. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
