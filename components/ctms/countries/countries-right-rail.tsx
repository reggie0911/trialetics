'use client';

import { Map } from 'lucide-react';

import { Card } from '@/components/ui/card';

import type { CountryDashboardRow } from '@/lib/actions/countries';

import { CountryAlertsList } from './country-alerts-list';
import { CountriesWorldMap, CountriesWorldMapLegend } from './countries-world-map';
import { RegulatoryProgressDonut } from './regulatory-progress-donut';

interface CountriesRightRailProps {
  countries: CountryDashboardRow[];
  onSelectCountry?: (countryId: string) => void;
  onOpenInsights?: () => void;
}

export function CountriesRightRail({
  countries,
  onSelectCountry,
  onOpenInsights,
}: CountriesRightRailProps) {
  return (
    <div className="flex flex-col gap-4 lg:sticky lg:top-4">
      <RegulatoryProgressDonut countries={countries} />

      <Card className="h-full min-h-0 overflow-hidden border-border/70 py-0 shadow-none">
        <div className="flex flex-col gap-0 px-4 py-3.5">
          <div className="flex w-full min-w-0 items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1 text-left">
              <h3
                className="!text-[12px] font-medium leading-tight text-muted-foreground"
                title="Regulatory status of every country in the study, shaded by region."
              >
                Countries by Status
              </h3>
              <p className="text-[11px] leading-snug text-muted-foreground">
                Shaded by regulatory state on the world map
              </p>
            </div>
            <span
              aria-hidden
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 shadow-sm ring-1 ring-inset ring-black/5 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-white/10"
            >
              <Map className="h-3.5 w-3.5 opacity-90" strokeWidth={2.25} />
            </span>
          </div>

          <div className="mt-3 w-full min-w-0">
            <CountriesWorldMap
              countries={countries}
              size="mini"
              onSelectCountry={onSelectCountry}
            />
          </div>

          <div className="mt-3 border-t border-border/50 pt-2.5">
            <CountriesWorldMapLegend />
          </div>
        </div>
      </Card>

      <CountryAlertsList
        countries={countries}
        onSelectCountry={onSelectCountry}
        onViewAll={onOpenInsights}
      />
    </div>
  );
}
