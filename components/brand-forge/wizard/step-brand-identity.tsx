'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type BrandBriefFormValues } from '@/lib/types/brand-forge';

interface StepBrandIdentityProps {
  formData: BrandBriefFormValues;
  updateField: <K extends keyof BrandBriefFormValues>(key: K, value: BrandBriefFormValues[K]) => void;
}

export function StepBrandIdentity({ formData, updateField }: StepBrandIdentityProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Brand identity</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Tell us about your brand. This information shapes the logo concepts we generate.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="study_name">Study name</Label>
          <Input
            id="study_name"
            placeholder="Enter the study name"
            value={formData.study_name}
            onChange={(e) => updateField('study_name', e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tagline">Tagline (optional)</Label>
          <Input
            id="tagline"
            placeholder="A short tagline or slogan"
            value={formData.tagline}
            onChange={(e) => updateField('tagline', e.target.value)}
            maxLength={200}
          />
        </div>
      </div>
    </div>
  );
}
