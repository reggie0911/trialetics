'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  BRAND_DIRECTIONS,
  VISUAL_PREFERENCES,
  type BrandBriefFormValues,
} from '@/lib/types/brand-forge';
import { STARTER_TEMPLATES } from '@/lib/brand-forge/starter-templates';
import { cn } from '@/lib/utils';

const COLOR_SWATCHES = [
  '#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560',
  '#2d6a4f', '#40916c', '#52b788', '#f77f00', '#fcbf49',
  '#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51',
  '#003049', '#d62828', '#ff6b35', '#000000', '#ffffff',
];

interface StepBrandDirectionProps {
  formData: BrandBriefFormValues;
  updateField: <K extends keyof BrandBriefFormValues>(key: K, value: BrandBriefFormValues[K]) => void;
}

export function StepBrandDirection({ formData, updateField }: StepBrandDirectionProps) {
  const [keywordInput, setKeywordInput] = useState('');
  const [customColor, setCustomColor] = useState('');

  const toggleDirection = (id: string) => {
    if (formData.brand_direction.includes(id)) {
      updateField('brand_direction', formData.brand_direction.filter((d) => d !== id));
    } else if (formData.brand_direction.length < 4) {
      updateField('brand_direction', [...formData.brand_direction, id]);
    }
  };

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
        <h2 className="text-lg font-semibold">Brand Direction</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Define the look and feel of the study brand. Select up to 4 brand directions.
        </p>
      </div>

      {/* Starter templates */}
      <div className="space-y-2">
        <Label className="text-xs">Quick Start (optional)</Label>
        <p className="text-[10px] text-muted-foreground">Apply a preset brand direction based on therapeutic area.</p>
        <div className="flex flex-wrap gap-2 mt-1">
          {STARTER_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => {
                updateField('brand_direction', tmpl.brandDirection);
                updateField('visual_preference', tmpl.visualPreference);
                updateField('preferred_colors', tmpl.preferredColors);
                updateField('keywords', tmpl.keywords);
              }}
              className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs hover:border-primary/40 transition-colors"
            >
              <div className="flex gap-0.5">
                {tmpl.preferredColors.slice(0, 3).map((c) => (
                  <div key={c} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
                ))}
              </div>
              {tmpl.name}
            </button>
          ))}
        </div>
      </div>

      {/* Brand direction chips */}
      <div className="space-y-2">
        <Label className="text-xs">Brand Direction (select up to 4)</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {BRAND_DIRECTIONS.map((dir) => {
            const selected = formData.brand_direction.includes(dir.id);
            return (
              <Card
                key={dir.id}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary/40',
                  selected && 'border-primary ring-2 ring-primary/20',
                  !selected && formData.brand_direction.length >= 4 && 'opacity-50 cursor-not-allowed',
                )}
                onClick={() => toggleDirection(dir.id)}
              >
                <CardContent className="p-3">
                  <p className="text-xs font-medium">{dir.label}</p>
                  <p className="text-xs text-muted-foreground">{dir.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Visual preference */}
      <div className="space-y-2">
        <Label className="text-xs">Visual Preference</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {VISUAL_PREFERENCES.map((pref) => (
            <Card
              key={pref.id}
              className={cn(
                'cursor-pointer transition-all hover:border-primary/40',
                formData.visual_preference === pref.id && 'border-primary ring-2 ring-primary/20',
              )}
              onClick={() => updateField('visual_preference', pref.id)}
            >
              <CardContent className="p-3">
                <p className="text-xs font-medium">{pref.label}</p>
                <p className="text-xs text-muted-foreground">{pref.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Keywords */}
      <div className="space-y-2">
        <Label className="text-xs">Keywords (up to 10)</Label>
        <div className="flex gap-2">
          <Input
            className="text-xs"
            placeholder="Add a keyword"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
            maxLength={30}
          />
          <Button type="button" variant="outline" size="icon" onClick={addKeyword} disabled={formData.keywords.length >= 10}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {formData.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {formData.keywords.map((kw) => (
              <Badge key={kw} variant="secondary" className="gap-1 pr-1 text-xs">
                {kw}
                <button type="button" onClick={() => removeKeyword(kw)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Preferred colors */}
      <div className="space-y-2">
        <Label className="text-xs">Preferred Colors (up to 6)</Label>
        <div className="flex flex-wrap gap-2">
          {COLOR_SWATCHES.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => toggleColor(hex)}
              className={cn(
                'w-7 h-7 rounded-md border-2 transition-all',
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
            className="text-xs w-28"
            placeholder="#hex"
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            maxLength={7}
          />
          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={addCustomColor}>
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
                className="w-7 h-7 rounded-md border border-border relative group"
                style={{ backgroundColor: hex }}
                title={`Remove ${hex}`}
              >
                <X className="h-3 w-3 absolute inset-0 m-auto text-white opacity-0 group-hover:opacity-100 drop-shadow" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
