'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import {
  COMMUNICATION_GOALS,
  TARGET_AUDIENCES,
  type BrandBriefFormValues,
} from '@/lib/types/brand-forge';
import { cn } from '@/lib/utils';

interface StepCommunicationGoalsProps {
  formData: BrandBriefFormValues;
  updateField: <K extends keyof BrandBriefFormValues>(key: K, value: BrandBriefFormValues[K]) => void;
}

export function StepCommunicationGoals({ formData, updateField }: StepCommunicationGoalsProps) {
  const toggleArrayValue = (key: 'communication_goals' | 'target_audience', value: string) => {
    const current = formData[key];
    if (current.includes(value)) {
      updateField(key, current.filter((v) => v !== value));
    } else {
      updateField(key, [...current, value]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Communication Goals</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Define who will see the brand and what the study communications need to achieve.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Target Audience</Label>
        <p className="text-xs text-muted-foreground">Select all audiences who will interact with the study brand.</p>
        <div className="grid gap-2 sm:grid-cols-2 mt-2">
          {TARGET_AUDIENCES.map((audience) => {
            const selected = formData.target_audience.includes(audience.id);
            return (
              <Card
                key={audience.id}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary/40',
                  selected && 'border-primary ring-2 ring-primary/20',
                )}
                onClick={() => toggleArrayValue('target_audience', audience.id)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={cn(
                    'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                    selected ? 'border-primary bg-primary' : 'border-muted-foreground/30',
                  )}>
                    {selected && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs font-medium">{audience.label}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Communication Goals</Label>
        <p className="text-xs text-muted-foreground">What does this study brand need to accomplish?</p>
        <div className="grid gap-2 sm:grid-cols-2 mt-2">
          {COMMUNICATION_GOALS.map((goal) => {
            const selected = formData.communication_goals.includes(goal.id);
            return (
              <Card
                key={goal.id}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary/40',
                  selected && 'border-primary ring-2 ring-primary/20',
                )}
                onClick={() => toggleArrayValue('communication_goals', goal.id)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={cn(
                    'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                    selected ? 'border-primary bg-primary' : 'border-muted-foreground/30',
                  )}>
                    {selected && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs font-medium">{goal.label}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="is_patient_facing" className="text-xs font-medium">Patient-Facing Branding</Label>
          <p className="text-xs text-muted-foreground">
            Will patients see this brand directly? This affects tone and visual direction.
          </p>
        </div>
        <Switch
          id="is_patient_facing"
          checked={formData.is_patient_facing}
          onCheckedChange={(checked) => updateField('is_patient_facing', checked)}
        />
      </div>
    </div>
  );
}
