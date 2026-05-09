'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FmForecastScenario } from '@/lib/finance-module/types';
import {
  formatCompactCurrency,
  projectedSpendFromForecastScenarioAssumptions,
} from '@/lib/finance-module/calculations';

interface ForecastScenarioPanelProps {
  /** Persisted `fm_forecast_scenario` rows (draft/active); comparison chart uses merged `ForecastScenarioRow[]`. */
  persistedScenarios: FmForecastScenario[];
  projectedBaseTotal: number;
  baselineScenarioId: string | null;
  baseCurrency: string;
}

export function ForecastScenarioPanel({
  persistedScenarios,
  projectedBaseTotal,
  baselineScenarioId,
  baseCurrency,
}: ForecastScenarioPanelProps) {
  const rows = persistedScenarios.filter((s) => s.status !== 'archived');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Saved Scenarios</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No saved scenarios yet. Add scenarios in the library below; they appear here and in scenario comparison.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => {
              const projected = projectedSpendFromForecastScenarioAssumptions(
                projectedBaseTotal,
                row.assumptions as Record<string, unknown>,
              );
              const isBaseline = baselineScenarioId != null && baselineScenarioId === row.id;
              return (
                <li
                  key={row.id}
                  className="flex items-center justify-between text-xs border-b border-border last:border-0 pb-1.5 last:pb-0"
                >
                  <span className="font-medium">
                    {row.name}
                    {isBaseline ? (
                      <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">(baseline)</span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground">
                    {formatCompactCurrency(projected, baseCurrency)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
