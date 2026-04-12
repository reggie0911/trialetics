'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImageIcon, Loader2, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { saveAdditionalImageryGuidelines } from '@/lib/actions/brand-forge';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { BFBrandDirection } from '@/lib/types/brand-forge';

interface ImageryGuideProps {
  projectId: string;
  brandDirection: Pick<BFBrandDirection, 'icon_style' | 'imagery_direction'> | null;
  initialAdditionalImageryGuidelines: string | null;
}

export function ImageryGuide({
  projectId,
  brandDirection,
  initialAdditionalImageryGuidelines,
}: ImageryGuideProps) {
  const router = useRouter();
  const [guidelines, setGuidelines] = useState(() => initialAdditionalImageryGuidelines ?? '');
  const [focusHint, setFocusHint] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [overwriteOpen, setOverwriteOpen] = useState(false);

  useEffect(() => {
    setGuidelines(initialAdditionalImageryGuidelines ?? '');
  }, [initialAdditionalImageryGuidelines]);

  const runGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/brand-forge/generate-imagery-guidelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          focus: focusHint.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; guidelines?: string };
      if (!res.ok) {
        const msg =
          typeof data.error === 'string' && data.error.length > 0
            ? data.error
            : `Request failed (${res.status})`;
        throw new Error(msg);
      }
      if (typeof data.guidelines !== 'string' || !data.guidelines.trim()) {
        throw new Error('No guidelines returned');
      }
      setGuidelines(data.guidelines);
      toast.success('Guidelines generated');
    } catch (err) {
      const description = err instanceof Error ? err.message : 'Something went wrong';
      toast.error('Could not generate guidelines', { description });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateClick = () => {
    if (guidelines.trim().length > 0) {
      setOverwriteOpen(true);
      return;
    }
    void runGenerate();
  };

  const handleConfirmOverwrite = () => {
    setOverwriteOpen(false);
    void runGenerate();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await saveAdditionalImageryGuidelines(projectId, guidelines);
      if (result.error) {
        toast.error('Could not save guidelines', { description: result.error });
        return;
      }
      toast.success('Guidelines saved');
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Imagery Guide</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Visual guidance for photography, illustrations, and icons used in study materials.
        </p>
      </div>

      {brandDirection ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {brandDirection.icon_style && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Icon Style</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">{brandDirection.icon_style}</p>
              </CardContent>
            </Card>
          )}

          {brandDirection.imagery_direction && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Imagery Direction</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">{brandDirection.imagery_direction}</p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="rounded-full bg-muted p-3">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-xs font-medium">No imagery direction yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Generate a brand direction from the Overview page to get AI-powered imagery guidance.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs">Custom Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label htmlFor="imagery-focus-hint" className="text-xs">
                Emphasis for this generation (optional)
              </Label>
              <Input
                id="imagery-focus-hint"
                className="text-xs h-8"
                placeholder="e.g. Patient brochure hero imagery"
                value={focusHint}
                onChange={(e) => setFocusHint(e.target.value)}
                disabled={isGenerating}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="text-xs h-8"
                onClick={handleGenerateClick}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" aria-hidden />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-3 w-3" aria-hidden />
                    Generate guidelines
                  </>
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-xs h-8"
                onClick={() => void handleSave()}
                disabled={isSaving || isGenerating}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-3 w-3" aria-hidden />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imagery-additional-guidelines" className="text-xs">
              Additional imagery guidelines for this study
            </Label>
            <Textarea
              id="imagery-additional-guidelines"
              className="text-xs min-h-[80px]"
              placeholder="e.g. Use diverse patient populations. Avoid stock photos that look too generic. Prefer clinical settings over lab imagery."
              value={guidelines}
              onChange={(e) => setGuidelines(e.target.value)}
              disabled={isGenerating}
            />
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={overwriteOpen} onOpenChange={setOverwriteOpen}>
        <AlertDialogContent className="gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Replace existing guidelines?</AlertDialogTitle>
            <AlertDialogDescription>
              Generated text will replace what is currently in the box. You can still cancel and copy your notes
              elsewhere first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction className="text-xs" onClick={handleConfirmOverwrite}>
              Replace and generate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
