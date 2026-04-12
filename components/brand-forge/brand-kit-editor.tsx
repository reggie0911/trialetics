'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, Save, Check } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { saveBrandKit, generateBrandVoice, selectConcept } from '@/lib/actions/brand-forge';
import { FONT_PAIRINGS } from '@/lib/brand-forge/font-pairings';
import {
  colorSwatchUsageLabel,
  type BFLogoConcept,
  type BFBrandKit,
  type BFBrandInputs,
  type BFColorSwatch,
  type BFFontPairingSelection,
} from '@/lib/types/brand-forge';
import { cn } from '@/lib/utils';

const COLOR_USAGE_ROLES: BFColorSwatch['usage'][] = [
  'primary',
  'secondary',
  'accent',
  'neutral',
  'recruitment',
  'patient-facing',
];

/** Title-style label for logo concept options (trigger + list), not raw UUIDs. */
function humanizeLogoStylePreset(preset: string | undefined | null): string {
  const raw = preset?.trim();
  if (!raw) return 'Concept';
  return raw
    .replace(/[-_]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function logoConceptOptionLabel(c: BFLogoConcept): string {
  return `${humanizeLogoStylePreset(c.generation_metadata?.style_preset)} · ${c.id.slice(0, 8)}`;
}

interface BrandKitEditorProps {
  projectId: string;
  concepts: BFLogoConcept[];
  brandKit: BFBrandKit | null;
  brandInputs: BFBrandInputs | null;
  defaultColors: BFColorSwatch[];
}

export function BrandKitEditor({ projectId, concepts: initialConcepts, brandKit, brandInputs, defaultColors }: BrandKitEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);

  const [concepts, setConcepts] = useState<BFLogoConcept[]>(initialConcepts);
  const [uploadingSlot, setUploadingSlot] = useState<'primary' | 'secondary' | 'icon-mark' | null>(null);

  const [primaryConceptId, setPrimaryConceptId] = useState(brandKit?.primary_logo_concept_id ?? '');
  const [secondaryConceptId, setSecondaryConceptId] = useState(brandKit?.secondary_logo_concept_id ?? '');
  const [iconMarkConceptId, setIconMarkConceptId] = useState(brandKit?.icon_mark_concept_id ?? '');

  const [colorPalette, setColorPalette] = useState<BFColorSwatch[]>(() => {
    const fromKit = (brandKit?.color_palette as BFColorSwatch[]) ?? [];
    return fromKit.length ? fromKit : defaultColors;
  });
  const [fontPairingId, setFontPairingId] = useState(
    (brandKit?.font_pairing as BFFontPairingSelection)?.pairing_id ?? FONT_PAIRINGS[0].id
  );
  const [brandVoice, setBrandVoice] = useState(brandKit?.brand_voice_summary ?? '');
  const [usageGuidance, setUsageGuidance] = useState(brandKit?.usage_guidance ?? '');
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const selectedPairing = FONT_PAIRINGS.find((p) => p.id === fontPairingId) ?? FONT_PAIRINGS[0];

  const handleConceptSelect = async (conceptId: string, role: 'primary' | 'secondary' | 'icon-mark') => {
    const setters = { primary: setPrimaryConceptId, secondary: setSecondaryConceptId, 'icon-mark': setIconMarkConceptId };
    setters[role](conceptId);
    await selectConcept(projectId, conceptId, role);
  };

  const handleUpload = async (role: 'primary' | 'secondary' | 'icon-mark', file: File) => {
    setUploadingSlot(role);
    try {
      const form = new FormData();
      form.append('projectId', projectId);
      form.append('file', file);
      const res = await fetch('/api/brand-forge/upload-concept', { method: 'POST', body: form });
      const data = await res.json() as { concept?: BFLogoConcept; error?: string };
      if (!res.ok || !data.concept) {
        toast.error('Upload failed', { description: data.error ?? 'Unknown error' });
        return;
      }
      setConcepts((prev) => [...prev, data.concept!]);
      await handleConceptSelect(data.concept.id, role);
      router.refresh();
    } catch {
      toast.error('Upload failed', { description: 'Could not reach the server' });
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleGenerateVoice = async () => {
    setIsGeneratingVoice(true);
    try {
      const result = await generateBrandVoice(projectId);
      if ('error' in result) {
        toast.error('Failed to generate', { description: result.error });
      } else {
        setBrandVoice(result.brandVoice);
        setUsageGuidance(result.usageGuidance);
        toast.success('Brand voice generated');
      }
    } catch {
      toast.error('Failed to generate brand voice');
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveBrandKit(projectId, {
        color_palette: colorPalette,
        font_pairing: { pairing_id: fontPairingId },
        brand_voice_summary: brandVoice,
        usage_guidance: usageGuidance,
      });
      if (result?.error) {
        toast.error('Failed to save', { description: result.error });
      } else {
        toast.success('Brand kit saved');
        router.refresh();
      }
    });
  };

  const copyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1500);
  };

  const updateColor = (index: number, field: keyof BFColorSwatch, value: string) => {
    setColorPalette((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const addColor = () => {
    if (colorPalette.length < 8) {
      setColorPalette((prev) => [...prev, { name: `Color ${prev.length + 1}`, hex: '#888888', usage: 'neutral' }]);
    }
  };

  const removeColor = (index: number) => {
    setColorPalette((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Logo slots */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Logo assignments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(['primary', 'secondary', 'icon-mark'] as const).map((role) => {
            const currentId = role === 'primary' ? primaryConceptId : role === 'secondary' ? secondaryConceptId : iconMarkConceptId;
            const label = role === 'primary' ? 'Primary logo' : role === 'secondary' ? 'Secondary logo' : 'Icon mark';
            const currentConcept = concepts.find((c) => c.id === currentId);
            return (
              <div key={role} className="flex items-center gap-4">
                <div className="w-20 h-20 bg-muted/30 rounded-md flex items-center justify-center border overflow-hidden shrink-0">
                  {currentConcept?.thumbnail_url ? (
                    <img src={currentConcept.thumbnail_url} alt={label} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor={`brand-kit-logo-slot-${role}`} className="text-[12px] font-normal">
                    {label}
                  </Label>
                  <div className="flex gap-2">
                    <Select value={currentId} onValueChange={(v) => handleConceptSelect(v, role)}>
                      <SelectTrigger id={`brand-kit-logo-slot-${role}`} className="h-9 text-[12px] flex-1 min-w-0">
                        <SelectValue
                          placeholder="Select a concept"
                          getDisplayLabel={(v) => {
                            if (v == null || v === '') return null;
                            const c = concepts.find((x) => x.id === v);
                            if (!c) return 'Unknown concept';
                            return logoConceptOptionLabel(c);
                          }}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {concepts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {logoConceptOptionLabel(c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input
                      type="file"
                      id={`upload-concept-${role}`}
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(role, f);
                        e.target.value = '';
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0 text-[12px] px-3"
                      disabled={uploadingSlot === role}
                      onClick={() => document.getElementById(`upload-concept-${role}`)?.click()}
                    >
                      {uploadingSlot === role ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Upload'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Color palette */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Color palette</CardTitle>
          <Button variant="outline" size="sm" onClick={addColor} disabled={colorPalette.length >= 8}>
            Add color
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {colorPalette.map((color, i) => (
              <div key={i} className="flex items-center gap-3 p-2 border rounded-md">
                <button
                  type="button"
                  className="w-10 h-10 rounded-md border shrink-0"
                  style={{ backgroundColor: color.hex }}
                  onClick={() => copyHex(color.hex)}
                  title="Copy hex"
                >
                  {copiedHex === color.hex && <Check className="h-4 w-4 text-white m-auto drop-shadow" />}
                </button>
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="space-y-1">
                    <Label htmlFor={`brand-kit-swatch-name-${i}`} className="text-[12px] font-normal text-foreground">
                      Color name
                    </Label>
                    <Input
                      id={`brand-kit-swatch-name-${i}`}
                      value={color.name}
                      onChange={(e) => updateColor(i, 'name', e.target.value)}
                      className="h-9 text-[12px]"
                      placeholder="e.g. Trust blue"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="space-y-1 w-24 shrink-0">
                      <Label htmlFor={`brand-kit-swatch-hex-${i}`} className="text-[12px] font-normal text-foreground">
                        Hex
                      </Label>
                      <Input
                        id={`brand-kit-swatch-hex-${i}`}
                        value={color.hex}
                        onChange={(e) => updateColor(i, 'hex', e.target.value)}
                        className="h-9 text-[12px] w-full"
                        placeholder="#3366CC"
                      />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <Label htmlFor={`brand-kit-swatch-role-${i}`} className="text-[12px] font-normal text-foreground">
                        Role
                      </Label>
                      <Select value={color.usage} onValueChange={(v) => updateColor(i, 'usage', v)}>
                        <SelectTrigger id={`brand-kit-swatch-role-${i}`} className="h-9 text-[12px] w-full min-w-0">
                          <SelectValue
                            getDisplayLabel={(v) => colorSwatchUsageLabel(v)}
                            placeholder="Select role"
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {COLOR_USAGE_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {colorSwatchUsageLabel(role)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => removeColor(i)} className="text-xs text-muted-foreground hover:text-destructive">
                  &times;
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Font pairing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Font pairing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FONT_PAIRINGS.map((pairing) => (
              <Card
                key={pairing.id}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary/40',
                  fontPairingId === pairing.id && 'border-primary ring-2 ring-primary/20',
                )}
                onClick={() => setFontPairingId(pairing.id)}
              >
                <CardContent className="p-3 space-y-2">
                  <div>
                    <p className="text-sm font-semibold">{pairing.primary}</p>
                    <p className="text-xs text-muted-foreground">{pairing.secondary}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{pairing.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {pairing.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0">{tag}</Badge>
                    ))}
                  </div>
                  {pairing.primaryAlt && (
                    <p className="text-[9px] text-muted-foreground italic">
                      Alt: {pairing.primaryAlt} + {pairing.secondaryAlt}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Preview */}
          <div className="mt-4 p-4 border rounded-md space-y-2">
            <p className="text-lg font-semibold">{brandInputs?.brand_name || 'Brand Name'}</p>
            <p className="text-sm text-muted-foreground">
              Using {selectedPairing.primary} for headings and {selectedPairing.secondary} for body text.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Brand voice */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Brand voice</CardTitle>
          <Button variant="outline" size="sm" onClick={handleGenerateVoice} disabled={isGeneratingVoice}>
            {isGeneratingVoice ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />Generate with AI</>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <Textarea
            value={brandVoice}
            onChange={(e) => setBrandVoice(e.target.value)}
            placeholder="Describe your brand's tone, personality, and communication style…"
            rows={6}
            className="text-[12px]"
          />
        </CardContent>
      </Card>

      {/* Usage guidance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Usage guidance</CardTitle>
          <Button variant="outline" size="sm" onClick={handleGenerateVoice} disabled={isGeneratingVoice}>
            {isGeneratingVoice ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />Generate with AI</>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <Textarea
            value={usageGuidance}
            onChange={(e) => setUsageGuidance(e.target.value)}
            placeholder="Do's and don'ts for logo usage, color application, typography rules…"
            rows={8}
            className="text-[12px]"
          />
        </CardContent>
      </Card>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-end px-6 py-3 max-w-7xl mx-auto gap-2">
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Save brand kit</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
