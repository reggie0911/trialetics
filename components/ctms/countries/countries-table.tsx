'use client';

import { Fragment } from 'react';
import {
  AlertCircle,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  FileText,
  Info,
  Plus,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  COUNTRY_STATUS_OPTIONS,
  REGULATORY_STATUS_OPTIONS,
  type CountryStatus,
  type RegulatoryStatus,
} from '@/lib/types/ctms';
import { cn } from '@/lib/utils';
import { continentForCountry } from '@/lib/countries/continents';

import type { CountryDashboardRow } from '@/lib/actions/countries';

import { CountryExpandedDrawer } from './country-expanded-drawer';
import type { ColumnVisibility } from './countries-filter-bar';
import { deriveCountryNextAction } from './next-action';

interface CountriesTableProps {
  countries: CountryDashboardRow[];
  expanded: Set<string>;
  onToggleExpand: (countryId: string) => void;
  columnVisibility: ColumnVisibility;
  onEditCountry: (country: CountryDashboardRow) => void;
  onAddSubmission: (country: CountryDashboardRow) => void;
  onRemoveCountry: (country: CountryDashboardRow) => void;
  onOpenSitesFilter: (country: CountryDashboardRow) => void;
  onTriggerNextAction?: (country: CountryDashboardRow) => void;
  readOnly?: boolean;
}

const PARTICIPATION_PILL: Record<CountryStatus, string> = {
  planned: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  regulatory_submitted:
    'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  enrolling: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  closed: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
};

const REGULATORY_PILL: Record<RegulatoryStatus, string> = {
  not_started:
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  in_progress:
    'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  approved:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
};

const REGULATORY_BAR_COLOR: Record<RegulatoryStatus, string> = {
  not_started: 'bg-muted',
  in_progress: 'bg-sky-500',
  approved: 'bg-emerald-500',
  rejected: 'bg-rose-500',
};

function regulatoryProgressPct(country: CountryDashboardRow): number {
  if (country.regulatory_status === 'approved') return 100;
  if (country.regulatory_status === 'not_started') return 0;
  if (country.regulatory_status === 'rejected') return 100;
  const submissions = country.regulatory_submissions ?? [];
  if (submissions.length === 0) return 0;
  const approved = submissions.filter((s) => s.status === 'approved').length;
  const submitted = submissions.filter(
    (s) => s.status === 'submitted' || s.status === 'approved',
  ).length;
  const ratio = (approved + submitted) / (submissions.length * 2);
  return Math.max(15, Math.min(95, Math.round(ratio * 100)));
}

function flagEmoji(countryCode: string | null | undefined): string {
  if (!countryCode || countryCode.length !== 2) return '\uD83C\uDFF3\uFE0F';
  const A = 0x1f1e6;
  const upper = countryCode.toUpperCase();
  return (
    String.fromCodePoint(A + upper.charCodeAt(0) - 65) +
    String.fromCodePoint(A + upper.charCodeAt(1) - 65)
  );
}

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.round((Date.now() - d.getTime()) / 86_400_000));
}

function dominantSubmissionType(country: CountryDashboardRow): string | null {
  const counts = new Map<string, number>();
  for (const s of country.regulatory_submissions ?? []) {
    counts.set(s.submission_type, (counts.get(s.submission_type) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  const [type] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const labels: Record<string, string> = {
    IRB: 'IRB',
    EC: 'EC',
    import_license: 'Import',
    regulatory_approval: 'Reg approval',
  };
  return labels[type] ?? type;
}

const NEXT_ACTION_TONE_CLASS: Record<
  ReturnType<typeof deriveCountryNextAction>['tone'],
  string
> = {
  critical: 'text-rose-600',
  warning: 'text-amber-600',
  info: 'text-violet-600',
  muted: 'text-muted-foreground',
};

const NEXT_ACTION_ICON: Record<
  ReturnType<typeof deriveCountryNextAction>['kind'],
  typeof CalendarCheck
> = {
  start_regulatory: AlertCircle,
  complete_submission: CalendarCheck,
  activate_sites: FileText,
  begin_enrollment: FileText,
  on_track: Info,
};

export function CountriesTable({
  countries,
  expanded,
  onToggleExpand,
  columnVisibility,
  onEditCountry,
  onAddSubmission,
  onRemoveCountry,
  onOpenSitesFilter,
  onTriggerNextAction,
  readOnly = false,
}: CountriesTableProps) {
  const visibleColCount =
    1 +
    1 +
    1 +
    1 +
    (columnVisibility.submissions ? 1 : 0) +
    (columnVisibility.sites ? 1 : 0) +
    (columnVisibility.nextAction ? 1 : 0) +
    (columnVisibility.lastUpdated ? 1 : 0) +
    1;

  return (
    <div className="overflow-hidden rounded-md border border-border/70 bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[36px]" />
            <TableHead className="text-xs font-medium text-muted-foreground">
              Country
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">
              Participation
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">
              Regulatory status
            </TableHead>
            {columnVisibility.submissions && (
              <TableHead className="text-xs font-medium text-muted-foreground">
                Submissions
              </TableHead>
            )}
            {columnVisibility.sites && (
              <TableHead className="text-xs font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  Sites
                  <Info className="h-3 w-3 text-muted-foreground" />
                </span>
              </TableHead>
            )}
            {columnVisibility.nextAction && (
              <TableHead className="text-xs font-medium text-muted-foreground">
                Next action
              </TableHead>
            )}
            {columnVisibility.lastUpdated && (
              <TableHead className="text-xs font-medium text-muted-foreground">
                Last updated
              </TableHead>
            )}
            <TableHead className="w-[100px] text-xs font-medium text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {countries.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={visibleColCount}
                className="py-6 text-center text-xs text-muted-foreground"
              >
                No countries match your filters.
              </TableCell>
            </TableRow>
          ) : (
            countries.map((country) => {
              const isExpanded = expanded.has(country.id);
              const submissions = country.regulatory_submissions ?? [];
              const participationLabel =
                COUNTRY_STATUS_OPTIONS.find((opt) => opt.value === country.status)?.label ??
                country.status;
              const regulatoryLabel =
                REGULATORY_STATUS_OPTIONS.find(
                  (opt) => opt.value === country.regulatory_status,
                )?.label ?? country.regulatory_status;
              const dominantType = dominantSubmissionType(country);
              const nextAction = deriveCountryNextAction(country);
              const NextIcon = NEXT_ACTION_ICON[nextAction.kind];
              const lastSubmissionDate =
                submissions
                  .map((s) => s.submission_date ?? s.approval_date ?? null)
                  .filter((v): v is string => Boolean(v))
                  .sort()
                  .at(-1) ?? null;
              const days = daysSince(
                country.lastUpdatedAt ?? country.updated_at,
              );
              const continent = continentForCountry(country.country_code);
              const regProgress = regulatoryProgressPct(country);
              const sitesEmpty = country.totalSites === 0;
              const hasReg =
                country.regulatory_status === 'in_progress' ||
                country.regulatory_status === 'approved';

              return (
                <Fragment key={country.id}>
                  <TableRow
                    data-country-row={country.id}
                    className="align-middle"
                  >
                    <TableCell className="py-3">
                      <button
                        type="button"
                        onClick={() => onToggleExpand(country.id)}
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-flex h-7 w-9 shrink-0 items-center justify-center overflow-hidden rounded border border-border/70 bg-background text-base leading-none"
                          aria-hidden
                        >
                          {flagEmoji(country.country_code)}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">
                            {country.country_name}{' '}
                            <span className="font-normal text-muted-foreground">
                              ({country.country_code})
                            </span>
                          </div>
                          {continent && (
                            <div className="truncate text-xs text-muted-foreground">
                              {continent}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          PARTICIPATION_PILL[country.status] ?? PARTICIPATION_PILL.planned,
                        )}
                      >
                        {participationLabel}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex max-w-[220px] flex-col gap-1.5">
                        <span
                          className={cn(
                            'inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-medium',
                            REGULATORY_PILL[country.regulatory_status] ??
                              REGULATORY_PILL.not_started,
                          )}
                        >
                          {regulatoryLabel}
                        </span>
                        <div className="h-1.5 w-full rounded-full bg-muted">
                          <div
                            className={cn(
                              'h-1.5 rounded-full transition-all',
                              REGULATORY_BAR_COLOR[country.regulatory_status] ??
                                REGULATORY_BAR_COLOR.not_started,
                            )}
                            style={{ width: `${regProgress}%` }}
                          />
                        </div>
                        {hasReg ? (
                          <p className="text-[10px] text-muted-foreground">
                            {country.regulatory_status === 'approved'
                              ? 'Approved'
                              : 'Submitted'}
                            : {formatDateShort(lastSubmissionDate)}
                            {days != null && (
                              <>
                                {' '}
                                <span aria-hidden>·</span> Days in status: {days}
                              </>
                            )}
                          </p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground">—</p>
                        )}
                      </div>
                    </TableCell>
                    {columnVisibility.submissions && (
                      <TableCell className="py-3 text-xs">
                        {submissions.length === 0 ? (
                          <>
                            <div className="text-foreground">0 submissions</div>
                            <div className="text-[10px] text-muted-foreground">—</div>
                          </>
                        ) : (
                          <>
                            <div className="text-foreground">
                              {submissions.length} submission
                              {submissions.length === 1 ? '' : 's'}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {dominantType ?? '—'}
                            </div>
                          </>
                        )}
                      </TableCell>
                    )}
                    {columnVisibility.sites && (
                      <TableCell className="py-3 text-xs">
                        <div className="text-foreground">
                          {country.activeSites} / {country.totalSites}
                        </div>
                        <div className="text-[10px]">
                          {country.enrollingSites > 0 ? (
                            <span className="text-emerald-600">
                              {country.enrollingSites} enrolling
                            </span>
                          ) : country.activeSites > 0 ? (
                            <span className="text-emerald-600">
                              {country.activeSites} active
                            </span>
                          ) : sitesEmpty ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className="text-muted-foreground">0 active</span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {columnVisibility.nextAction && (
                      <TableCell className="py-3 text-xs">
                        {nextAction.kind === 'on_track' ? (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 text-xs',
                              NEXT_ACTION_TONE_CLASS[nextAction.tone],
                            )}
                          >
                            <NextIcon className="h-3.5 w-3.5" />
                            {nextAction.label}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onTriggerNextAction?.(country)}
                            className={cn(
                              'inline-flex items-center gap-1.5 text-xs font-medium underline-offset-2 hover:underline',
                              NEXT_ACTION_TONE_CLASS[nextAction.tone],
                            )}
                          >
                            <NextIcon className="h-3.5 w-3.5" />
                            {nextAction.label}
                          </button>
                        )}
                        {nextAction.detail && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {nextAction.detail}
                          </p>
                        )}
                      </TableCell>
                    )}
                    {columnVisibility.lastUpdated && (
                      <TableCell className="py-3 text-xs">
                        <div className="text-foreground">
                          {formatDateShort(country.lastUpdatedAt ?? country.updated_at)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {country.lastUpdatedByName
                            ? `by ${country.lastUpdatedByName}`
                            : '—'}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 px-3 text-xs font-medium"
                              aria-label={`Manage ${country.country_name}`}
                            />
                          }
                        >
                          Manage
                          <ChevronDown className="h-3.5 w-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => onEditCountry(country)}
                            disabled={readOnly}
                          >
                            Edit country
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onAddSubmission(country)}
                            disabled={readOnly}
                          >
                            <Plus className="mr-2 h-3.5 w-3.5" />
                            Add submission
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onOpenSitesFilter(country)}>
                            Open sites filter
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onRemoveCountry(country)}
                            disabled={readOnly}
                            variant="destructive"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Remove country
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>

                  {isExpanded && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={visibleColCount} className="px-4 py-4">
                        <CountryExpandedDrawer
                          country={country}
                          onAddSubmission={() => onAddSubmission(country)}
                          onOpenSitesFilter={() => onOpenSitesFilter(country)}
                          onCollapse={() => onToggleExpand(country.id)}
                          readOnly={readOnly}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
