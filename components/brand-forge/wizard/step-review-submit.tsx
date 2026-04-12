'use client';

import { Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  PHASES,
  TRIAL_TYPES,
  SEVERITIES,
  DEVICE_OR_DRUG_OPTIONS,
  TARGET_AUDIENCES,
  COMMUNICATION_GOALS,
  BRAND_DIRECTIONS,
  VISUAL_PREFERENCES,
  type BrandBriefFormValues,
} from '@/lib/types/brand-forge';

interface StepReviewSubmitProps {
  formData: BrandBriefFormValues;
  onEdit: (step: number) => void;
}

function SectionHeader({ title, step, onEdit }: { title: string; step: number; onEdit: (s: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-xs font-medium">{title}</h3>
      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => onEdit(step)}>
        <Pencil className="mr-1 h-3 w-3" />
        Edit
      </Button>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function lookupLabel(items: readonly { id: string; label: string }[], id: string): string {
  return items.find((i) => i.id === id)?.label ?? id;
}

export function StepReviewSubmit({ formData, onEdit }: StepReviewSubmitProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Review Your Study Brief</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Confirm the details below before creating your study brand project.
        </p>
      </div>

      <div className="space-y-4">
        {/* Study Basics */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <SectionHeader title="Study Basics" step={0} onEdit={onEdit} />
            <div className="grid gap-2">
              <FieldRow label="Study Name" value={formData.study_name} />
              <FieldRow label="Protocol Number" value={formData.protocol_number} />
              <FieldRow label="Tagline" value={formData.tagline} />
              <FieldRow label="Sponsor" value={formData.sponsor} />
              <FieldRow label="CRO" value={formData.cro} />
              <FieldRow label="Phase" value={formData.phase ? lookupLabel(PHASES, formData.phase) : undefined} />
              <FieldRow label="Trial Type" value={formData.trial_type ? lookupLabel(TRIAL_TYPES, formData.trial_type) : undefined} />
            </div>
          </CardContent>
        </Card>

        {/* Medical Context */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <SectionHeader title="Medical Context" step={1} onEdit={onEdit} />
            <div className="grid gap-2">
              <FieldRow label="Therapeutic Area" value={formData.therapeutic_area} />
              <FieldRow label="Indication" value={formData.indication} />
              <FieldRow label="Patient Population" value={formData.patient_population} />
              <FieldRow label="Device or Drug" value={formData.device_or_drug ? lookupLabel(DEVICE_OR_DRUG_OPTIONS, formData.device_or_drug) : undefined} />
              <FieldRow label="Severity" value={formData.severity ? lookupLabel(SEVERITIES, formData.severity) : undefined} />
              {formData.countries.length > 0 && (
                <div className="text-xs">
                  <span className="text-muted-foreground block mb-1">Countries / Regions</span>
                  <div className="flex flex-wrap gap-1">
                    {formData.countries.map((c) => (
                      <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Communication Goals */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <SectionHeader title="Communication Goals" step={2} onEdit={onEdit} />
            <div className="space-y-2">
              {formData.target_audience.length > 0 && (
                <div className="text-xs">
                  <span className="text-muted-foreground block mb-1">Target Audience</span>
                  <div className="flex flex-wrap gap-1">
                    {formData.target_audience.map((a) => (
                      <Badge key={a} variant="secondary" className="text-xs">{lookupLabel(TARGET_AUDIENCES, a)}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {formData.communication_goals.length > 0 && (
                <div className="text-xs">
                  <span className="text-muted-foreground block mb-1">Goals</span>
                  <div className="flex flex-wrap gap-1">
                    {formData.communication_goals.map((g) => (
                      <Badge key={g} variant="secondary" className="text-xs">{lookupLabel(COMMUNICATION_GOALS, g)}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <FieldRow label="Patient-Facing" value={formData.is_patient_facing ? 'Yes' : 'No'} />
            </div>
          </CardContent>
        </Card>

        {/* Brand Direction */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <SectionHeader title="Brand Direction" step={3} onEdit={onEdit} />
            <div className="space-y-2">
              {formData.brand_direction.length > 0 && (
                <div className="text-xs">
                  <span className="text-muted-foreground block mb-1">Brand Direction</span>
                  <div className="flex flex-wrap gap-1">
                    {formData.brand_direction.map((d) => (
                      <Badge key={d} variant="secondary" className="text-xs">{lookupLabel(BRAND_DIRECTIONS, d)}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <FieldRow label="Visual Preference" value={formData.visual_preference ? lookupLabel(VISUAL_PREFERENCES, formData.visual_preference) : undefined} />
              {formData.keywords.length > 0 && (
                <div className="text-xs">
                  <span className="text-muted-foreground block mb-1">Keywords</span>
                  <div className="flex flex-wrap gap-1">
                    {formData.keywords.map((kw) => (
                      <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {formData.preferred_colors.length > 0 && (
                <div className="text-xs">
                  <span className="text-muted-foreground block mb-1">Preferred Colors</span>
                  <div className="flex gap-1.5">
                    {formData.preferred_colors.map((hex) => (
                      <div
                        key={hex}
                        className="w-6 h-6 rounded border border-border"
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
