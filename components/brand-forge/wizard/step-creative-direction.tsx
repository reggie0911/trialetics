'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { VISUAL_PREFERENCES, type BrandBriefFormValues } from '@/lib/types/brand-forge';
import { cn } from '@/lib/utils';

const COLOR_SWATCHES = [
  '#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560',
  '#2d6a4f', '#40916c', '#52b788', '#f77f00', '#fcbf49',
  '#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51',
  '#003049', '#d62828', '#ff6b35', '#000000', '#ffffff',
];

interface StepCreativeDirectionProps {
  formData: BrandBriefFormValues;
  updateField: <K extends keyof BrandBriefFormValues>(key: K, value: BrandBriefFormValues[K]) => void;
}

export function StepCreativeDirection({ formData, updateField }: StepCreativeDirectionProps) {
  const [keywordInput, setKeywordInput] = useState('');
  const [customColor, setCustomColor] = useState('');

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !formData.keywords.includes(kw) && formData.keywords.length < 10) {
      updateField('keywords', [...formData.keywords, kw]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (kw: string) => {
    updateField('keywords', formData.keywords.filter((k) => k !== kw));
  };

  const toggleColor = (hex: string) => {
    if (formData.preferred_colors.includes(hex)) {
      updateField('preferred_colors', formData.preferred_colors.filter((c) => c !== hex));
    } else if (formData.preferred_colors.length < 6) {
      updateField('preferred_colors', [...formData.preferred_colors, hex]);
    }
  };

  const addCustomColor = () => {
    const hex = customColor.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(hex) && !formData.preferred_colors.includes(hex) && formData.preferred_colors.length < 6) {
      updateField('preferred_colors', [...formData.preferred_colors, hex]);
      setCustomColor('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Creative direction</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Define the mood and style of your brand.
        </p>
      </div>

      {/* Keywords */}
      <div className="space-y-2">
        <Label>Keywords (up to 10)</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Add a keyword"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
            maxLength={30}
          />
          <Button type="button" variant="outline" size="icon" onClick={addKeyword} disabled={formData.keywords.length >= 10}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {formData.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {formData.keywords.map((kw) => (
              <Badge key={kw} variant="secondary" className="gap-1 pr-1">
                {kw}
                <button type="button" onClick={() => removeKeyword(kw)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Colors */}
      <div className="space-y-2">
        <Label>Preferred colors (up to 6)</Label>
        <div className="flex flex-wrap gap-2">
          {COLOR_SWATCHES.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => toggleColor(hex)}
              className={cn(
                'w-8 h-8 rounded-md border-2 transition-all',
                formData.preferred_colors.includes(hex)
                  ? 'border-primary ring-2 ring-primary/30 scale-110'
                  : 'border-transparent hover:scale-105',
              )}
              style={{ backgroundColor: hex }}
              title={hex}
            />
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="#hex"
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            maxLength={7}
            className="w-28"
          />
          <Button type="button" variant="outline" size="sm" onClick={addCustomColor}>
            Add
          </Button>
        </div>
        {formData.preferred_colors.length > 0 && (
          <div className="flex gap-1.5 mt-2">
            {formData.preferred_colors.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => toggleColor(hex)}
                className="w-8 h-8 rounded-md border border-border relative group"
                style={{ backgroundColor: hex }}
                title={`Remove ${hex}`}
              >
                <X className="h-3 w-3 absolute inset-0 m-auto text-white opacity-0 group-hover:opacity-100 drop-shadow" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Visual preference */}
      <div className="space-y-2">
        <Label>Visual preference</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {VISUAL_PREFERENCES.map((preset) => (
            <Card
              key={preset.id}
              className={cn(
                'cursor-pointer transition-all hover:border-primary/40',
                formData.visual_preference === preset.id && 'border-primary ring-2 ring-primary/20',
              )}
              onClick={() => updateField('visual_preference', preset.id)}
            >
              <CardContent className="p-3">
                <p className="text-sm font-medium">{preset.label}</p>
                <p className="text-xs text-muted-foreground">{preset.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
