'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  updateStudyFinanceSettings,
  type ForecastAssumptions,
} from '@/lib/actions/study-finance-module';

interface ForecastAssumptionsPanelProps {
  studyId: string;
  assumptions: ForecastAssumptions;
  /** From `getStudyFinanceForecast` — required for optimistic locking on workspace settings. */
  workspaceUpdatedAt: string;
}

interface AssumptionField {
  key: keyof ForecastAssumptions;
  label: string;
  unit: string;
  min?: number;
  max?: number;
}

const FIELDS: AssumptionField[] = [
  { key: 'enrollmentTarget', label: 'Enrollment Target', unit: 'subjects', min: 0 },
  { key: 'enrollmentRatePerMonth', label: 'Enrollment Rate', unit: '/ month', min: 0 },
  { key: 'screenFailureRatePct', label: 'Screen Failure Rate', unit: '%', min: 0, max: 100 },
  { key: 'numberOfActiveSites', label: 'Active Sites', unit: 'sites', min: 0 },
  { key: 'monitoringVisitsPerMonth', label: 'Monitoring Visits', unit: '/ month', min: 0 },
  { key: 'studyDurationMonths', label: 'Study Duration', unit: 'months', min: 0 },
];

const KEY_TO_SETTING: Record<keyof ForecastAssumptions, string> = {
  enrollmentTarget: 'enrollment_target',
  enrollmentRatePerMonth: 'enrollment_rate_per_month',
  screenFailureRatePct: 'screen_failure_rate_pct',
  numberOfActiveSites: 'number_of_active_sites',
  monitoringVisitsPerMonth: 'monitoring_visits_per_month',
  studyDurationMonths: 'study_duration_months',
};

export function ForecastAssumptionsPanel({
  studyId,
  assumptions,
  workspaceUpdatedAt,
}: ForecastAssumptionsPanelProps) {
  const [values, setValues] = useState<ForecastAssumptions>(assumptions);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    const settings: Record<string, unknown> = {};
    for (const field of FIELDS) {
      settings[KEY_TO_SETTING[field.key]] = Number(values[field.key]);
    }
    startTransition(async () => {
      const { error } = await updateStudyFinanceSettings({
        studyId,
        updatedAt: workspaceUpdatedAt,
        settings,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Forecast assumptions updated.');
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Forecast Assumptions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {FIELDS.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label htmlFor={`assumption-${field.key}`} className="text-[11px] text-muted-foreground">
                {field.label}{' '}
                <span className="text-[10px] text-muted-foreground/70">({field.unit})</span>
              </Label>
              <Input
                id={`assumption-${field.key}`}
                type="number"
                inputMode="decimal"
                min={field.min}
                max={field.max}
                value={values[field.key]}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    [field.key]: Number(event.target.value),
                  }))
                }
                className="text-xs"
              />
            </div>
          ))}
          <Button size="sm" className="w-full" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save Assumptions'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
