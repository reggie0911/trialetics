'use client';

import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { VISUAL_PREFERENCES, type BrandBriefFormValues } from '@/lib/types/brand-forge';
import { cn } from '@/lib/utils';

interface StepVisualPreferencesProps {
  formData: BrandBriefFormValues;
  updateField: <K extends keyof BrandBriefFormValues>(key: K, value: BrandBriefFormValues[K]) => void;
}

export function StepVisualPreferences({ formData, updateField }: StepVisualPreferencesProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Visual preferences</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose your logo type and typography style.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Visual preference</Label>
        <div className="grid gap-3 sm:grid-cols-2">
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
                <p className="text-sm font-medium">{pref.label}</p>
                <p className="text-xs text-muted-foreground">{pref.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
