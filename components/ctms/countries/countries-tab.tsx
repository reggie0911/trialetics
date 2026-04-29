'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TablePaginationFooter } from '@/components/ui/table-pagination-footer';

import { useClientPagination } from '@/lib/hooks/use-client-pagination';
import { useStudyHub } from '@/components/ctms/study-hub-context';
import { STUDY_DEACTIVATED_TOOLTIP } from '@/lib/constants/study-deactivated-message';
import {
  getCountriesDashboard,
  removeStudyCountry,
  type CountryDashboardRow,
} from '@/lib/actions/countries';
import { enrichCountriesWithSites } from '@/lib/countries/enrich';
import { downloadCountriesCsv } from '@/lib/exports/countries-csv';
import type {
  Study,
  StudyCountryWithSubmissions,
  StudySite,
} from '@/lib/types/ctms';

import { CountryFormDialog } from './country-form-dialog';
import { SubmissionFormDialog } from './submission-form-dialog';
import { CountriesPageHeader } from './countries-page-header';
import { CountriesKpiStrip } from './countries-kpi-strip';
import { CountriesRightRail } from './countries-right-rail';
import { CountriesWorldMap, CountriesWorldMapLegend } from './countries-world-map';
import {
  CountriesFilterBar,
  DEFAULT_COLUMN_VISIBILITY,
  type ColumnVisibility,
  type ParticipationFilter,
  type RegulatoryFilter,
  type SubmissionsFilter,
} from './countries-filter-bar';
import { CountriesTable } from './countries-table';
import { CountriesInsightsSheet } from './countries-insights-sheet';
import type { CountriesViewMode } from './countries-page-header';

interface CountriesTabProps {
  studyId: string;
  initialCountries: StudyCountryWithSubmissions[];
  study?: Study | unknown;
  initialSites?: StudySite[] | unknown;
}

export function CountriesTab({
  studyId,
  initialCountries,
  initialSites,
}: CountriesTabProps) {
  const router = useRouter();
  const studyHub = useStudyHub();
  const readOnly = studyHub?.isStudyReadOnly ?? false;
  const disabledTooltip = readOnly ? STUDY_DEACTIVATED_TOOLTIP : undefined;

  const sitesProp = useMemo<Pick<StudySite, 'study_country_id' | 'status'>[]>(() => {
    if (Array.isArray(initialSites)) {
      return initialSites as Pick<StudySite, 'study_country_id' | 'status'>[];
    }
    return [];
  }, [initialSites]);

  const [countries, setCountries] = useState<CountryDashboardRow[]>(() =>
    enrichCountriesWithSites(initialCountries, sitesProp),
  );
  const [, startTransition] = useTransition();

  const [viewMode, setViewMode] = useState<CountriesViewMode>('table');
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState('');
  const [regulatory, setRegulatory] = useState<RegulatoryFilter>('all');
  const [participation, setParticipation] = useState<ParticipationFilter>('all');
  const [submissions, setSubmissions] = useState<SubmissionsFilter>('all');
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    DEFAULT_COLUMN_VISIBILITY,
  );

  const [editTarget, setEditTarget] = useState<CountryDashboardRow | null>(null);
  const [submissionTarget, setSubmissionTarget] =
    useState<CountryDashboardRow | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CountryDashboardRow | null>(null);

  useEffect(() => {
    setCountries(enrichCountriesWithSites(initialCountries, sitesProp));
  }, [initialCountries, sitesProp]);

  const refreshCountries = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getCountriesDashboard(studyId);
        setCountries(data);
      } catch {
        toast.error('Failed to refresh country data');
      }
    });
  }, [studyId]);

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return countries.filter((country) => {
      if (regulatory !== 'all' && country.regulatory_status !== regulatory) {
        return false;
      }
      if (participation !== 'all' && country.status !== participation) {
        return false;
      }
      const subCount = (country.regulatory_submissions ?? []).length;
      if (submissions === 'with' && subCount === 0) return false;
      if (submissions === 'without' && subCount > 0) return false;
      if (
        q &&
        !country.country_name.toLowerCase().includes(q) &&
        !country.country_code.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [countries, regulatory, participation, submissions, search]);

  const hasActiveFilters =
    regulatory !== 'all' ||
    participation !== 'all' ||
    submissions !== 'all' ||
    search.trim().length > 0;

  const pagination = useClientPagination({
    totalItems: filteredCountries.length,
    resetKey: [search, regulatory, participation, submissions],
  });
  const paginatedCountries = pagination.paginate(filteredCountries);

  const existingCodes = useMemo(
    () => countries.map((c) => c.country_code),
    [countries],
  );

  const handleToggleExpand = useCallback((countryId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(countryId)) next.delete(countryId);
      else next.add(countryId);
      return next;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setRegulatory('all');
    setParticipation('all');
    setSubmissions('all');
    setColumnVisibility(DEFAULT_COLUMN_VISIBILITY);
  }, []);

  const handleRemoveCountry = useCallback(async () => {
    if (!removeTarget) return;
    const target = removeTarget;
    setRemoveTarget(null);
    const { error } = await removeStudyCountry(target.id, studyId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Country removed');
    refreshCountries();
  }, [removeTarget, studyId, refreshCountries]);

  const handleOpenSitesFilter = useCallback(
    (country: CountryDashboardRow) => {
      router.push(
        `?tab=sites&country=${encodeURIComponent(country.country_code)}`,
        { scroll: false },
      );
    },
    [router],
  );

  const handleSelectFromAlerts = useCallback(
    (countryId: string) => {
      const target = countries.find((c) => c.id === countryId);
      if (!target) return;
      setExpanded((prev) => {
        const next = new Set(prev);
        next.add(countryId);
        return next;
      });
      if (typeof document !== 'undefined') {
        const el = document.querySelector(
          `[data-country-row="${countryId}"]`,
        ) as HTMLElement | null;
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [countries],
  );

  const handleExport = useCallback(() => {
    if (filteredCountries.length === 0) {
      toast.info('No countries to export with the current filters.');
      return;
    }
    downloadCountriesCsv(filteredCountries, 'countries');
  }, [filteredCountries]);

  const handleTriggerNextAction = useCallback(
    (country: CountryDashboardRow) => {
      const subs = country.regulatory_submissions ?? [];
      const pending = subs.filter(
        (s) => s.status !== 'approved' && s.status !== 'rejected',
      );
      if (country.regulatory_status === 'not_started' || pending.length > 0) {
        setSubmissionTarget(country);
        return;
      }
      handleOpenSitesFilter(country);
    },
    [handleOpenSitesFilter],
  );

  return (
    <div className="space-y-4">
      <CountriesPageHeader
        studyId={studyId}
        existingCodes={existingCodes}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenInsights={() => setInsightsOpen(true)}
        onExport={handleExport}
        onAddSuccess={refreshCountries}
        readOnly={readOnly}
        disabledTooltip={disabledTooltip}
        exportDisabled={filteredCountries.length === 0}
      />

      <div className="grid grid-cols-1 gap-4 lg:[grid-template-columns:minmax(0,1fr)_280px]">
        <div className="space-y-4 min-w-0">
          <CountriesKpiStrip countries={countries} />

          <CountriesFilterBar
            search={search}
            onSearchChange={setSearch}
            regulatory={regulatory}
            onRegulatoryChange={setRegulatory}
            participation={participation}
            onParticipationChange={setParticipation}
            submissions={submissions}
            onSubmissionsChange={setSubmissions}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            onClear={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
          />

          {countries.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertTriangle className="mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  No countries added
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add countries to track regulatory submissions and site participation.
                </p>
              </CardContent>
            </Card>
          ) : viewMode === 'map' ? (
            <Card className="border-border/70 py-0">
              <CardContent className="px-3 pb-3 pt-3">
                <CountriesWorldMap
                  countries={filteredCountries}
                  size="full"
                  onSelectCountry={handleSelectFromAlerts}
                />
                <CountriesWorldMapLegend className="mt-2 px-2" />
              </CardContent>
            </Card>
          ) : (
            <CountriesTable
              countries={paginatedCountries}
              expanded={expanded}
              onToggleExpand={handleToggleExpand}
              columnVisibility={columnVisibility}
              onEditCountry={setEditTarget}
              onAddSubmission={setSubmissionTarget}
              onRemoveCountry={setRemoveTarget}
              onOpenSitesFilter={handleOpenSitesFilter}
              onTriggerNextAction={handleTriggerNextAction}
              readOnly={readOnly}
            />
          )}

          {countries.length > 0 && viewMode === 'table' && (
            <TablePaginationFooter
              pagination={pagination}
              totalItems={filteredCountries.length}
              itemNoun="country"
              itemNounPlural="countries"
            />
          )}
        </div>

        <div className="min-w-0">
          <CountriesRightRail
            countries={countries}
            onSelectCountry={handleSelectFromAlerts}
            onOpenInsights={() => setInsightsOpen(true)}
          />
        </div>
      </div>

      <CountriesInsightsSheet
        open={insightsOpen}
        onOpenChange={setInsightsOpen}
        countries={countries}
      />

      {editTarget && (
        <CountryFormDialog
          studyId={studyId}
          existingCodes={existingCodes.filter(
            (code) => code !== editTarget.country_code,
          )}
          country={editTarget}
          controlledOpen={true}
          onControlledOpenChange={(next) => {
            if (!next) setEditTarget(null);
          }}
          onSuccess={() => {
            setEditTarget(null);
            refreshCountries();
          }}
          disabled={readOnly}
          disabledTooltip={disabledTooltip}
        />
      )}

      {submissionTarget && (
        <SubmissionFormDialog
          studyId={studyId}
          studyCountryId={submissionTarget.id}
          controlledOpen={true}
          onControlledOpenChange={(next) => {
            if (!next) setSubmissionTarget(null);
          }}
          onSuccess={() => {
            setSubmissionTarget(null);
            refreshCountries();
          }}
          disabled={readOnly}
          disabledTooltip={disabledTooltip}
        />
      )}

      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(next) => {
          if (!next) setRemoveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Country</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget
                ? `This will remove ${removeTarget.country_name} and all associated regulatory submissions from this study. This action cannot be undone.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveCountry}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
