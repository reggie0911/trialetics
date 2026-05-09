'use client';

import { useSearchParams } from 'next/navigation';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function ForecastBaselineHealthBanner() {
  const sp = useSearchParams();
  if (sp.get('fmHealth') !== 'no_baseline') return null;

  return (
    <Alert className="border-amber-500/50 bg-amber-500/5">
      <AlertTitle className="text-xs">Data health: forecast baseline</AlertTitle>
      <AlertDescription className="text-[11px] text-muted-foreground">
        You have saved forecast scenarios but no baseline is selected. Open the scenario library card and choose
        &quot;Set as baseline&quot;, or set `forecast_baseline_scenario_id` from workspace settings.
      </AlertDescription>
    </Alert>
  );
}
