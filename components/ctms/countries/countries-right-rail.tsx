'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

      <Card className="border-border/70 py-0">
        <CardHeader className="px-4 pb-2 pt-4">
          <CardTitle
            className="text-sm font-semibold"
            title="Regulatory status of every country in the study, shaded by region."
          >
            Countries by Status
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <CountriesWorldMap
            countries={countries}
            size="mini"
            onSelectCountry={onSelectCountry}
          />
          <CountriesWorldMapLegend className="mt-3" />
        </CardContent>
      </Card>

      <CountryAlertsList
        countries={countries}
        onSelectCountry={onSelectCountry}
        onViewAll={onOpenInsights}
      />
    </div>
  );
}
