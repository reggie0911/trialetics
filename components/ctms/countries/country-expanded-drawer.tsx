'use client';

import { ChevronUp, FileText } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { CountryDashboardRow } from '@/lib/actions/countries';

interface CountryExpandedDrawerProps {
  country: CountryDashboardRow;
  onAddSubmission: () => void;
  onOpenSitesFilter: () => void;
  onCollapse?: () => void;
  readOnly?: boolean;
}

const SUBMISSION_TYPE_LABELS: Record<string, string> = {
  IRB: 'IRB Submission',
  EC: 'Ethics Committee Submission',
  import_license: 'Import License Submission',
  regulatory_approval: 'Regulatory Approval Submission',
};

const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  submitted: 'In Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const SUBMISSION_STATUS_PILL: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  submitted: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
};

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function PanelCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-md border border-border/70 bg-card px-4 py-3',
        className,
      )}
    >
      <h4 className="text-xs font-semibold text-foreground">{title}</h4>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

function KeyValueRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export function CountryExpandedDrawer({
  country,
  onOpenSitesFilter,
  onCollapse,
}: CountryExpandedDrawerProps) {
  const submissions = country.regulatory_submissions ?? [];
  const firstSubmission = [...submissions]
    .sort((a, b) =>
      (a.submission_date ?? a.created_at).localeCompare(b.submission_date ?? b.created_at),
    )
    .at(0);
  const earliestApproval = submissions
    .map((s) => s.approval_date)
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(0);
  const submissionLabel = firstSubmission
    ? SUBMISSION_TYPE_LABELS[firstSubmission.submission_type] ??
      `${firstSubmission.submission_type} Submission`
    : null;
  const submissionStatusLabel = firstSubmission
    ? SUBMISSION_STATUS_LABELS[firstSubmission.status] ?? firstSubmission.status
    : null;

  const planned = Math.max(0, country.totalSites - country.activeSites);
  const active = Math.max(0, country.activeSites - country.enrollingSites);
  const enrolling = country.enrollingSites;
  const totalForBar = Math.max(1, planned + active + enrolling);
  const plannedPct = (planned / totalForBar) * 100;
  const activePct = (active / totalForBar) * 100;
  const enrollingPct = (enrolling / totalForBar) * 100;

  return (
    <div className="grid gap-3 lg:[grid-template-columns:160px_repeat(4,minmax(0,1fr))]">
      <div className="flex flex-col items-start gap-1">
        <h3 className="text-sm font-semibold text-foreground">
          {country.country_name} Details
        </h3>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:underline"
          >
            Show less
            <ChevronUp className="h-3 w-3" />
          </button>
        )}
      </div>

      <PanelCard title="Regulatory submissions">
        {firstSubmission ? (
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {submissionLabel}
                  </span>
                  {submissionStatusLabel && (
                    <span
                      className={cn(
                        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                        SUBMISSION_STATUS_PILL[firstSubmission.status] ??
                          SUBMISSION_STATUS_PILL.pending,
                      )}
                    >
                      {submissionStatusLabel}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  Submitted: {formatDateShort(firstSubmission.submission_date)}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="text-xs font-medium text-sky-600 hover:underline"
              onClick={onOpenSitesFilter}
            >
              View all ({submissions.length})
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No submissions yet.</p>
        )}
      </PanelCard>

      <PanelCard title="Key dates">
        <dl className="space-y-2">
          <KeyValueRow
            label="Submission date"
            value={formatDateShort(firstSubmission?.submission_date ?? null)}
          />
          <KeyValueRow
            label="Target approval"
            value={formatDateShort(earliestApproval ?? null)}
          />
        </dl>
      </PanelCard>

      <PanelCard title="Site summary">
        <div className="space-y-2">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
            {planned > 0 && (
              <div
                className="h-full bg-slate-300 dark:bg-slate-600"
                style={{ width: `${plannedPct}%` }}
                title={`${planned} planned`}
              />
            )}
            {active > 0 && (
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${activePct}%` }}
                title={`${active} active`}
              />
            )}
            {enrolling > 0 && (
              <div
                className="h-full bg-sky-500"
                style={{ width: `${enrollingPct}%` }}
                title={`${enrolling} enrolling`}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{planned}</span> Planned
            </span>
            <span>
              <span className="font-medium text-emerald-600">{active}</span> Active
            </span>
            <span>
              <span className="font-medium text-sky-600">{enrolling}</span> Enrolling
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenSitesFilter}
            className="text-xs font-medium text-sky-600 hover:underline"
          >
            View sites
          </button>
        </div>
      </PanelCard>

      <PanelCard title="Documents">
        <div className="space-y-2">
          <p className="text-xs">
            <span className="font-semibold text-foreground">0</span>{' '}
            <span className="text-muted-foreground">Documents</span>
          </p>
          <button
            type="button"
            className="text-xs font-medium text-sky-600 hover:underline"
          >
            View documents
          </button>
        </div>
      </PanelCard>
    </div>
  );
}
