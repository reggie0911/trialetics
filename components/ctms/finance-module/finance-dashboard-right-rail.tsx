'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  FinanceDashboardKpis,
  FinanceDashboardSuggestionItem,
} from '@/lib/actions/study-finance-module';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';
import { buildFinanceModulePath } from '@/lib/finance-module/types';

interface FinanceDashboardRightRailProps {
  studyId: string;
  kpis: FinanceDashboardKpis;
  baseCurrency: string;
  suggestions: FinanceDashboardSuggestionItem[];
}

export function FinanceDashboardRightRail({
  studyId,
  kpis,
  baseCurrency,
  suggestions,
}: FinanceDashboardRightRailProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Financial Summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Monthly Burn Rate</span>
            <span className="font-medium text-foreground">
              {formatCompactCurrency(kpis.monthlyBurnRate, baseCurrency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Cash Balance</span>
            <span className="font-medium text-foreground">
              {formatCompactCurrency(kpis.cashBalance, baseCurrency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Runway</span>
            <span className="font-medium text-foreground">
              {kpis.runwayMonths == null ? '—' : `${kpis.runwayMonths.toFixed(1)} months`}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Smart Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No suggestions right now.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {suggestions.map((sug) => (
                <li key={sug.id} className="text-xs">
                  <p className="font-medium text-foreground">{sug.label}</p>
                  <p className="text-muted-foreground mt-0.5">{sug.detail}</p>
                  {sug.actionHref ? (
                    <Link
                      href={buildFinanceModulePath(studyId, sug.actionHref)}
                      className="text-primary hover:underline mt-1 inline-block"
                    >
                      {sug.actionLabel}
                    </Link>
                  ) : (
                    <span className="text-primary mt-1 inline-block">{sug.actionLabel}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
