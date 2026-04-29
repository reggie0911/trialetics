'use client';

import { Download, Lightbulb, Map, Table as TableIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { CountryFormDialog } from './country-form-dialog';

export type CountriesViewMode = 'table' | 'map';

interface CountriesPageHeaderProps {
  studyId: string;
  existingCodes: string[];
  viewMode: CountriesViewMode;
  onViewModeChange: (mode: CountriesViewMode) => void;
  onOpenInsights: () => void;
  onExport: () => void;
  onAddSuccess: () => void;
  readOnly: boolean;
  disabledTooltip: string | undefined;
  exportDisabled?: boolean;
}

export function CountriesPageHeader({
  studyId,
  existingCodes,
  viewMode,
  onViewModeChange,
  onOpenInsights,
  onExport,
  onAddSuccess,
  readOnly,
  disabledTooltip,
  exportDisabled,
}: CountriesPageHeaderProps) {
  const isMapView = viewMode === 'map';

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-tight">Countries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage country participation, regulatory progress, submissions, and activation status.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onViewModeChange(isMapView ? 'table' : 'map')}
          title={isMapView ? 'Switch back to the table view' : 'Switch to the world map view'}
          aria-pressed={isMapView}
        >
          {isMapView ? (
            <>
              <TableIcon className="mr-2 h-4 w-4" />
              Table view
            </>
          ) : (
            <>
              <Map className="mr-2 h-4 w-4" />
              Map view
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenInsights}
          title="Open the insights panel for bottlenecks, throughput, and recommended actions"
        >
          <Lightbulb className="mr-2 h-4 w-4" />
          Insights
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={exportDisabled}
          title="Export the currently filtered countries to CSV"
        >
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
        <CountryFormDialog
          studyId={studyId}
          existingCodes={existingCodes}
          onSuccess={onAddSuccess}
          disabled={readOnly}
          disabledTooltip={disabledTooltip}
        />
      </div>
    </div>
  );
}
