'use client';

import { useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
} from 'react-simple-maps';
import { alpha2ToNumeric } from 'i18n-iso-countries';

import worldTopology from 'world-atlas/countries-110m.json';

import { cn } from '@/lib/utils';
import type { RegulatoryStatus } from '@/lib/types/ctms';

import type { CountryDashboardRow } from '@/lib/actions/countries';

type LegendKey = RegulatoryStatus | 'no_participation';

const STATUS_COLOR: Record<LegendKey, string> = {
  approved: '#22c55e',
  in_progress: '#3b82f6',
  not_started: '#f97316',
  rejected: '#ef4444',
  no_participation: '#e5e7eb',
};

const STATUS_HOVER_COLOR: Record<LegendKey, string> = {
  approved: '#16a34a',
  in_progress: '#2563eb',
  not_started: '#ea580c',
  rejected: '#dc2626',
  no_participation: '#d1d5db',
};

const STATUS_LABEL: Record<LegendKey, string> = {
  approved: 'Approved',
  in_progress: 'In Progress',
  not_started: 'Not Started',
  rejected: 'Rejected',
  no_participation: 'No Participation',
};

interface CountriesWorldMapProps {
  countries: CountryDashboardRow[];
  size?: 'mini' | 'full';
  onSelectCountry?: (countryId: string) => void;
  className?: string;
}

function alpha2ToPaddedNumeric(code: string | null | undefined): string | null {
  if (!code) return null;
  const num = alpha2ToNumeric(code.trim().toUpperCase());
  if (!num) return null;
  return num.padStart(3, '0');
}

interface GeographyShape {
  rsmKey: string;
  id?: string | number;
  properties?: { name?: string };
}

export function CountriesWorldMap({
  countries,
  size = 'mini',
  onSelectCountry,
  className,
}: CountriesWorldMapProps) {
  const dimensions =
    size === 'mini'
      ? { height: 170, scale: 138 }
      : { height: 480, scale: 165 };

  const statusByNumeric = useMemo(() => {
    const map = new Map<
      string,
      { status: LegendKey; country: CountryDashboardRow }
    >();
    for (const country of countries) {
      const numeric = alpha2ToPaddedNumeric(country.country_code);
      if (!numeric) continue;
      const status: LegendKey =
        country.regulatory_status === 'approved'
          ? 'approved'
          : country.regulatory_status === 'in_progress'
            ? 'in_progress'
            : country.regulatory_status === 'rejected'
              ? 'rejected'
              : 'not_started';
      map.set(numeric, { status, country });
    }
    return map;
  }, [countries]);

  return (
    <div
      className={cn('relative w-full overflow-hidden', className)}
      style={{ minHeight: dimensions.height }}
    >
      <ComposableMap
        projectionConfig={{ scale: dimensions.scale }}
        width={800}
        height={dimensions.height * (800 / Math.max(800, 1))}
        style={{ width: '100%', height: dimensions.height }}
      >
        <Geographies geography={worldTopology as unknown as Record<string, unknown>}>
          {({ geographies }: { geographies: GeographyShape[] }) =>
            geographies.map((geo) => {
              const numericId = String(geo.id ?? '').padStart(3, '0');
              const match = statusByNumeric.get(numericId);
              const status: LegendKey = match?.status ?? 'no_participation';
              const fill = STATUS_COLOR[status];
              const hoverFill = STATUS_HOVER_COLOR[status];
              const interactive = Boolean(onSelectCountry && match);
              const tooltip = match
                ? `${match.country.country_name} (${match.country.country_code}) — ${STATUS_LABEL[status]}`
                : geo.properties?.name ?? '';

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={
                    interactive && match
                      ? () => onSelectCountry?.(match.country.id)
                      : undefined
                  }
                  style={{
                    default: {
                      fill,
                      stroke: '#ffffff',
                      strokeWidth: 0.5,
                      outline: 'none',
                      cursor: interactive ? 'pointer' : 'default',
                    },
                    hover: {
                      fill: hoverFill,
                      stroke: '#ffffff',
                      strokeWidth: 0.5,
                      outline: 'none',
                      cursor: interactive ? 'pointer' : 'default',
                    },
                    pressed: {
                      fill: hoverFill,
                      stroke: '#ffffff',
                      strokeWidth: 0.5,
                      outline: 'none',
                      cursor: interactive ? 'pointer' : 'default',
                    },
                  }}
                >
                  <title>{tooltip}</title>
                </Geography>
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}

const LEGEND_ENTRIES: LegendKey[] = [
  'approved',
  'in_progress',
  'not_started',
  'no_participation',
];

export function CountriesWorldMapLegend({ className }: { className?: string }) {
  return (
    <ul
      className={cn('grid w-full grid-cols-2 gap-x-3 gap-y-2 text-left', className)}
    >
      {LEGEND_ENTRIES.map((key) => (
        <li
          key={key}
          className="flex min-w-0 items-center gap-1.5 text-[11px] leading-snug"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: STATUS_COLOR[key] }}
            aria-hidden
          />
          <span className="min-w-0 font-medium text-muted-foreground">
            {STATUS_LABEL[key]}
          </span>
        </li>
      ))}
    </ul>
  );
}
