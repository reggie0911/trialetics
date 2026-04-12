'use client';

import { useState, useTransition } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { saveBrandKit } from '@/lib/actions/brand-forge';
import { colorSwatchUsageLabel, type BFBrandKit, type BFColorSwatch } from '@/lib/types/brand-forge';

interface ColorPaletteEditorProps {
  projectId: string;
  brandKit: BFBrandKit | null;
  suggestedPalette: BFColorSwatch[];
}

const USAGE_ROLES: BFColorSwatch['usage'][] = ['primary', 'secondary', 'accent', 'neutral', 'recruitment', 'patient-facing'];

function getContrastRatio(hex1: string, hex2: string): number {
  const luminance = (hex: string) => {
    const rgb = hex.replace('#', '').match(/.{2}/g)!.map((c) => {
      const v = parseInt(c, 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function WcagBadge({ ratio }: { ratio: number }) {
  const aaa = ratio >= 7;
  const aa = ratio >= 4.5;
  if (aaa) return <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">AAA</Badge>;
  if (aa) return <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-300">AA</Badge>;
  return <Badge variant="outline" className="text-[10px] text-red-600 border-red-300">Fail</Badge>;
}

export function ColorPaletteEditor({ projectId, brandKit, suggestedPalette }: ColorPaletteEditorProps) {
  const [swatches, setSwatches] = useState<BFColorSwatch[]>(
    brandKit?.color_palette?.length ? brandKit.color_palette : suggestedPalette
  );
  const [newHex, setNewHex] = useState('#');
  const [newName, setNewName] = useState('');
  const [newUsage, setNewUsage] = useState<BFColorSwatch['usage']>('accent');
  const [isPending, startTransition] = useTransition();

  const addSwatch = () => {
    if (!/^#[0-9a-fA-F]{6}$/.test(newHex) || !newName.trim()) return;
    setSwatches((prev) => [...prev, { hex: newHex, name: newName.trim(), usage: newUsage }]);
    setNewHex('#');
    setNewName('');
  };

  const removeSwatch = (index: number) => {
    setSwatches((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSwatch = (index: number, updates: Partial<BFColorSwatch>) => {
    setSwatches((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveBrandKit(projectId, { color_palette: swatches });
      if (result?.error) {
        toast.error('Failed to save palette', { description: result.error });
      } else {
        toast.success('Color palette saved');
      }
    });
  };

  const useSuggested = () => {
    if (suggestedPalette.length > 0) {
      setSwatches(suggestedPalette);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Color Palette</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Define the color system for your study brand.</p>
        </div>
        <div className="flex gap-2">
          {suggestedPalette.length > 0 && (
            <Button variant="outline" size="sm" className="text-xs" onClick={useSuggested}>
              Use AI Suggestions
            </Button>
          )}
          <Button size="sm" className="text-xs" onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
            Save Palette
          </Button>
        </div>
      </div>

      {/* Current swatches */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {swatches.map((swatch, i) => (
          <Card key={i}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-md border border-border"
                    style={{ backgroundColor: swatch.hex }}
                  />
                  <div>
                    <Input
                      className="text-xs h-6 w-24 px-1"
                      value={swatch.name}
                      onChange={(e) => updateSwatch(i, { name: e.target.value })}
                    />
                    <span className="text-[10px] text-muted-foreground font-mono">{swatch.hex}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSwatch(i)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <Select
                  value={swatch.usage}
                  onValueChange={(v) => updateSwatch(i, { usage: v as BFColorSwatch['usage'] })}
                >
                  <SelectTrigger className="h-6 text-[10px] w-28">
                    <SelectValue
                      getDisplayLabel={(v) => colorSwatchUsageLabel(v)}
                      placeholder="Role"
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {USAGE_ROLES.map((role) => (
                      <SelectItem key={role} value={role} className="text-xs">
                        {colorSwatchUsageLabel(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <WcagBadge ratio={getContrastRatio(swatch.hex, '#ffffff')} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add swatch */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs">Add Color</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex min-w-0 flex-col gap-1">
              <Label htmlFor="new-swatch-name" className="text-xs">
                Name
              </Label>
              <Input
                id="new-swatch-name"
                className="h-9 w-32 text-xs"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Trust Blue"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label htmlFor="new-swatch-hex" className="text-xs">
                Hex
              </Label>
              <Input
                id="new-swatch-hex"
                className="h-9 w-24 text-xs"
                value={newHex}
                onChange={(e) => setNewHex(e.target.value)}
                maxLength={7}
                placeholder="#003049"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label htmlFor="new-swatch-role" className="text-xs">
                Role
              </Label>
              <Select value={newUsage} onValueChange={(v) => setNewUsage(v as BFColorSwatch['usage'])}>
                <SelectTrigger id="new-swatch-role" className="h-9 w-28 text-xs">
                  <SelectValue getDisplayLabel={(v) => colorSwatchUsageLabel(v)} placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  {USAGE_ROLES.map((role) => (
                    <SelectItem key={role} value={role} className="text-xs">
                      {colorSwatchUsageLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs invisible select-none" aria-hidden>
                Add
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 shrink-0"
                onClick={addSwatch}
                aria-label="Add color to palette"
              >
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contrast matrix */}
      {swatches.length >= 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs">WCAG Contrast Check</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="text-[10px]">
                <thead>
                  <tr>
                    <th className="p-1" />
                    <th className="p-1 text-center font-medium">White</th>
                    <th className="p-1 text-center font-medium">Black</th>
                  </tr>
                </thead>
                <tbody>
                  {swatches.map((s, i) => (
                    <tr key={i}>
                      <td className="p-1 flex items-center gap-1">
                        <div className="w-3 h-3 rounded border" style={{ backgroundColor: s.hex }} />
                        {s.name}
                      </td>
                      <td className="p-1 text-center"><WcagBadge ratio={getContrastRatio(s.hex, '#ffffff')} /></td>
                      <td className="p-1 text-center"><WcagBadge ratio={getContrastRatio(s.hex, '#000000')} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
